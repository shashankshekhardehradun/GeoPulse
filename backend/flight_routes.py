"""
Flight route enrichment service.

Attempts to determine origin/destination airports from flight callsigns
and provides aircraft type information where available.
"""

import httpx
import re
from typing import Optional, Tuple
from datetime import datetime, timedelta

# Major airports with coordinates
AIRPORTS = {
    "JFK": {"name": "New York JFK", "city": "New York", "country": "US", "lat": 40.6413, "lon": -73.7781},
    "LAX": {"name": "Los Angeles Intl", "city": "Los Angeles", "country": "US", "lat": 33.9425, "lon": -118.4081},
    "ORD": {"name": "Chicago O'Hare", "city": "Chicago", "country": "US", "lat": 41.9742, "lon": -87.9073},
    "DFW": {"name": "Dallas Fort Worth", "city": "Dallas", "country": "US", "lat": 32.8998, "lon": -97.0403},
    "DEN": {"name": "Denver Intl", "city": "Denver", "country": "US", "lat": 39.8561, "lon": -104.6737},
    "ATL": {"name": "Atlanta Hartsfield", "city": "Atlanta", "country": "US", "lat": 33.6407, "lon": -84.4277},
    "SFO": {"name": "San Francisco Intl", "city": "San Francisco", "country": "US", "lat": 37.6213, "lon": -122.3790},
    "SEA": {"name": "Seattle-Tacoma", "city": "Seattle", "country": "US", "lat": 47.4502, "lon": -122.3088},
    "MIA": {"name": "Miami Intl", "city": "Miami", "country": "US", "lat": 25.7959, "lon": -80.2870},
    "BOS": {"name": "Boston Logan", "city": "Boston", "country": "US", "lat": 42.3656, "lon": -71.0096},
    "LHR": {"name": "London Heathrow", "city": "London", "country": "UK", "lat": 51.4700, "lon": -0.4543},
    "LGW": {"name": "London Gatwick", "city": "London", "country": "UK", "lat": 51.1537, "lon": -0.1821},
    "CDG": {"name": "Paris Charles de Gaulle", "city": "Paris", "country": "FR", "lat": 49.0097, "lon": 2.5479},
    "FRA": {"name": "Frankfurt", "city": "Frankfurt", "country": "DE", "lat": 50.0379, "lon": 8.5622},
    "AMS": {"name": "Amsterdam Schiphol", "city": "Amsterdam", "country": "NL", "lat": 52.3105, "lon": 4.7683},
    "DXB": {"name": "Dubai Intl", "city": "Dubai", "country": "AE", "lat": 25.2532, "lon": 55.3657},
    "SIN": {"name": "Singapore Changi", "city": "Singapore", "country": "SG", "lat": 1.3644, "lon": 103.9915},
    "HKG": {"name": "Hong Kong Intl", "city": "Hong Kong", "country": "HK", "lat": 22.3080, "lon": 113.9185},
    "NRT": {"name": "Tokyo Narita", "city": "Tokyo", "country": "JP", "lat": 35.7720, "lon": 140.3929},
    "HND": {"name": "Tokyo Haneda", "city": "Tokyo", "country": "JP", "lat": 35.5494, "lon": 139.7798},
    "ICN": {"name": "Seoul Incheon", "city": "Seoul", "country": "KR", "lat": 37.4602, "lon": 126.4407},
    "PEK": {"name": "Beijing Capital", "city": "Beijing", "country": "CN", "lat": 40.0799, "lon": 116.6031},
    "PVG": {"name": "Shanghai Pudong", "city": "Shanghai", "country": "CN", "lat": 31.1443, "lon": 121.8083},
    "SYD": {"name": "Sydney", "city": "Sydney", "country": "AU", "lat": -33.9399, "lon": 151.1753},
    "MEL": {"name": "Melbourne", "city": "Melbourne", "country": "AU", "lat": -37.6690, "lon": 144.8410},
    "DEL": {"name": "Delhi Indira Gandhi", "city": "Delhi", "country": "IN", "lat": 28.5562, "lon": 77.1000},
    "BOM": {"name": "Mumbai", "city": "Mumbai", "country": "IN", "lat": 19.0896, "lon": 72.8656},
    "DOH": {"name": "Doha Hamad", "city": "Doha", "country": "QA", "lat": 25.2731, "lon": 51.6081},
    "IST": {"name": "Istanbul", "city": "Istanbul", "country": "TR", "lat": 41.2753, "lon": 28.7519},
    "MAD": {"name": "Madrid Barajas", "city": "Madrid", "country": "ES", "lat": 40.4983, "lon": -3.5676},
    "BCN": {"name": "Barcelona El Prat", "city": "Barcelona", "country": "ES", "lat": 41.2971, "lon": 2.0785},
    "FCO": {"name": "Rome Fiumicino", "city": "Rome", "country": "IT", "lat": 41.8003, "lon": 12.2389},
    "MUC": {"name": "Munich", "city": "Munich", "country": "DE", "lat": 48.3538, "lon": 11.7861},
    "ZRH": {"name": "Zurich", "city": "Zurich", "country": "CH", "lat": 47.4647, "lon": 8.5492},
    "YYZ": {"name": "Toronto Pearson", "city": "Toronto", "country": "CA", "lat": 43.6777, "lon": -79.6248},
    "YVR": {"name": "Vancouver", "city": "Vancouver", "country": "CA", "lat": 49.1967, "lon": -123.1815},
    "MEX": {"name": "Mexico City", "city": "Mexico City", "country": "MX", "lat": 19.4363, "lon": -99.0721},
    "GRU": {"name": "Sao Paulo Guarulhos", "city": "Sao Paulo", "country": "BR", "lat": -23.4356, "lon": -46.4731},
    "EZE": {"name": "Buenos Aires Ezeiza", "city": "Buenos Aires", "country": "AR", "lat": -34.8222, "lon": -58.5358},
    "JNB": {"name": "Johannesburg", "city": "Johannesburg", "country": "ZA", "lat": -26.1392, "lon": 28.2460},
    "DUB": {"name": "Dublin", "city": "Dublin", "country": "IE", "lat": 53.4264, "lon": -6.2499},
    "CPH": {"name": "Copenhagen", "city": "Copenhagen", "country": "DK", "lat": 55.6180, "lon": 12.6560},
    "OSL": {"name": "Oslo Gardermoen", "city": "Oslo", "country": "NO", "lat": 60.1939, "lon": 11.1004},
    "ARN": {"name": "Stockholm Arlanda", "city": "Stockholm", "country": "SE", "lat": 59.6519, "lon": 17.9186},
    "HEL": {"name": "Helsinki Vantaa", "city": "Helsinki", "country": "FI", "lat": 60.3172, "lon": 24.9633},
    "VIE": {"name": "Vienna", "city": "Vienna", "country": "AT", "lat": 48.1103, "lon": 16.5697},
    "BRU": {"name": "Brussels", "city": "Brussels", "country": "BE", "lat": 50.9014, "lon": 4.4844},
    "LIS": {"name": "Lisbon", "city": "Lisbon", "country": "PT", "lat": 38.7813, "lon": -9.1359},
    "ATH": {"name": "Athens", "city": "Athens", "country": "GR", "lat": 37.9364, "lon": 23.9445},
    "WAW": {"name": "Warsaw Chopin", "city": "Warsaw", "country": "PL", "lat": 52.1657, "lon": 20.9671},
    "PRG": {"name": "Prague", "city": "Prague", "country": "CZ", "lat": 50.1008, "lon": 14.2600},
    "BUD": {"name": "Budapest", "city": "Budapest", "country": "HU", "lat": 47.4369, "lon": 19.2556},
    "KUL": {"name": "Kuala Lumpur", "city": "Kuala Lumpur", "country": "MY", "lat": 2.7456, "lon": 101.7099},
    "BKK": {"name": "Bangkok Suvarnabhumi", "city": "Bangkok", "country": "TH", "lat": 13.6900, "lon": 100.7501},
    "CGK": {"name": "Jakarta Soekarno-Hatta", "city": "Jakarta", "country": "ID", "lat": -6.1256, "lon": 106.6559},
    "MNL": {"name": "Manila Ninoy Aquino", "city": "Manila", "country": "PH", "lat": 14.5086, "lon": 121.0194},
    "TPE": {"name": "Taipei Taoyuan", "city": "Taipei", "country": "TW", "lat": 25.0797, "lon": 121.2342},
    "AKL": {"name": "Auckland", "city": "Auckland", "country": "NZ", "lat": -37.0082, "lon": 174.7850},
    "CAI": {"name": "Cairo", "city": "Cairo", "country": "EG", "lat": 30.1219, "lon": 31.4056},
    "ADD": {"name": "Addis Ababa Bole", "city": "Addis Ababa", "country": "ET", "lat": 8.9779, "lon": 38.7993},
    "NBO": {"name": "Nairobi Jomo Kenyatta", "city": "Nairobi", "country": "KE", "lat": -1.3192, "lon": 36.9278},
    "LAS": {"name": "Las Vegas McCarran", "city": "Las Vegas", "country": "US", "lat": 36.0840, "lon": -115.1537},
    "PHX": {"name": "Phoenix Sky Harbor", "city": "Phoenix", "country": "US", "lat": 33.4373, "lon": -112.0078},
    "IAH": {"name": "Houston George Bush", "city": "Houston", "country": "US", "lat": 29.9902, "lon": -95.3368},
    "MSP": {"name": "Minneapolis-St Paul", "city": "Minneapolis", "country": "US", "lat": 44.8848, "lon": -93.2223},
    "DTW": {"name": "Detroit Metro", "city": "Detroit", "country": "US", "lat": 42.2162, "lon": -83.3554},
    "PHL": {"name": "Philadelphia", "city": "Philadelphia", "country": "US", "lat": 39.8729, "lon": -75.2437},
    "CLT": {"name": "Charlotte Douglas", "city": "Charlotte", "country": "US", "lat": 35.2140, "lon": -80.9431},
    "EWR": {"name": "Newark Liberty", "city": "Newark", "country": "US", "lat": 40.6895, "lon": -74.1745},
    "MCO": {"name": "Orlando", "city": "Orlando", "country": "US", "lat": 28.4312, "lon": -81.3081},
    "SAN": {"name": "San Diego", "city": "San Diego", "country": "US", "lat": 32.7336, "lon": -117.1897},
    "TPA": {"name": "Tampa", "city": "Tampa", "country": "US", "lat": 27.9755, "lon": -82.5332},
    "PDX": {"name": "Portland", "city": "Portland", "country": "US", "lat": 45.5898, "lon": -122.5951},
    "BWI": {"name": "Baltimore-Washington", "city": "Baltimore", "country": "US", "lat": 39.1774, "lon": -76.6684},
    "DCA": {"name": "Washington Reagan", "city": "Washington", "country": "US", "lat": 38.8521, "lon": -77.0377},
    "IAD": {"name": "Washington Dulles", "city": "Washington", "country": "US", "lat": 38.9531, "lon": -77.4565},
}

