"""
Flight data providers for OpenSky Network and ADS-B Exchange.

This module implements data fetching from multiple flight tracking APIs
and normalizes the data into a common format.
"""

import httpx
import asyncio
import base64
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional
from .models import Flight, Position
from .flight_enrichment import enrich_aircraft_type


class FlightDataProvider(ABC):
    """Abstract base class for flight data providers."""
    
    @abstractmethod
    async def fetch_flights(self, bounds: Optional[dict] = None) -> list[dict]:
        """Fetch flights, optionally within geographic bounds."""
        pass
    
    @abstractmethod
    def normalize(self, raw_data: dict) -> Optional[Flight]:
        """Convert provider-specific data to our Flight model."""
        pass


class OpenSkyProvider(FlightDataProvider):
    """
    OpenSky Network API provider with OAuth authentication.
    
    API Docs: https://openskynetwork.github.io/opensky-api/
    Uses OAuth client_credentials flow for authentication.
    """
    
    BASE_URL = "https://opensky-network.org/api"
    TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
    
    async def _get_access_token(self) -> Optional[str]:
        """Get OAuth access token using client credentials flow."""
        # Return cached token if still valid
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._access_token
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                token_data = response.json()
                
                self._access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 300)
                self._token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 30)
                
                print(f"[OpenSky] Got access token, expires in {expires_in}s")
                return self._access_token
        except Exception as e:
            print(f"[OpenSky] Error getting access token: {e}")
            return None
    
    async def fetch_flights(self, bounds: Optional[dict] = None) -> list[dict]:
        """
        Fetch all flight states from OpenSky.
        
        Args:
            bounds: Optional dict with lamin, lamax, lomin, lomax
            
        Returns:
            List of raw flight state vectors
        """
        # Get OAuth token
        token = await self._get_access_token()
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        url = f"{self.BASE_URL}/states/all"
        params = {"extended": 1}  # Request extended data including aircraft category
        
        if bounds:
            params.update({
                "lamin": bounds.get("lamin"),
                "lamax": bounds.get("lamax"),
                "lomin": bounds.get("lomin"),
                "lomax": bounds.get("lomax"),
            })
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("states", []) or []
        except Exception as e:
            print(f"[OpenSky] Error fetching data: {e}")
            return []
    
    def normalize(self, state: list) -> Optional[Flight]:
        """
        Convert OpenSky state vector to Flight model.
        
        OpenSky state vector indices:
        0: icao24 (hex)
        1: callsign
        2: origin_country
        3: time_position
        4: last_contact
        5: longitude
        6: latitude
        7: baro_altitude (meters)
        8: on_ground
        9: velocity (m/s)
        10: true_track (degrees)
        11: vertical_rate (m/s)
        12: sensors
        13: geo_altitude (meters)
        14: squawk
        15: spi
        16: position_source
        17: category (with extended=1)
        """
        try:
            icao24 = state[0]
            callsign = (state[1] or "").strip() or icao24.upper()
            origin_country = state[2] or "Unknown"
            longitude = state[5]
            latitude = state[6]
            altitude = state[7] or state[13] or 10000  # baro or geo altitude
            on_ground = state[8]
            velocity = state[9] or 0  # m/s
            heading = state[10] or 0
            vertical_rate = state[11] or 0  # m/s
            
            # Get aircraft category if available (index 17 with extended=1)
            category = state[17] if len(state) > 17 else None
            aircraft_type = enrich_aircraft_type(category, callsign)
            
            # Skip if no position data or on ground
            if longitude is None or latitude is None or on_ground:
                return None
            
            # Ensure altitude is non-negative (barometric can be slightly negative)
            if altitude is None or altitude < 0:
                altitude = 100  # Default to low altitude
            
            # Convert velocity from m/s to knots
            speed_knots = velocity * 1.94384
            
            # Convert vertical rate from m/s to ft/min
            vertical_speed_fpm = vertical_rate * 196.85
            
            return Flight(
                flight_id=f"OS_{icao24}",
                callsign=callsign,
                aircraft_type=aircraft_type,
                origin=origin_country,  # Use origin country as we don't have airport data
                destination="---",  # Not available from state vectors
                position=Position(
                    latitude=latitude,
                    longitude=longitude,
                    altitude=altitude
                ),
                heading=heading % 360,
                speed=speed_knots,
                vertical_speed=vertical_speed_fpm,
                status="en_route",
                updated_at=datetime.utcnow()
            )
        except (IndexError, TypeError, ValueError) as e:
            return None


