import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import './GoogleFlightMap.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const DEFAULT_CENTER = { lat: 30, lng: 0 };
const DEFAULT_ZOOM = 3;
const GLOBE_TRANSITION_ZOOM = 2.5;

const MAP_TYPES = {
  satellite: { name: 'Satellite', icon: '🛰️', id: 'hybrid' },
  terrain: { name: 'Terrain', icon: '🏔️', id: 'terrain' },
  roadmap: { name: 'Roadmap', icon: '🗺️', id: 'roadmap' },
};

// Calculate icon size based on zoom level
const getIconSize = (zoom) => {
  const minSize = 16;
  const maxSize = 52;
  const minZoom = 3;
  const maxZoom = 12;
  
  if (zoom <= minZoom) return minSize;
  if (zoom >= maxZoom) return maxSize;
  
  const scale = (zoom - minZoom) / (maxZoom - minZoom);
  return Math.round(minSize + (maxSize - minSize) * scale);
};

// Create aircraft SVG as data URL - white airplane with black border
const createAircraftSvg = (isSelected, size) => {
  const fillColor = isSelected ? '%23ef4444' : '%23ffffff';
  const strokeColor = '%23000000';
  const strokeWidth = isSelected ? '1.5' : '1';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
    <path d="M16 2 L18 8 L18 12 L28 18 L28 21 L18 17 L18 26 L22 29 L22 31 L16 29 L10 31 L10 29 L14 26 L14 17 L4 21 L4 18 L14 12 L14 8 L16 2 Z" 
      fill="${fillColor}" 
      stroke="${strokeColor}" 
      stroke-width="${strokeWidth}"
      stroke-linejoin="round"
    />
  </svg>`;
  
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

// Aircraft markers manager
function AircraftMarkers({ flights, selectedFlight, onSelectFlight, zoom }) {
  const map = useMap();
  const markersRef = useRef({});
  const iconSize = getIconSize(zoom);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Update or create markers
    flights.forEach((flight) => {
      const isSelected = selectedFlight?.flight_id === flight.flight_id;
      const position = { lat: flight.position.latitude, lng: flight.position.longitude };
      
      if (markersRef.current[flight.flight_id]) {
        const marker = markersRef.current[flight.flight_id];
        marker.setPosition(position);
        marker.setIcon({
          url: createAircraftSvg(isSelected, iconSize),
          anchor: new google.maps.Point(iconSize / 2, iconSize / 2),
          scaledSize: new google.maps.Size(iconSize, iconSize),
        });
      } else {
        const marker = new google.maps.Marker({
          position,
          map,
          icon: {
            url: createAircraftSvg(isSelected, iconSize),
            anchor: new google.maps.Point(iconSize / 2, iconSize / 2),
            scaledSize: new google.maps.Size(iconSize, iconSize),
          },
          title: flight.callsign,
        });
        
        marker.addListener('click', () => onSelectFlight(flight));
        markersRef.current[flight.flight_id] = marker;
      }
    });

    // Remove old markers
    const currentIds = new Set(flights.map(f => f.flight_id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markersRef.current[id].setMap(null);
        delete markersRef.current[id];
      }
    });
  }, [map, flights, selectedFlight, onSelectFlight, iconSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach(m => m.setMap(null));
      markersRef.current = {};
    };
  }, []);

  return null;
}

// Map events handler
function MapEvents({ onZoomChange, onSwitchToGlobe }) {
  const map = useMap();
  const transitioning = useRef(false);

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener('zoom_changed', () => {
      const z = map.getZoom();
      if (z !== undefined) {
        onZoomChange(z);
        if (z < GLOBE_TRANSITION_ZOOM && onSwitchToGlobe && !transitioning.current) {
          transitioning.current = true;
          setTimeout(() => {
            onSwitchToGlobe();
            transitioning.current = false;
          }, 400);
        }
      }
    });

    return () => google.maps.event.removeListener(listener);
  }, [map, onZoomChange, onSwitchToGlobe]);

  return null;
}


// Main content
function MapContent({ flights, selectedFlight, onSelectFlight, initialCenter, onSwitchToGlobe }) {
  const [zoom, setZoom] = useState(initialCenter?.zoom || DEFAULT_ZOOM);
  const [mapType, setMapType] = useState('satellite');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const map = useMap();

  const center = initialCenter ? { lat: initialCenter.lat, lng: initialCenter.lng } : DEFAULT_CENTER;

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(MAP_TYPES[mapType].id);
  }, [map, mapType]);

  const handleMapClick = useCallback(() => {
    onSelectFlight(null);
    setShowStylePicker(false);
  }, [onSelectFlight]);

  return (
    <div className="gmap-wrapper">
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        mapTypeId={MAP_TYPES[mapType].id}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        onClick={handleMapClick}
      >
        <MapEvents onZoomChange={setZoom} onSwitchToGlobe={onSwitchToGlobe} />
        <AircraftMarkers 
          flights={flights} 
          selectedFlight={selectedFlight} 
          onSelectFlight={onSelectFlight} 
          zoom={zoom} 
        />
      </Map>

      {/* Controls */}
      <div className="gmap-controls">
        <button className="gmap-control-btn" onClick={() => map?.setZoom((map.getZoom() || zoom) + 1)} title="Zoom In">+</button>
        <button className="gmap-control-btn" onClick={() => map?.setZoom((map.getZoom() || zoom) - 1)} title="Zoom Out">−</button>
        <div className="control-divider"></div>
        <button className="gmap-control-btn" onClick={() => { map?.setCenter(DEFAULT_CENTER); map?.setZoom(DEFAULT_ZOOM); }} title="Reset">⟲</button>
        {onSwitchToGlobe && <button className="gmap-control-btn globe-btn" onClick={onSwitchToGlobe} title="Globe View">🌍</button>}
      </div>

      {/* Style Picker */}
      <div className="gmap-style-picker">
        <button className="style-toggle" onClick={() => setShowStylePicker(!showStylePicker)}>
          {MAP_TYPES[mapType].icon} <span>{MAP_TYPES[mapType].name}</span> <span className="chevron">{showStylePicker ? '▲' : '▼'}</span>
        </button>
        {showStylePicker && (
          <div className="style-dropdown">
            {Object.entries(MAP_TYPES).map(([key, s]) => (
              <button key={key} className={`style-option ${mapType === key ? 'active' : ''}`} onClick={() => { setMapType(key); setShowStylePicker(false); }}>
                {s.icon} <span>{s.name}</span> {mapType === key && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Globe hint */}
      {zoom < 4 && onSwitchToGlobe && (
        <div className="gmap-globe-hint" onClick={onSwitchToGlobe}>
          🌍 <span>Switch to Globe</span>
        </div>
      )}

      {/* Legend */}
      <div className="gmap-legend">
        <div className="legend-item"><span className="legend-dot active"></span>Aircraft</div>
        <div className="legend-item"><span className="legend-dot selected"></span>Selected</div>
        <div className="legend-zoom">Zoom: {Math.round(zoom)}</div>
      </div>
    </div>
  );
}

// Exported component
export default function GoogleFlightMap(props) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <MapContent {...props} />
    </APIProvider>
  );
}
