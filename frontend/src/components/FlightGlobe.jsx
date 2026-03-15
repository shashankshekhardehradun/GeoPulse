import { useRef, useEffect, useCallback } from 'react';
import Globe from 'globe.gl';
import './FlightGlobe.css';

const AIRPORTS = {
  "JFK": { lat: 40.6413, lng: -73.7781 },
  "LAX": { lat: 33.9425, lng: -118.4081 },
  "LHR": { lat: 51.4700, lng: -0.4543 },
  "CDG": { lat: 49.0097, lng: 2.5479 },
  "DXB": { lat: 25.2532, lng: 55.3657 },
  "HND": { lat: 35.5494, lng: 139.7798 },
  "SIN": { lat: 1.3644, lng: 103.9915 },
  "SYD": { lat: -33.9399, lng: 151.1753 },
  "FRA": { lat: 50.0379, lng: 8.5622 },
  "ORD": { lat: 41.9742, lng: -87.9073 },
  "SFO": { lat: 37.6213, lng: -122.3790 },
  "DEL": { lat: 28.5562, lng: 77.1000 },
  "BOM": { lat: 19.0896, lng: 72.8656 },
  "PEK": { lat: 40.0799, lng: 116.6031 },
  "ICN": { lat: 37.4602, lng: 126.4407 },
};

const ZOOM_THRESHOLD = 0.5; // Altitude below this triggers map view

export default function FlightGlobe({ flights, selectedFlight, onSelectFlight, onZoomThreshold }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const lastPovRef = useRef({ lat: 30, lng: 0, altitude: 2.5 });

  // Initialize globe
  useEffect(() => {
    if (!containerRef.current || globeRef.current) return;

    const globe = Globe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .atmosphereColor('#00d4ff')
      .atmosphereAltitude(0.2)
      .pointAltitude(d => 0.01 + (d.altitude / 15000000))
      .pointColor(d => d.isSelected ? '#ff6b6b' : '#00d4ff')
      .pointRadius(d => d.isSelected ? 0.6 : 0.35)
      .pointLabel(d => `
        <div class="globe-tooltip">
          <strong>${d.callsign}</strong><br/>
          ${d.origin} → ${d.destination}<br/>
          ${d.aircraft_type}
        </div>
      `)
      .onPointClick((point) => {
        if (point?.flight) {
          onSelectFlight(point.flight);
        }
      })
      .arcColor(() => ['#00d4ff', '#00ff88'])
      .arcDashLength(0.5)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .arcStroke(0.5)
      (containerRef.current);

    // Set initial view
    globe.pointOfView({ lat: 30, lng: 0, altitude: 2.5 }, 0);

    // Enable controls
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;
    controls.minDistance = 101; // Minimum zoom (closest to Earth)
    controls.maxDistance = 500; // Maximum zoom (farthest from Earth)

    // Listen for zoom changes to trigger map view
    controls.addEventListener('change', () => {
      const pov = globe.pointOfView();
      lastPovRef.current = pov;
      
      // Check if zoomed in past threshold
      if (pov.altitude < ZOOM_THRESHOLD && onZoomThreshold) {
        onZoomThreshold(pov);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        globe.width(containerRef.current.clientWidth);
        globe.height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    globeRef.current = globe;

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onSelectFlight, onZoomThreshold]);

  // Update points when flights change
  useEffect(() => {
    if (!globeRef.current) return;

    const pointsData = flights.map(flight => ({
      lat: flight.position.latitude,
      lng: flight.position.longitude,
      altitude: flight.position.altitude,
      callsign: flight.callsign,
      origin: flight.origin,
      destination: flight.destination,
      aircraft_type: flight.aircraft_type,
      isSelected: selectedFlight?.flight_id === flight.flight_id,
      flight: flight
    }));

    globeRef.current.pointsData(pointsData);
  }, [flights, selectedFlight]);

  // Update arcs for selected flight
  useEffect(() => {
    if (!globeRef.current) return;

    if (selectedFlight) {
      const origin = AIRPORTS[selectedFlight.origin];
      const dest = AIRPORTS[selectedFlight.destination];

      if (origin && dest) {
        const arcsData = [
          {
            startLat: origin.lat,
            startLng: origin.lng,
            endLat: selectedFlight.position.latitude,
            endLng: selectedFlight.position.longitude,
          },
          {
            startLat: selectedFlight.position.latitude,
            startLng: selectedFlight.position.longitude,
            endLat: dest.lat,
            endLng: dest.lng,
          }
        ];
        globeRef.current.arcsData(arcsData);
      }
    } else {
      globeRef.current.arcsData([]);
    }
  }, [selectedFlight]);

  // Stop auto-rotate on interaction
  const handleInteraction = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false;
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 30, lng: 0, altitude: 2.5 }, 1000);
      globeRef.current.controls().autoRotate = true;
    }
  }, []);

  const handleToggleRotation = useCallback(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = !controls.autoRotate;
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView();
      const newAltitude = Math.max(0.1, pov.altitude * 0.7);
      globeRef.current.pointOfView({ ...pov, altitude: newAltitude }, 300);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView();
      const newAltitude = Math.min(4, pov.altitude * 1.4);
      globeRef.current.pointOfView({ ...pov, altitude: newAltitude }, 300);
    }
  }, []);

  return (
    <div 
      className="globe-container" 
      ref={containerRef}
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className="globe-controls">
        <button 
          className="globe-control-btn"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          +
        </button>
        <button 
          className="globe-control-btn"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          −
        </button>
        <div className="control-divider"></div>
        <button 
          className="globe-control-btn"
          onClick={handleResetView}
          title="Reset View"
        >
          🌍
        </button>
        <button 
          className="globe-control-btn"
          onClick={handleToggleRotation}
          title="Toggle Rotation"
        >
          🔄
        </button>
      </div>
      
      <div className="globe-legend">
        <div className="legend-item">
          <span className="legend-dot active"></span>
          <span>Aircraft</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot selected"></span>
          <span>Selected</span>
        </div>
        <div className="legend-hint">
          Scroll to zoom • Drag to rotate
        </div>
      </div>

      <div className="zoom-indicator">
        <div className="zoom-label">Zoom in more to switch to Map view</div>
      </div>
    </div>
  );
}