# Airline ICAO codes to names and hub airports
AIRLINES = {
    "AAL": {"name": "American Airlines", "hubs": ["DFW", "CLT", "MIA", "PHX", "PHL"]},
    "UAL": {"name": "United Airlines", "hubs": ["ORD", "DEN", "IAH", "EWR", "SFO"]},
    "DAL": {"name": "Delta Air Lines", "hubs": ["ATL", "DTW", "MSP", "JFK", "LAX", "SEA"]},
    "SWA": {"name": "Southwest Airlines", "hubs": ["DAL", "DEN", "LAS", "PHX", "BWI"]},
    "JBU": {"name": "JetBlue Airways", "hubs": ["JFK", "BOS", "FLL"]},
    "ASA": {"name": "Alaska Airlines", "hubs": ["SEA", "PDX", "LAX", "SFO"]},
    "FFT": {"name": "Frontier Airlines", "hubs": ["DEN"]},
    "NKS": {"name": "Spirit Airlines", "hubs": ["FLL", "LAS", "DFW"]},
    "BAW": {"name": "British Airways", "hubs": ["LHR", "LGW"]},
    "DLH": {"name": "Lufthansa", "hubs": ["FRA", "MUC"]},
    "AFR": {"name": "Air France", "hubs": ["CDG"]},
    "KLM": {"name": "KLM Royal Dutch", "hubs": ["AMS"]},
    "UAE": {"name": "Emirates", "hubs": ["DXB"]},
    "QTR": {"name": "Qatar Airways", "hubs": ["DOH"]},
    "ETD": {"name": "Etihad Airways", "hubs": ["AUH"]},
    "SIA": {"name": "Singapore Airlines", "hubs": ["SIN"]},
    "CPA": {"name": "Cathay Pacific", "hubs": ["HKG"]},
    "ANA": {"name": "All Nippon Airways", "hubs": ["NRT", "HND"]},
    "JAL": {"name": "Japan Airlines", "hubs": ["NRT", "HND"]},
    "KAL": {"name": "Korean Air", "hubs": ["ICN"]},
    "CCA": {"name": "Air China", "hubs": ["PEK"]},
    "CES": {"name": "China Eastern", "hubs": ["PVG"]},
    "CSN": {"name": "China Southern", "hubs": ["CAN"]},
    "QFA": {"name": "Qantas", "hubs": ["SYD", "MEL"]},
    "ACA": {"name": "Air Canada", "hubs": ["YYZ", "YVR", "YUL"]},
    "THY": {"name": "Turkish Airlines", "hubs": ["IST"]},
    "IBE": {"name": "Iberia", "hubs": ["MAD"]},
    "TAP": {"name": "TAP Air Portugal", "hubs": ["LIS"]},
    "SAS": {"name": "Scandinavian Airlines", "hubs": ["CPH", "ARN", "OSL"]},
    "FIN": {"name": "Finnair", "hubs": ["HEL"]},
    "AUA": {"name": "Austrian Airlines", "hubs": ["VIE"]},
    "SWR": {"name": "Swiss International", "hubs": ["ZRH"]},
    "BEL": {"name": "Brussels Airlines", "hubs": ["BRU"]},
    "EIN": {"name": "Aer Lingus", "hubs": ["DUB"]},
    "RYR": {"name": "Ryanair", "hubs": ["DUB", "STN"]},
    "EZY": {"name": "easyJet", "hubs": ["LGW", "LTN"]},
    "VIR": {"name": "Virgin Atlantic", "hubs": ["LHR", "MAN"]},
    "ETH": {"name": "Ethiopian Airlines", "hubs": ["ADD"]},
    "SAA": {"name": "South African Airways", "hubs": ["JNB"]},
    "RAM": {"name": "Royal Air Maroc", "hubs": ["CMN"]},
    "MSR": {"name": "EgyptAir", "hubs": ["CAI"]},
    "GIA": {"name": "Garuda Indonesia", "hubs": ["CGK"]},
    "MAS": {"name": "Malaysia Airlines", "hubs": ["KUL"]},
    "THA": {"name": "Thai Airways", "hubs": ["BKK"]},
    "PAL": {"name": "Philippine Airlines", "hubs": ["MNL"]},
    "EVA": {"name": "EVA Air", "hubs": ["TPE"]},
    "CAL": {"name": "China Airlines", "hubs": ["TPE"]},
    "ANZ": {"name": "Air New Zealand", "hubs": ["AKL"]},
    "AIC": {"name": "Air India", "hubs": ["DEL", "BOM"]},
    "AMX": {"name": "Aeromexico", "hubs": ["MEX"]},
    "AVA": {"name": "Avianca", "hubs": ["BOG"]},
    "LAN": {"name": "LATAM Airlines", "hubs": ["SCL", "GRU"]},
    "ARG": {"name": "Aerolineas Argentinas", "hubs": ["EZE"]},
    "FDX": {"name": "FedEx Express", "hubs": ["MEM", "IND"]},
    "UPS": {"name": "UPS Airlines", "hubs": ["SDF", "ONT"]},
}

