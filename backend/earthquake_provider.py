"""
USGS Earthquake API provider.

Fetches real-time earthquake data from the USGS GeoJSON feeds.
Documentation: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
"""

import httpx
from datetime import datetime, timedelta
from typing import Optional
from .earthquake_models import Earthquake, EarthquakePosition, EarthquakeList


class USGSEarthquakeProvider:
    """
    Provider for USGS Earthquake data.
    
    Available feeds:
    - all_hour: All earthquakes in the past hour
    - all_day: All earthquakes in the past day
    - all_week: All earthquakes in the past week
    - all_month: All earthquakes in the past month
    - significant_*: Only significant earthquakes
    - 4.5_*: Magnitude 4.5+ earthquakes
    - 2.5_*: Magnitude 2.5+ earthquakes
    - 1.0_*: Magnitude 1.0+ earthquakes
    """
    
    BASE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary"
    
    FEEDS = {
        "all_hour": "all_hour.geojson",
        "all_day": "all_day.geojson",
        "all_week": "all_week.geojson",
        "all_month": "all_month.geojson",
        "significant_day": "significant_day.geojson",
        "significant_week": "significant_week.geojson",
        "significant_month": "significant_month.geojson",
        "4.5_day": "4.5_day.geojson",
        "4.5_week": "4.5_week.geojson",
        "2.5_day": "2.5_day.geojson",
        "2.5_week": "2.5_week.geojson",
        "1.0_day": "1.0_day.geojson",
        "1.0_week": "1.0_week.geojson",
    }
    
    def __init__(self):
        self._cache: Optional[EarthquakeList] = None
        self._cache_time: Optional[datetime] = None
        self._cache_ttl = timedelta(minutes=1)  # USGS updates every minute
    
    async def fetch_earthquakes(self, feed: str = "all_day") -> EarthquakeList:
        """
        Fetch earthquakes from USGS.
        
        Args:
            feed: Feed name (default: all_day)
            
        Returns:
            EarthquakeList with all earthquakes from the feed
        """
        # Check cache
        if (self._cache and self._cache_time and 
            datetime.utcnow() - self._cache_time < self._cache_ttl):
            return self._cache
        
        feed_file = self.FEEDS.get(feed, "all_day.geojson")
        url = f"{self.BASE_URL}/{feed_file}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                
                earthquakes = []
                for feature in data.get("features", []):
                    eq = self._parse_feature(feature)
                    if eq:
                        earthquakes.append(eq)
                
                result = EarthquakeList(
                    earthquakes=earthquakes,
                    count=len(earthquakes),
                    timestamp=datetime.utcnow(),
                    bbox=data.get("bbox")
                )
                
                # Update cache
                self._cache = result
                self._cache_time = datetime.utcnow()
                
                print(f"[USGS] Fetched {len(earthquakes)} earthquakes from {feed}")
                return result
                
        except Exception as e:
            print(f"[USGS] Error fetching earthquakes: {e}")
            if self._cache:
                return self._cache
            return EarthquakeList(
                earthquakes=[],
                count=0,
                timestamp=datetime.utcnow()
            )
    
    def _parse_feature(self, feature: dict) -> Optional[Earthquake]:
        """Parse a GeoJSON feature into an Earthquake model."""
        try:
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            coords = geom.get("coordinates", [0, 0, 0])
            
            # USGS uses milliseconds since epoch
            time_ms = props.get("time", 0)
            updated_ms = props.get("updated", time_ms)
            
            return Earthquake(
                earthquake_id=feature.get("id", "unknown"),
                magnitude=props.get("mag") or 0.0,
                magnitude_type=props.get("magType") or "unknown",
                place=props.get("place") or "Unknown location",
                position=EarthquakePosition(
                    longitude=coords[0],
                    latitude=coords[1],
                    depth=coords[2] if len(coords) > 2 else 0
                ),
                time=datetime.utcfromtimestamp(time_ms / 1000),
                updated=datetime.utcfromtimestamp(updated_ms / 1000),
                tsunami=bool(props.get("tsunami", 0)),
                significance=props.get("sig", 0),
                status=props.get("status", "automatic"),
                felt=props.get("felt"),
                alert=props.get("alert"),
                url=props.get("url", "")
            )
        except Exception as e:
            print(f"[USGS] Error parsing earthquake: {e}")
            return None
    
    def clear_cache(self):
        """Clear the earthquake cache."""
        self._cache = None
        self._cache_time = None


# Singleton instance
earthquake_provider = USGSEarthquakeProvider()
