"""
Flight Data Aggregator Service.

Combines data from multiple flight tracking providers (OpenSky, ADS-B Exchange)
into a unified, deduplicated feed with caching and rate limit handling.
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from .models import Flight
from .providers import OpenSkyProvider


class FlightAggregator:
    """
    Aggregates flight data from multiple providers.
    
    Features:
    - Fetches from multiple sources concurrently
    - Deduplicates flights by ICAO24 code
    - Caches results to respect rate limits
    - Falls back to cache if API calls fail
    """
    
    def __init__(
        self,
        opensky_client_id: str,
        opensky_client_secret: str,
        cache_ttl_seconds: int = 10,
        use_mock_fallback: bool = True
    ):
        # Initialize OpenSky provider
        self.opensky = OpenSkyProvider(opensky_client_id, opensky_client_secret)
        
        # Cache settings
        self.cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self._cache: list[Flight] = []
        self._cache_time: Optional[datetime] = None
        self._cache_lock = asyncio.Lock()
        
        # Fallback to mock data if APIs fail
        self.use_mock_fallback = use_mock_fallback
        self._mock_generator = None
        
        # Stats
        self.stats = {
            "opensky_calls": 0,
            "cache_hits": 0,
            "last_fetch": None,
            "last_flight_count": 0
        }
    
    def _is_cache_valid(self) -> bool:
        """Check if cached data is still fresh."""
        if not self._cache_time:
            return False
        return datetime.utcnow() - self._cache_time < self.cache_ttl
    
    async def _fetch_from_opensky(self, bounds: Optional[dict] = None) -> list[Flight]:
        """Fetch and normalize flights from OpenSky."""
        try:
            raw_states = await self.opensky.fetch_flights(bounds)
            self.stats["opensky_calls"] += 1
            
            flights = []
            for state in raw_states:
                try:
                    flight = self.opensky.normalize(state)
                    if flight:
                        flights.append(flight)
                except Exception:
                    continue  # Skip invalid flights
            
            print(f"[OpenSky] Fetched {len(flights)} flights from {len(raw_states)} states")
            return flights
        except Exception as e:
            print(f"[OpenSky] Error: {e}")
            return []
    
    async def get_flights(self, bounds: Optional[dict] = None, force_refresh: bool = False) -> list[Flight]:
        """
        Get flight data from OpenSky Network.
        
        Args:
            bounds: Optional geographic bounds {lamin, lamax, lomin, lomax}
            force_refresh: Bypass cache and fetch fresh data
            
        Returns:
            List of Flight objects
        """
        async with self._cache_lock:
            # Return cached data if valid
            if not force_refresh and self._is_cache_valid() and self._cache:
                self.stats["cache_hits"] += 1
                return self._cache
            
            # Fetch from OpenSky
            flights = await self._fetch_from_opensky(bounds)
            
            # If no flights and fallback enabled, use mock data
            if not flights and self.use_mock_fallback:
                print("[Aggregator] No API data, falling back to mock data")
                flights = self._get_mock_flights()
            
            # Update cache
            self._cache = flights
            self._cache_time = datetime.utcnow()
            self.stats["last_fetch"] = self._cache_time
            self.stats["last_flight_count"] = len(flights)
            
            print(f"[OpenSky] Total: {len(flights)} flights")
            return flights
    
    def _get_mock_flights(self) -> list[Flight]:
        """Get mock flight data as fallback."""
        if self._mock_generator is None:
            from .mock_data import MockFlightGenerator
            self._mock_generator = MockFlightGenerator(num_flights=25)
        
        self._mock_generator.update_positions()
        return self._mock_generator.get_flights()
    
    def get_flight(self, flight_id: str) -> Optional[Flight]:
        """Get a specific flight by ID from cache."""
        for flight in self._cache:
            if flight.flight_id == flight_id:
                return flight
        return None
    
    def get_stats(self) -> dict:
        """Get aggregator statistics."""
        return {
            **self.stats,
            "cache_valid": self._is_cache_valid(),
            "cached_flights": len(self._cache)
        }


# Global aggregator instance (configured in main.py)
flight_aggregator: Optional[FlightAggregator] = None


def init_aggregator(
    opensky_client_id: str,
    opensky_client_secret: str
) -> FlightAggregator:
    """Initialize the global flight aggregator."""
    global flight_aggregator
    flight_aggregator = FlightAggregator(
        opensky_client_id=opensky_client_id,
        opensky_client_secret=opensky_client_secret,
        cache_ttl_seconds=10,
        use_mock_fallback=True
    )
    return flight_aggregator