class ADSBExchangeProvider(FlightDataProvider):
    """
    ADS-B Exchange API provider via RapidAPI.
    
    Get your free API key at: https://rapidapi.com/adsbx/api/adsbexchange-com1
    Provides unfiltered ADS-B data including military aircraft.
    
    Free tier limits: ~10 requests per minute, 500 per month
    """
    
    BASE_URL = "https://adsbexchange-com1.p.rapidapi.com"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._headers = {}
        if api_key:
            self._headers = {
                "x-rapidapi-key": api_key,
                "x-rapidapi-host": "adsbexchange-com1.p.rapidapi.com"
            }
    
    async def fetch_flights(self, bounds: Optional[dict] = None) -> list[dict]:
        """
        Fetch flights from ADS-B Exchange.
        
        Uses the /v2/lat/lon/dist endpoint for regional queries.
        """
        if not self.api_key:
            return []
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Default to US East Coast area
                if bounds:
                    lat = (bounds.get("lamin", 0) + bounds.get("lamax", 0)) / 2
                    lon = (bounds.get("lomin", 0) + bounds.get("lomax", 0)) / 2
                else:
                    lat, lon = 40.0, -74.0  # New York area
                
                # Use smaller radius to reduce data size
                url = f"{self.BASE_URL}/v2/lat/{lat}/lon/{lon}/dist/100/"
                
                response = await client.get(url, headers=self._headers)
                
                if response.status_code == 429:
                    print("[ADS-B Exchange] Rate limited - waiting...")
                    return []
                elif response.status_code == 403:
                    print("[ADS-B Exchange] 403 Forbidden - check API subscription")
                    return []
                
                response.raise_for_status()
                data = response.json()
                aircraft = data.get("ac", []) or []
                print(f"[ADS-B Exchange] Fetched {len(aircraft)} aircraft")
                return aircraft
        except Exception as e:
            print(f"[ADS-B Exchange] Error: {e}")
            return []
    
    def normalize(self, aircraft: dict) -> Optional[Flight]:
        """
        Convert ADS-B Exchange aircraft data to Flight model.
        
        Key fields:
        - hex: ICAO24 address
        - flight: Callsign
        - lat, lon: Position
        - alt_baro: Barometric altitude (feet)
        - gs: Ground speed (knots)
        - track: Track angle
        - baro_rate: Vertical rate (ft/min)
        - t: Aircraft type
        """
        try:
            icao24 = aircraft.get("hex", "")
            callsign = (aircraft.get("flight") or "").strip() or icao24.upper()
            latitude = aircraft.get("lat")
            longitude = aircraft.get("lon")
            altitude_ft = aircraft.get("alt_baro", 0)
            speed = aircraft.get("gs", 0)
            heading = aircraft.get("track", 0)
            vertical_rate = aircraft.get("baro_rate", 0)
            aircraft_type = aircraft.get("t", "Unknown")
            
            # Skip if no position
            if latitude is None or longitude is None:
                return None
            
            # Skip if on ground (altitude = "ground")
            if altitude_ft == "ground" or altitude_ft is None:
                return None
            
            # Convert altitude from feet to meters
            altitude_m = float(altitude_ft) * 0.3048
            
            return Flight(
                flight_id=f"AX_{icao24}",
                callsign=callsign,
                aircraft_type=aircraft_type or "Unknown",
                origin="---",
                destination="---",
                position=Position(
                    latitude=latitude,
                    longitude=longitude,
                    altitude=altitude_m
                ),
                heading=float(heading or 0) % 360,
                speed=float(speed or 0),
                vertical_speed=float(vertical_rate or 0),
                status="en_route",
                updated_at=datetime.utcnow()
            )
        except (KeyError, TypeError, ValueError) as e:
            return None
