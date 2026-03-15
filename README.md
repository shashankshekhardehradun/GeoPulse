# GeoPulse - Open Source Signals Tracker

A web application for tracking various open source signals including flights, satellites, traffic, and shipping. Currently featuring a real-time flight tracker with a 3D globe visualization.

![GeoPulse Flight Tracker](https://img.shields.io/badge/Status-Development-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **3D Globe Visualization**: Interactive CesiumJS globe with terrain and imagery
- **Real-time Flight Tracking**: Live data from OpenSky Network API
- **Seamless View Transitions**: Smooth zoom from globe to Google Maps street-level view
- **Flight Details Panel**: Click any aircraft to see airline, origin country, altitude, speed, and heading
- **Airline Recognition**: Automatic identification of 100+ airlines from callsigns
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites

- Python 3.10 or higher
- Poetry (Python package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GeoPulse
   ```

2. Install backend dependencies with Poetry:
   ```bash
   poetry install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenSky Network credentials
   ```

5. Run the backend:
   ```bash
   poetry run uvicorn backend.main:app --reload --port 8000
   ```

6. Run the frontend (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

7. Open your browser to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
GeoPulse/
├── backend/                    # Python FastAPI backend
│   ├── __init__.py
│   ├── main.py                # API server and routes
│   ├── models.py              # Pydantic data models
│   ├── providers.py           # OpenSky Network API integration
│   ├── aggregator.py          # Flight data aggregation and caching
│   ├── flight_enrichment.py   # Airline lookup from callsigns
│   └── mock_data.py           # Mock flight data generator (fallback)
├── frontend/                   # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx            # Main application component
│   │   ├── components/
│   │   │   ├── CesiumGlobe.jsx    # 3D globe visualization
│   │   │   ├── GoogleFlightMap.jsx # Google Maps integration
│   │   │   ├── FlightInfo.jsx     # Flight details panel
│   │   │   └── Header.jsx         # Application header
│   │   └── hooks/
│   │       └── useFlights.js      # Flight data fetching hook
│   ├── package.json
│   └── vite.config.js
├── .env.example               # Environment variables template
├── pyproject.toml             # Poetry configuration
└── README.md                  # This file
```

## Architecture Overview

### Backend (Python/FastAPI)

The backend is built with **FastAPI**, a modern Python web framework. It provides:

- **REST API endpoints** for flight data
- **Static file serving** for the frontend
- **Mock data generation** for development

Key files:
- `main.py`: Defines API routes and serves the frontend
- `models.py`: Data structures using Pydantic for validation
- `providers.py`: OpenSky Network API client with OAuth authentication
- `aggregator.py`: Flight data caching and aggregation
- `flight_enrichment.py`: Airline identification from callsigns
- `mock_data.py`: Generates realistic flight data (fallback when API unavailable)

### Frontend (React/Vite)

The frontend uses **React** with **CesiumJS** and **Google Maps** for visualization:

- **React**: Component-based UI framework
- **Vite**: Fast build tool and dev server
- **CesiumJS/Resium**: 3D globe visualization with terrain
- **Google Maps**: Street-level map view with seamless transitions
- **CSS Modules**: Scoped component styling

Key components:
- `CesiumGlobe.jsx`: 3D globe with flight markers
- `GoogleFlightMap.jsx`: 2D map with Google Maps integration
- `FlightInfo.jsx`: Flight details panel
- `useFlights.js`: Custom hook for real-time data fetching

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve the frontend application |
| `/api/flights` | GET | Get all tracked flights |
| `/api/flights/{id}` | GET | Get a specific flight by ID |
| `/api/airports` | GET | Get list of airports |
| `/api/health` | GET | Health check endpoint |

### Example Response

```json
{
  "flights": [
    {
      "flight_id": "OS_a1b2c3",
      "callsign": "UAL123",
      "aircraft_type": "United Airlines",
      "origin": "United States",
      "destination": "---",
      "position": {
        "latitude": 40.1234,
        "longitude": -100.5678,
        "altitude": 10668.0
      },
      "heading": 270.5,
      "speed": 485.0,
      "vertical_speed": 0,
      "status": "en_route"
    }
  ],
  "count": 6000,
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Development

### Running in Development Mode

```bash
# Install dependencies
poetry install

# Run with auto-reload
poetry run python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

FastAPI automatically generates API documentation:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Technology Stack

### Backend
- **Python 3.10+**: Programming language
- **FastAPI**: Web framework for building APIs
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server for running the app

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **CesiumJS/Resium**: 3D globe visualization
- **Google Maps API**: Street-level map view
- **CSS3**: Styling with modern features

### APIs
- **OpenSky Network**: Real-time flight tracking data (OAuth authentication)

## Future Enhancements

- [ ] ADS-B Exchange API integration (unfiltered data including military/private aircraft)
- [ ] FlightAware AeroAPI integration (departure/arrival airports, flight routes)
- [ ] Flight path visualization (origin to destination route tracing)
- [ ] Satellite tracking (TLE data)
- [ ] Ship tracking (AIS data)
- [ ] Traffic data visualization
- [ ] Historical flight playback
- [ ] Flight path prediction
- [ ] Airport information overlays

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.