# Aircraft type codes
AIRCRAFT_TYPES = {
    "A319": "Airbus A319",
    "A320": "Airbus A320",
    "A321": "Airbus A321",
    "A332": "Airbus A330-200",
    "A333": "Airbus A330-300",
    "A339": "Airbus A330-900neo",
    "A343": "Airbus A340-300",
    "A346": "Airbus A340-600",
    "A359": "Airbus A350-900",
    "A35K": "Airbus A350-1000",
    "A388": "Airbus A380-800",
    "A20N": "Airbus A320neo",
    "A21N": "Airbus A321neo",
    "B737": "Boeing 737",
    "B738": "Boeing 737-800",
    "B739": "Boeing 737-900",
    "B38M": "Boeing 737 MAX 8",
    "B39M": "Boeing 737 MAX 9",
    "B744": "Boeing 747-400",
    "B748": "Boeing 747-8",
    "B752": "Boeing 757-200",
    "B753": "Boeing 757-300",
    "B763": "Boeing 767-300",
    "B764": "Boeing 767-400",
    "B772": "Boeing 777-200",
    "B77L": "Boeing 777-200LR",
    "B773": "Boeing 777-300",
    "B77W": "Boeing 777-300ER",
    "B778": "Boeing 777-8",
    "B779": "Boeing 777-9",
    "B788": "Boeing 787-8",
    "B789": "Boeing 787-9",
    "B78X": "Boeing 787-10",
    "E170": "Embraer E170",
    "E175": "Embraer E175",
    "E190": "Embraer E190",
    "E195": "Embraer E195",
    "E290": "Embraer E190-E2",
    "E295": "Embraer E195-E2",
    "CRJ2": "Bombardier CRJ-200",
    "CRJ7": "Bombardier CRJ-700",
    "CRJ9": "Bombardier CRJ-900",
    "CRJX": "Bombardier CRJ-1000",
    "DH8D": "Bombardier Dash 8 Q400",
    "AT72": "ATR 72",
    "AT76": "ATR 72-600",
    "C208": "Cessna 208 Caravan",
    "PC12": "Pilatus PC-12",
    "C172": "Cessna 172",
    "C182": "Cessna 182",
    "PA28": "Piper PA-28",
    "SR22": "Cirrus SR22",
    "BE20": "Beechcraft King Air 200",
    "BE35": "Beechcraft Bonanza",
    "GLF5": "Gulfstream G550",
    "GL5T": "Gulfstream G500",
    "GLEX": "Bombardier Global Express",
    "CL35": "Bombardier Challenger 350",
    "C56X": "Cessna Citation Excel",
    "C68A": "Cessna Citation Latitude",
    "E55P": "Embraer Phenom 300",
    "H25B": "Hawker 800",
}


