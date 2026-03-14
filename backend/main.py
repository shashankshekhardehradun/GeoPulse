"""
GeoPulse Backend API Server

Flight tracking API that aggregates data from OpenSky Network and ADS-B Exchange.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from datetime import datetime
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
print(f"[GeoPulse] Loading .env from: {env_path} (exists: {env_path.exists()})")

from .models import Flight, FlightList
from .aggregator import init_aggregator, flight_aggregator

# API Credentials (from environment variables - no defaults for secrets)
OPENSKY_CLIENT_ID = os.getenv("OPENSKY_CLIENT_ID", "")
OPENSKY_CLIENT_SECRET = os.getenv("OPENSKY_CLIENT_SECRET", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup/shutdown events.
    
    Initializes the flight aggregator and starts a background task
    to periodically refresh flight data from APIs.
    """
    # Initialize the aggregator with API credentials
    aggregator = init_aggregator(
        opensky_client_id=OPENSKY_CLIENT_ID,
        opensky_client_secret=OPENSKY_CLIENT_SECRET
    )
    
    print(f"[GeoPulse] Starting with OpenSky Network")
    
    # Background task to refresh flight data
    async def refresh_loop():
        """Periodically fetch fresh flight data."""
        while True:
            try:
                await aggregator.get_flights(force_refresh=True)
            except Exception as e:
                print(f"[GeoPulse] Error refreshing flights: {e}")
            await asyncio.sleep(15)  # Refresh every 15 seconds
    
    # Start the background task
    task = asyncio.create_task(refresh_loop())
    
    yield  # Server is running
    
    # Shutdown: Cancel the background task
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# Create the FastAPI application
app = FastAPI(
    title="GeoPulse API",
    description="Real-time flight tracking with OpenSky Network and ADS-B Exchange",
    version="0.2.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/api/flights", response_model=FlightList, tags=["Flights"])
async def get_all_flights():
    """
    Get all currently tracked flights.
    
    Returns aggregated flight data from OpenSky Network and ADS-B Exchange,
    deduplicated and normalized into a common format.
    """
    from .aggregator import flight_aggregator
    
    if flight_aggregator is None:
        raise HTTPException(status_code=503, detail="Flight aggregator not initialized")
    
    flights = await flight_aggregator.get_flights()
    return FlightList(
        flights=flights,
        count=len(flights),
        timestamp=datetime.utcnow()
    )


@app.get("/api/flights/{flight_id}", response_model=Flight, tags=["Flights"])
async def get_flight(flight_id: str):
    """
    Get details for a specific flight.
    
    Args:
        flight_id: The unique identifier (e.g., "OS_abc123" or "AX_abc123")
    """
    from .aggregator import flight_aggregator
    
    if flight_aggregator is None:
        raise HTTPException(status_code=503, detail="Flight aggregator not initialized")
    
    flight = flight_aggregator.get_flight(flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found")
    return flight


@app.get("/api/flights/bounds", response_model=FlightList, tags=["Flights"])
async def get_flights_in_bounds(
    lamin: float,
    lamax: float,
    lomin: float,
    lomax: float
):
    """
    Get flights within geographic bounds.
    
    Args:
        lamin: Minimum latitude
        lamax: Maximum latitude
        lomin: Minimum longitude
        lomax: Maximum longitude
    """
    from .aggregator import flight_aggregator
    
    if flight_aggregator is None:
        raise HTTPException(status_code=503, detail="Flight aggregator not initialized")
    
    bounds = {"lamin": lamin, "lamax": lamax, "lomin": lomin, "lomax": lomax}
    flights = await flight_aggregator.get_flights(bounds=bounds)
    return FlightList(
        flights=flights,
        count=len(flights),
        timestamp=datetime.utcnow()
    )


@app.get("/api/stats", tags=["System"])
async def get_stats():
    """
    Get aggregator statistics.
    
    Returns information about API calls, cache status, and flight counts.
    """
    from .aggregator import flight_aggregator
    
    if flight_aggregator is None:
        return {"status": "not_initialized"}
    
    return flight_aggregator.get_stats()


@app.get("/api/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring."""
    from .aggregator import flight_aggregator
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "flight_count": len(flight_aggregator._cache) if flight_aggregator else 0,
        "data_source": "opensky"
    }


@app.get("/api/airports/{code}", tags=["Reference Data"])
async def get_airport(code: str):
    """Get airport information by IATA code."""
    from .flight_routes import AIRPORTS
    
    airport = AIRPORTS.get(code.upper())
    if not airport:
        raise HTTPException(status_code=404, detail=f"Airport {code} not found")
    return {"code": code.upper(), **airport}


@app.get("/api/airports", tags=["Reference Data"])
async def get_all_airports():
    """Get all airports."""
    from .flight_routes import AIRPORTS
    return {"airports": AIRPORTS}


# =============================================================================
# STATIC FILE SERVING
# =============================================================================

app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/", tags=["Frontend"])
async def serve_frontend():
    """Serve the main frontend HTML page."""
    return FileResponse("frontend/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
