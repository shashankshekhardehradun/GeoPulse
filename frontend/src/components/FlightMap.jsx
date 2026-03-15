import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './FlightMap.css';

const DEFAULT_VIEW = {
  longitude: 0,
  latitude: 30,
  zoom: 2,
  pitch: 30,
  bearing: 0
};

const MAP_STYLES = {
  satellite: {
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    type: 'raster'
  },
  terrain: {
    name: 'Terrain',
    icon: '🏔️',
    url: 'https://tiles.stadiamaps.com/styles/stamen_terrain.json',
    type: 'style'
  },
  outdoor: {
    name: 'Outdoor',
    icon: '🌲',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    type: 'raster',
    subdomains: ['a', 'b', 'c']
  },
  dark: {
    name: 'Dark',
    icon: '🌙',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    type: 'style'
  }
};

const createSatelliteStyle = () => ({
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '© Esri'
    }
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
});

const createOutdoorStyle = () => ({
  version: 8,
  sources: {
    'topo-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenTopoMap'
    }
  },
  layers: [
    {
      id: 'topo-layer',
      type: 'raster',
      source: 'topo-tiles',
      minzoom: 0,
      maxzoom: 17
    }
  ]
});

// Calculate icon size based on zoom level
const getIconSize = (zoom) => {
  // Scale from 20px at zoom 2 to 48px at zoom 10+
  const minSize = 20;
  const maxSize = 48;
  const minZoom = 2;
  const maxZoom = 10;
  
  if (zoom <= minZoom) return minSize;
  if (zoom >= maxZoom) return maxSize;
  
  const scale = (zoom - minZoom) / (maxZoom - minZoom);
  return Math.round(minSize + (maxSize - minSize) * scale);
};

