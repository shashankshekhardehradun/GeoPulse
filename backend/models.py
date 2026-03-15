"""
Data models for GeoPulse flight tracking.

This module defines Pydantic models that represent the structure of our data.
Pydantic is a data validation library that uses Python type hints to validate
and serialize data. It's commonly used with FastAPI for automatic request/response
validation and OpenAPI documentation generation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Position(BaseModel):
    """
    Represents a geographic position with altitude.
    
    Attributes:
        latitude: Degrees from -90 (South Pole) to +90 (North Pole)
        longitude: Degrees from -180 to +180 (negative = West, positive = East)
        altitude: Height above sea level in meters
    """
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")
    altitude: float = Field(..., ge=0, description="Altitude in meters")


class Flight(BaseModel):
    """
    Represents a single flight with its current state.
    
    This model contains all the information needed to display a flight
    on the map, including its position, identity, and flight details.
    """
    flight_id: str = Field(..., description="Unique identifier for the flight")
    callsign: str = Field(..., description="Flight callsign (e.g., 'UAL123')")
    aircraft_type: str = Field(..., description="Aircraft model (e.g., 'Boeing 737-800')")
    origin: str = Field(..., description="Origin airport IATA code (e.g., 'JFK')")
    destination: str = Field(..., description="Destination airport IATA code")
    position: Position = Field(..., description="Current position of the aircraft")
    heading: float = Field(..., ge=0, lt=360, description="Heading in degrees (0=North, 90=East)")
    speed: float = Field(..., ge=0, description="Ground speed in knots")
    vertical_speed: float = Field(default=0, description="Vertical speed in feet/minute")
    status: str = Field(default="en_route", description="Flight status")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


class FlightList(BaseModel):
    """
    Response model for listing multiple flights.
    
    Wrapping the list in a model allows us to add metadata like
    total count, pagination info, or timestamps in the future.
    """
    flights: list[Flight]
    count: int = Field(..., description="Total number of flights")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
