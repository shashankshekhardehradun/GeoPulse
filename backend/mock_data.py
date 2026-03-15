"""
Mock flight data generator for development and testing.

This module generates realistic-looking flight data without needing
a real API. It simulates flights moving across the globe, which is
perfect for testing the frontend visualization.

In production, this would be replaced with calls to real flight APIs
like OpenSky Network, FlightAware, or ADS-B Exchange.
"""

import random
import math
from datetime import datetime
from typing import List
from .models import Flight, Position


# Major airports with their coordinates for realistic flight routes
AIRPORTS = {
    "JFK": {"name": "New York JFK", "lat": 40.6413, "lon": -73.7781},
    "LAX": {"name": "Los Angeles", "lat": 33.9425, "lon": -118.4081},
    "LHR": {"name": "London Heathrow", "lat": 51.4700, "lon": -0.4543},
    "CDG": {"name": "Paris CDG", "lat": 49.0097, "lon": 2.5479},
    "DXB": {"name": "Dubai", "lat": 25.2532, "lon": 55.3657},
    "HND": {"name": "Tokyo Haneda", "lat": 35.5494, "lon": 139.7798},
    "SIN": {"name": "Singapore", "lat": 1.3644, "lon": 103.9915},
    "SYD": {"name": "Sydney", "lat": -33.9399, "lon": 151.1753},
    "FRA": {"name": "Frankfurt", "lat": 50.0379, "lon": 8.5622},
    "ORD": {"name": "Chicago O'Hare", "lat": 41.9742, "lon": -87.9073},
    "SFO": {"name": "San Francisco", "lat": 37.6213, "lon": -122.3790},
    "DEL": {"name": "Delhi", "lat": 28.5562, "lon": 77.1000},
    "BOM": {"name": "Mumbai", "lat": 19.0896, "lon": 72.8656},
    "PEK": {"name": "Beijing", "lat": 40.0799, "lon": 116.6031},
    "ICN": {"name": "Seoul Incheon", "lat": 37.4602, "lon": 126.4407},
}

# Common aircraft types for realism
AIRCRAFT_TYPES = [
    "Boeing 737-800", "Boeing 777-300ER", "Boeing 787-9",
    "Airbus A320neo", "Airbus A350-900", "Airbus A380-800",
    "Boeing 747-8", "Airbus A330-300", "Embraer E190"
]

# Airline codes for generating callsigns
AIRLINES = ["UAL", "AAL", "DAL", "BAW", "AFR", "DLH", "UAE", "SIA", "QFA", "ANA"]


