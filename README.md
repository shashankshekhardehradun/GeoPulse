# GeoPulse - Open Source Signals Tracker

A web application for tracking various open source signals including flights, satellites, traffic, and shipping. Currently featuring a real-time flight tracker with a 3D globe visualization.

![GeoPulse Flight Tracker](https://img.shields.io/badge/Status-Development-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **3D Globe Visualization**: Interactive globe that can zoom into 2D map view
- **Real-time Flight Tracking**: Live updates of aircraft positions
- **Flight Details Panel**: Click any aircraft to see detailed information
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

2. Install dependencies with Poetry:
   ```bash
   poetry install
   ```

3. Run the application:
   ```bash
   poetry run python -m uvicorn backend.main:app --reload
   ```

4. Open your browser to [http://localhost:8000](http://localhost:8000)

## Project Structure

```
GeoPulse/
├── backend/                 # Python FastAPI backend
│   ├── __init__.py
│   ├── main.py             # API server and routes
│   ├── models.py           # Pydantic data models
│   └── mock_data.py        # Mock flight data generator
├── frontend/               # Static frontend files
│   ├── index.html          # Main HTML page
│   ├── css/
│   │   └── styles.css      # Application styles
│   └── js/
│       ├── config.js       # Configuration constants
│       └── flightTracker.js # Main application logic
├── pyproject.toml          # Poetry configuration
└── README.md               # This file
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
- `mock_data.py`: Generates realistic flight data for testing

### Frontend (HTML/CSS/JavaScript)

The frontend uses **CesiumJS** for 3D globe visualization:

- **CesiumJS**: Open-source library for 3D globes and maps
- **Vanilla JavaScript**: No framework dependencies
- **CSS Variables**: For easy theming

Key files:
- `index.html`: Page structure and Cesium container
- `styles.css`: Visual styling with CSS variables
- `flightTracker.js`: Main application logic
- `config.js`: Configuration constants

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
      "flight_id": "FL0001",
      "callsign": "UAL123",
      "aircraft_type": "Boeing 737-800",
      "origin": "JFK",
      "destination": "LAX",
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
  "count": 75,
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
- **CesiumJS**: 3D globe and map visualization
- **HTML5/CSS3**: Structure and styling
- **ES6 JavaScript**: Application logic

## Future Enhancements

- [ ] Real flight data from OpenSky Network API
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
