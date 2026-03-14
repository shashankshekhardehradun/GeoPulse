"""
Flight enrichment service.

Provides aircraft category names and airline information from callsigns.
"""

# Aircraft category descriptions from ADS-B
AIRCRAFT_CATEGORIES = {
    0: None,  # No information
    1: None,  # No ADS-B Emitter Category Information
    2: "Light Aircraft",
    3: "Small Aircraft",
    4: "Large Aircraft",
    5: "High Vortex Large",
    6: "Heavy Aircraft",
    7: "High Performance",
    8: "Rotorcraft",
    9: "Glider",
    10: "Lighter-than-air",
    11: "Parachutist",
    12: "Ultralight",
    13: "Reserved",
    14: "UAV/Drone",
    15: "Space Vehicle",
    16: "Emergency Vehicle",
    17: "Service Vehicle",
    18: "Obstacle",
    19: "Cluster Obstacle",
    20: "Line Obstacle",
}

# Major airlines with their ICAO codes
AIRLINES = {
    # US Airlines
    "AAL": "American Airlines",
    "UAL": "United Airlines",
    "DAL": "Delta Air Lines",
    "SWA": "Southwest Airlines",
    "JBU": "JetBlue Airways",
    "ASA": "Alaska Airlines",
    "FFT": "Frontier Airlines",
    "NKS": "Spirit Airlines",
    "SKW": "SkyWest Airlines",
    "RPA": "Republic Airways",
    "ENY": "Envoy Air",
    "ASH": "Mesa Airlines",
    "JIA": "PSA Airlines",
    "PDT": "Piedmont Airlines",
    "EJA": "NetJets",
    "FDX": "FedEx Express",
    "UPS": "UPS Airlines",
    "GTI": "Atlas Air",
    
    # European Airlines
    "BAW": "British Airways",
    "DLH": "Lufthansa",
    "AFR": "Air France",
    "KLM": "KLM Royal Dutch",
    "IBE": "Iberia",
    "SAS": "Scandinavian Airlines",
    "AUA": "Austrian Airlines",
    "SWR": "Swiss International",
    "TAP": "TAP Air Portugal",
    "AZA": "ITA Airways",
    "FIN": "Finnair",
    "EIN": "Aer Lingus",
    "VLG": "Vueling",
    "EZY": "easyJet",
    "RYR": "Ryanair",
    "WZZ": "Wizz Air",
    "EWG": "Eurowings",
    "BEL": "Brussels Airlines",
    "LOT": "LOT Polish",
    "CSA": "Czech Airlines",
    
    # Middle East Airlines
    "UAE": "Emirates",
    "ETD": "Etihad Airways",
    "QTR": "Qatar Airways",
    "SVA": "Saudia",
    "GFA": "Gulf Air",
    "KAC": "Kuwait Airways",
    "MEA": "Middle East Airlines",
    "THY": "Turkish Airlines",
    "ELY": "El Al Israel",
    "RJA": "Royal Jordanian",
    
    # Asian Airlines
    "CPA": "Cathay Pacific",
    "SIA": "Singapore Airlines",
    "JAL": "Japan Airlines",
    "ANA": "All Nippon Airways",
    "KAL": "Korean Air",
    "AAR": "Asiana Airlines",
    "EVA": "EVA Air",
    "CAL": "China Airlines",
    "CCA": "Air China",
    "CES": "China Eastern",
    "CSN": "China Southern",
    "HDA": "Hong Kong Airlines",
    "THA": "Thai Airways",
    "MAS": "Malaysia Airlines",
    "GIA": "Garuda Indonesia",
    "VNA": "Vietnam Airlines",
    "PAL": "Philippine Airlines",
    "AIQ": "Thai AirAsia",
    "AXB": "Air India Express",
    "AIC": "Air India",
    "IGO": "IndiGo",
    "SEJ": "SpiceJet",
    
    # Australian/NZ Airlines
    "QFA": "Qantas",
    "VOZ": "Virgin Australia",
    "JST": "Jetstar Airways",
    "ANZ": "Air New Zealand",
    
    # Canadian Airlines
    "ACA": "Air Canada",
    "WJA": "WestJet",
    "POE": "Porter Airlines",
    
    # Latin American Airlines
    "LAN": "LATAM Chile",
    "TAM": "LATAM Brazil",
    "AVA": "Avianca",
    "CMP": "Copa Airlines",
    "ARG": "Aerolineas Argentinas",
    "AMX": "Aeromexico",
    "VIV": "Viva Aerobus",
    "VOI": "Volaris",
    "GLO": "Gol Linhas Aereas",
    "AZU": "Azul Brazilian",
    
    # Cargo Airlines
    "CLX": "Cargolux",
    "ABW": "AirBridgeCargo",
    "KZR": "Air Astana",
    
    # Other
    "IFL": "International Flight",
    "WGN": "Western Global",
    "ABX": "ABX Air",
}


def get_aircraft_category_name(category: int) -> str | None:
    """Get human-readable aircraft category name, or None if unknown."""
    if category is None:
        return None
    return AIRCRAFT_CATEGORIES.get(category)


def get_airline_from_callsign(callsign: str) -> str | None:
    """
    Extract airline name from callsign.
    
    Callsigns typically start with a 3-letter ICAO airline code.
    Example: UAL1234 -> United Airlines
    """
    if not callsign or len(callsign) < 3:
        return None
    
    # Extract first 3 characters as airline code
    airline_code = callsign[:3].upper()
    return AIRLINES.get(airline_code)


def enrich_aircraft_type(category: int | None, callsign: str) -> str:
    """
    Get the best available aircraft type description.
    
    Priority:
    1. ADS-B category if meaningful (not 0 or 1)
    2. Airline name from callsign
    3. "Commercial" as fallback
    """
    # Try ADS-B category first
    if category and category > 1:
        cat_name = get_aircraft_category_name(category)
        if cat_name:
            return cat_name
    
    # Try airline name from callsign
    airline = get_airline_from_callsign(callsign)
    if airline:
        return airline
    
    return "Commercial"