class MockFlightGenerator:
    """
    Generates and updates mock flight data.
    
    This class maintains a list of simulated flights and updates their
    positions over time to create the illusion of movement. Each flight
    follows a great circle route between its origin and destination.
    """
    
    def __init__(self, num_flights: int = 50):
        """
        Initialize the generator with a specified number of flights.
        
        Args:
            num_flights: How many flights to simulate (default 50)
        """
        self.flights: List[Flight] = []
        self._generate_initial_flights(num_flights)
    
    def _generate_initial_flights(self, count: int) -> None:
        """
        Create the initial set of flights with random routes.
        
        Each flight is placed at a random point along its route,
        simulating flights that are already in progress.
        """
        airport_codes = list(AIRPORTS.keys())
        
        for i in range(count):
            # Pick random origin and destination (must be different)
            origin = random.choice(airport_codes)
            destination = random.choice([a for a in airport_codes if a != origin])
            
            # Get airport coordinates
            origin_airport = AIRPORTS[origin]
            dest_airport = AIRPORTS[destination]
            
            # Place flight at random progress along route (10% to 90%)
            progress = random.uniform(0.1, 0.9)
            
            # Interpolate position between origin and destination
            lat = origin_airport["lat"] + (dest_airport["lat"] - origin_airport["lat"]) * progress
            lon = origin_airport["lon"] + (dest_airport["lon"] - origin_airport["lon"]) * progress
            
            # Calculate heading from current position to destination
            heading = self._calculate_heading(lat, lon, dest_airport["lat"], dest_airport["lon"])
            
            # Generate realistic flight parameters
            altitude = random.uniform(30000, 42000) * 0.3048  # Convert feet to meters
            speed = random.uniform(450, 550)  # Knots
            
            # Create flight object
            flight = Flight(
                flight_id=f"FL{i:04d}",
                callsign=f"{random.choice(AIRLINES)}{random.randint(100, 9999)}",
                aircraft_type=random.choice(AIRCRAFT_TYPES),
                origin=origin,
                destination=destination,
                position=Position(latitude=lat, longitude=lon, altitude=altitude),
                heading=heading,
                speed=speed,
                vertical_speed=random.uniform(-500, 500),
                status="en_route"
            )
            self.flights.append(flight)
    
    def _calculate_heading(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the initial bearing from point 1 to point 2.
        
        This uses the forward azimuth formula for great circle navigation.
        The result is the direction you need to travel from point 1 to reach point 2.
        
        Args:
            lat1, lon1: Starting point coordinates in degrees
            lat2, lon2: Ending point coordinates in degrees
            
        Returns:
            Heading in degrees (0-360, where 0=North, 90=East)
        """
        # Convert to radians for trigonometry
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        # Calculate bearing using spherical trigonometry
        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - \
            math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        
        bearing = math.atan2(x, y)
        
        # Convert to degrees and normalize to 0-360
        return (math.degrees(bearing) + 360) % 360
    
    def update_positions(self) -> None:
        """
        Update all flight positions based on their speed and heading.
        
        This simulates the passage of time by moving each aircraft
        forward along its heading. Called periodically to animate flights.
        """
        for flight in self.flights:
            # Calculate distance traveled in this update (assuming 1 second)
            # Speed is in knots (nautical miles per hour)
            # 1 knot = 1.852 km/h, so distance in km = speed * 1.852 / 3600
            distance_km = flight.speed * 1.852 / 3600
            
            # Convert to degrees (rough approximation: 1 degree ≈ 111 km)
            distance_deg = distance_km / 111
            
            # Calculate new position
            heading_rad = math.radians(flight.heading)
            new_lat = flight.position.latitude + distance_deg * math.cos(heading_rad)
            new_lon = flight.position.longitude + distance_deg * math.sin(heading_rad) / \
                      math.cos(math.radians(flight.position.latitude))
            
            # Wrap longitude to -180 to 180
            if new_lon > 180:
                new_lon -= 360
            elif new_lon < -180:
                new_lon += 360
            
            # Clamp latitude to valid range
            new_lat = max(-90, min(90, new_lat))
            
            # Update flight position
            flight.position.latitude = new_lat
            flight.position.longitude = new_lon
            flight.updated_at = datetime.utcnow()
            
            # Recalculate heading to destination
            dest = AIRPORTS[flight.destination]
            flight.heading = self._calculate_heading(
                new_lat, new_lon, dest["lat"], dest["lon"]
            )
            
            # Check if flight reached destination (within ~50km)
            dist_to_dest = math.sqrt(
                (new_lat - dest["lat"])**2 + (new_lon - dest["lon"])**2
            ) * 111
            
            if dist_to_dest < 50:
                # Reset flight with new route
                self._reset_flight(flight)
    
    def _reset_flight(self, flight: Flight) -> None:
        """
        Reset a flight that has reached its destination.
        
        Gives the flight a new origin (its old destination) and
        a new random destination, simulating a new flight.
        """
        airport_codes = list(AIRPORTS.keys())
        new_origin = flight.destination
        new_dest = random.choice([a for a in airport_codes if a != new_origin])
        
        origin_airport = AIRPORTS[new_origin]
        
        flight.origin = new_origin
        flight.destination = new_dest
        flight.position.latitude = origin_airport["lat"]
        flight.position.longitude = origin_airport["lon"]
        flight.heading = self._calculate_heading(
            origin_airport["lat"], origin_airport["lon"],
            AIRPORTS[new_dest]["lat"], AIRPORTS[new_dest]["lon"]
        )
    
    def get_flights(self) -> List[Flight]:
        """
        Get the current list of all flights.
        
        Returns:
            List of Flight objects with current positions
        """
        return self.flights
    
    def get_flight(self, flight_id: str) -> Flight | None:
        """
        Get a specific flight by its ID.
        
        Args:
            flight_id: The unique flight identifier
            
        Returns:
            The Flight object if found, None otherwise
        """
        for flight in self.flights:
            if flight.flight_id == flight_id:
                return flight
        return None


# Create a global instance for the application
flight_generator = MockFlightGenerator(num_flights=75)