// Realistic commercial aircraft silhouette icon
const AircraftIcon = ({ isSelected, size = 28 }) => {
  const mainColor = isSelected ? '#ef4444' : '#f8fafc';
  const accentColor = isSelected ? '#fca5a5' : '#cbd5e1';
  const outlineColor = isSelected ? '#991b1b' : '#1e293b';
  
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className="aircraft-svg">
      <defs>
        <linearGradient id={`fuselage-${isSelected ? 'sel' : 'def'}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accentColor} />
          <stop offset="50%" stopColor={mainColor} />
          <stop offset="100%" stopColor={accentColor} />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.5"/>
        </filter>
      </defs>
      
      {/* Main fuselage - sleek elongated body */}
      <path
        d="M18 1 
           C19 1 20 2 20 4
           L20 24
           C20 25 19.5 26 18 26
           C16.5 26 16 25 16 24
           L16 4
           C16 2 17 1 18 1Z"
        fill={`url(#fuselage-${isSelected ? 'sel' : 'def'})`}
        stroke={outlineColor}
        strokeWidth="0.5"
        filter="url(#shadow)"
      />
      
      {/* Main wings - swept back design */}
      <path
        d="M18 10
           L32 16
           L32 17.5
           L20 15
           L20 14
           Z"
        fill={mainColor}
        stroke={outlineColor}
        strokeWidth="0.4"
      />
      <path
        d="M18 10
           L4 16
           L4 17.5
           L16 15
           L16 14
           Z"
        fill={mainColor}
        stroke={outlineColor}
        strokeWidth="0.4"
      />
      
      {/* Wing details - engine pods */}
      <ellipse cx="25" cy="16" rx="1.2" ry="2" fill={accentColor} stroke={outlineColor} strokeWidth="0.3" />
      <ellipse cx="11" cy="16" rx="1.2" ry="2" fill={accentColor} stroke={outlineColor} strokeWidth="0.3" />
      
      {/* Horizontal stabilizer (tail wings) */}
      <path
        d="M18 22
           L26 25
           L26 26
           L19 24
           Z"
        fill={mainColor}
        stroke={outlineColor}
        strokeWidth="0.3"
      />
      <path
        d="M18 22
           L10 25
           L10 26
           L17 24
           Z"
        fill={mainColor}
        stroke={outlineColor}
        strokeWidth="0.3"
      />
      
      {/* Vertical stabilizer (tail fin) */}
      <path
        d="M18 20
           L18 26
           L20.5 26
           L21 22
           Z"
        fill={mainColor}
        stroke={outlineColor}
        strokeWidth="0.3"
      />
      
      {/* Cockpit windshield */}
      <path
        d="M17 3
           L17 6
           C17 6.5 17.5 7 18 7
           C18.5 7 19 6.5 19 6
           L19 3
           C19 2.5 18.5 2 18 2
           C17.5 2 17 2.5 17 3Z"
        fill="#0c4a6e"
        stroke="#0369a1"
        strokeWidth="0.3"
      />
      
      {/* Fuselage windows line */}
      <line x1="17.2" y1="8" x2="17.2" y2="18" stroke={outlineColor} strokeWidth="0.4" strokeDasharray="1,1.5" />
      <line x1="18.8" y1="8" x2="18.8" y2="18" stroke={outlineColor} strokeWidth="0.4" strokeDasharray="1,1.5" />
    </svg>
  );
};

const GLOBE_TRANSITION_ZOOM = 1.8; // Zoom level below which we switch to globe

export default function FlightMap({ 
  flights, 
  selectedFlight, 
  onSelectFlight, 
  initialCenter,
  onSwitchToGlobe 
}) {
  const [viewState, setViewState] = useState(() => {
    if (initialCenter) {
      return {
        longitude: initialCenter.lng,
        latitude: initialCenter.lat,
        zoom: initialCenter.zoom || 4,
        pitch: 30,
        bearing: 0
      };
    }
    return DEFAULT_VIEW;
  });
  
  const [mapStyle, setMapStyle] = useState('satellite');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showPitchSlider, setShowPitchSlider] = useState(false);
  const hasReceivedInitialCenter = useRef(false);
  const isTransitioningToGlobe = useRef(false);

  // Only update view on initial mount with initialCenter, not on subsequent changes
  useEffect(() => {
    if (initialCenter && !hasReceivedInitialCenter.current) {
      hasReceivedInitialCenter.current = true;
      setViewState({
        longitude: initialCenter.lng,
        latitude: initialCenter.lat,
        zoom: initialCenter.zoom || 4,
        pitch: 30,
        bearing: 0
      });
    }
  }, [initialCenter]);

  // Check for zoom-out to globe transition
  useEffect(() => {
    if (viewState.zoom < GLOBE_TRANSITION_ZOOM && onSwitchToGlobe && !isTransitioningToGlobe.current) {
      isTransitioningToGlobe.current = true;
      // Small delay to prevent accidental triggers
      const timer = setTimeout(() => {
        onSwitchToGlobe();
        isTransitioningToGlobe.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewState.zoom, onSwitchToGlobe]);

  const handleMarkerClick = useCallback((flight, e) => {
    e.originalEvent.stopPropagation();
    onSelectFlight(flight);
  }, [onSelectFlight]);

  const handleMapClick = useCallback(() => {
    onSelectFlight(null);
    setShowStylePicker(false);
    setShowPitchSlider(false);
  }, [onSelectFlight]);

  const handlePitchChange = useCallback((e) => {
    const newPitch = parseInt(e.target.value, 10);
    setViewState(prev => ({ ...prev, pitch: newPitch }));
  }, []);

  const showGlobeHint = viewState.zoom < 3;
  
  // Calculate icon size based on current zoom
  const iconSize = getIconSize(viewState.zoom);

  const currentMapStyle = useMemo(() => {
    switch (mapStyle) {
      case 'satellite':
        return createSatelliteStyle();
      case 'outdoor':
        return createOutdoorStyle();
      case 'terrain':
        return MAP_STYLES.terrain.url;
      case 'dark':
      default:
        return MAP_STYLES.dark.url;
    }
  }, [mapStyle]);
  
  const mapContainerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

  const markers = useMemo(() => 
    flights.map((flight) => (
      <Marker
        key={flight.flight_id}
        longitude={flight.position.longitude}
        latitude={flight.position.latitude}
        anchor="center"
        onClick={(e) => handleMarkerClick(flight, e)}
      >
        <div 
          className={`aircraft-marker ${selectedFlight?.flight_id === flight.flight_id ? 'selected' : ''}`}
          style={{ transform: `rotate(${flight.heading}deg)` }}
        >
          <AircraftIcon 
            isSelected={selectedFlight?.flight_id === flight.flight_id} 
            size={iconSize}
          />
        </div>
      </Marker>
    )), [flights, selectedFlight, handleMarkerClick, iconSize]);

  return (
    <div className="map-container">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle={currentMapStyle}
        style={mapContainerStyle}
        attributionControl={false}
        maxPitch={85}
      >
        <NavigationControl position="bottom-right" visualizePitch={true} />
        <ScaleControl position="bottom-left" />
        {markers}
      </Map>
      
      <div className="map-controls">
        <button 
          className="map-control-btn"
          onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom + 1 }))}
          title="Zoom In"
        >
          +
        </button>
        <button 
          className="map-control-btn"
          onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom - 1 }))}
          title="Zoom Out"
        >
          −
        </button>
        <div className="control-divider"></div>
        <button 
          className={`map-control-btn ${showPitchSlider ? 'active' : ''}`}
          onClick={() => setShowPitchSlider(!showPitchSlider)}
          title="Adjust View Angle"
        >
          📐
        </button>
        <button 
          className="map-control-btn"
          onClick={() => setViewState({ ...DEFAULT_VIEW })}
          title="Reset View"
        >
          ⟲
        </button>
        {onSwitchToGlobe && (
          <button 
            className="map-control-btn globe-btn"
            onClick={onSwitchToGlobe}
            title="Switch to Globe View"
          >
            🌍
          </button>
        )}
      </div>

      {/* Pitch Slider */}
      {showPitchSlider && (
        <div className="pitch-slider-container">
          <div className="pitch-slider-header">
            <span>View Angle</span>
            <span className="pitch-value">{Math.round(viewState.pitch)}°</span>
          </div>
          <div className="pitch-slider-body">
            <span className="pitch-label">2D</span>
            <input
              type="range"
              min="0"
              max="85"
              value={viewState.pitch}
              onChange={handlePitchChange}
              className="pitch-slider"
            />
            <span className="pitch-label">3D</span>
          </div>
          <div className="pitch-presets">
            <button onClick={() => setViewState(prev => ({ ...prev, pitch: 0 }))}>0°</button>
            <button onClick={() => setViewState(prev => ({ ...prev, pitch: 30 }))}>30°</button>
            <button onClick={() => setViewState(prev => ({ ...prev, pitch: 45 }))}>45°</button>
            <button onClick={() => setViewState(prev => ({ ...prev, pitch: 60 }))}>60°</button>
          </div>
        </div>
      )}

      {/* Map Style Picker */}
      <div className="style-picker-container">
        <button 
          className="style-picker-toggle"
          onClick={() => setShowStylePicker(!showStylePicker)}
          title="Change Map Style"
        >
          {MAP_STYLES[mapStyle].icon}
          <span>{MAP_STYLES[mapStyle].name}</span>
          <span className="chevron">{showStylePicker ? '▲' : '▼'}</span>
        </button>
        
        {showStylePicker && (
          <div className="style-picker-dropdown">
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <button
                key={key}
                className={`style-option ${mapStyle === key ? 'active' : ''}`}
                onClick={() => {
                  setMapStyle(key);
                  setShowStylePicker(false);
                }}
              >
                <span className="style-icon">{style.icon}</span>
                <span className="style-name">{style.name}</span>
                {mapStyle === key && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {showGlobeHint && onSwitchToGlobe && (
        <div className="globe-hint" onClick={onSwitchToGlobe}>
          <span>🌍</span>
          <span>Switch to Globe for better overview</span>
        </div>
      )}

      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-dot active"></span>
          <span>Aircraft</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot selected"></span>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
