"""
Earthquake data models.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EarthquakePosition(BaseModel):
    latitude: float
    longitude: float
    depth: float  # km below surface


class Earthquake(BaseModel):
    earthquake_id: str
    magnitude: float
    magnitude_type: str  # ml, md, mb, mw, etc.
    place: str  # Human-readable location description
    position: EarthquakePosition
    time: datetime
    updated: datetime
    tsunami: bool  # Whether tsunami warning was issued
    significance: int  # 0-1000, combines magnitude, felt reports, damage
    status: str  # automatic, reviewed, deleted
    felt: Optional[int] = None  # Number of felt reports
    alert: Optional[str] = None  # green, yellow, orange, red
    url: str  # USGS event page URL


class EarthquakeList(BaseModel):
    earthquakes: list[Earthquake]
    count: int
    timestamp: datetime
    bbox: Optional[list[float]] = None  # [minLon, minLat, minDepth, maxLon, maxLat, maxDepth]