class FlightRouteService:
    """Service to enrich flight data with route and aircraft information."""
    
    def __init__(self):
        self._route_cache = {}
        self._cache_ttl = timedelta(hours=1)
    
    def parse_callsign(self, callsign: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Parse callsign to extract airline code and flight number.
        
        Returns: (airline_icao, airline_name, flight_number)
        """
        if not callsign:
            return None, None, None
        
        callsign = callsign.strip().upper()
        
        # Try to match airline ICAO code (3 letters) + flight number
        match = re.match(r'^([A-Z]{3})(\d+[A-Z]?)$', callsign)
        if match:
            airline_code = match.group(1)
            flight_num = match.group(2)
            airline_info = AIRLINES.get(airline_code)
            if airline_info:
                return airline_code, airline_info["name"], flight_num
        
        # Try 2-letter IATA code + flight number (less common in ADS-B)
        match = re.match(r'^([A-Z]{2})(\d+[A-Z]?)$', callsign)
        if match:
            return match.group(1), None, match.group(2)
        
        return None, None, None
    
    def estimate_route(self, callsign: str, current_lat: float, current_lon: float) -> Tuple[Optional[str], Optional[str]]:
        """
        Estimate origin and destination based on callsign and position.
        
        This is a heuristic approach - for accurate data, a paid API would be needed.
        Returns: (origin_iata, destination_iata)
        """
        airline_code, _, _ = self.parse_callsign(callsign)
        
        if not airline_code:
            return None, None
        
        airline_info = AIRLINES.get(airline_code)
        if not airline_info:
            return None, None
        
        hubs = airline_info.get("hubs", [])
        if not hubs:
            return None, None
        
        # Find nearest hub as likely origin or destination
        nearest_hub = None
        nearest_dist = float('inf')
        
        for hub_code in hubs:
            hub = AIRPORTS.get(hub_code)
            if hub:
                dist = ((current_lat - hub["lat"])**2 + (current_lon - hub["lon"])**2)**0.5
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_hub = hub_code
        
        # Find a distant major airport as the other endpoint
        farthest_airport = None
        farthest_dist = 0
        
        for code, airport in AIRPORTS.items():
            if code != nearest_hub:
                dist = ((current_lat - airport["lat"])**2 + (current_lon - airport["lon"])**2)**0.5
                if dist > farthest_dist and dist > 10:  # At least 10 degrees away
                    farthest_dist = dist
                    farthest_airport = code
        
        # Determine direction of travel to guess origin vs destination
        # This is very approximate without heading/track info
        if nearest_hub and farthest_airport:
            return nearest_hub, farthest_airport
        
        return None, None
    
    def get_aircraft_type(self, type_code: str) -> str:
        """Get human-readable aircraft type from code."""
        if not type_code:
            return "Unknown"
        return AIRCRAFT_TYPES.get(type_code.upper(), type_code)
    
    def get_airport_info(self, iata_code: str) -> Optional[dict]:
        """Get airport information by IATA code."""
        return AIRPORTS.get(iata_code.upper())
    
    def enrich_flight(self, flight_data: dict) -> dict:
        """
        Enrich flight data with route and aircraft information.
        
        Args:
            flight_data: Dict with callsign, position, etc.
            
        Returns:
            Enriched dict with airline_name, origin, destination, aircraft_type
        """
        callsign = flight_data.get("callsign", "")
        lat = flight_data.get("latitude", 0)
        lon = flight_data.get("longitude", 0)
        
        airline_code, airline_name, flight_num = self.parse_callsign(callsign)
        origin, destination = self.estimate_route(callsign, lat, lon)
        
        return {
            **flight_data,
            "airline_code": airline_code,
            "airline_name": airline_name or "Unknown Airline",
            "flight_number": flight_num,
            "origin": origin,
            "destination": destination,
            "origin_info": self.get_airport_info(origin) if origin else None,
            "destination_info": self.get_airport_info(destination) if destination else None,
        }


# Global instance
route_service = FlightRouteService()
