import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import CesiumGlobe from './components/CesiumGlobe';
import GoogleFlightMap from './components/GoogleFlightMap';
import FlightInfo from './components/FlightInfo';
import EarthquakeGlobe from './components/EarthquakeGlobe';
import EarthquakeInfo from './components/EarthquakeInfo';
import LoadingScreen from './components/LoadingScreen';
import useFlights from './hooks/useFlights';
import useEarthquakes from './hooks/useEarthquakes';
import './App.css';

// Signal types
const SIGNAL_TYPES = {
  FLIGHTS: 'flights',
  EARTHQUAKES: 'earthquakes'
};

// View modes
const VIEW_MODES = {
  CESIUM: 'cesium',
  GOOGLE_MAPS: 'google'
};

function App() {
  // Signal type state
  const [signalType, setSignalType] = useState(SIGNAL_TYPES.FLIGHTS);
  
  // Flight data
  const { flights, loading: flightsLoading, error: flightsError, lastUpdate: flightsLastUpdate } = useFlights();
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  // Earthquake data
  const { earthquakes, loading: earthquakesLoading, error: earthquakesError, lastUpdate: earthquakesLastUpdate } = useEarthquakes('all_day');
  const [selectedEarthquake, setSelectedEarthquake] = useState(null);
  
  // View state
  const [viewMode, setViewMode] = useState(VIEW_MODES.CESIUM);
  const [googleMapsCenter, setGoogleMapsCenter] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionKey = useRef(0);

  // Handle signal type change
  const handleSignalTypeChange = useCallback((newType) => {
    setSignalType(newType);
    setSelectedFlight(null);
    setSelectedEarthquake(null);
    setViewMode(VIEW_MODES.CESIUM);
    setGoogleMapsCenter(null);
  }, []);

  // Handle transition from Cesium to Google Maps
  const handleSwitchToGoogleMaps = useCallback((cameraState) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    transitionKey.current += 1;
    
    const altitude = cameraState.altitude;
    let zoom = 10;
    if (altitude < 10000) zoom = 15;
    else if (altitude < 20000) zoom = 13;
    else if (altitude < 50000) zoom = 11;
    
    setGoogleMapsCenter({
      lat: cameraState.lat,
      lng: cameraState.lng,
      zoom: zoom
    });
    
    setTimeout(() => {
      setViewMode(VIEW_MODES.GOOGLE_MAPS);
      setIsTransitioning(false);
    }, 200);
  }, [isTransitioning]);

  // Handle transition from Google Maps back to Cesium
  const handleSwitchToCesium = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setGoogleMapsCenter(null);
    
    setTimeout(() => {
      setViewMode(VIEW_MODES.CESIUM);
      setIsTransitioning(false);
    }, 200);
  }, [isTransitioning]);

  // Determine loading state
  const isLoading = signalType === SIGNAL_TYPES.FLIGHTS 
    ? (flightsLoading && flights.length === 0)
    : (earthquakesLoading && earthquakes.length === 0);
  
  const error = signalType === SIGNAL_TYPES.FLIGHTS ? flightsError : earthquakesError;
  const lastUpdate = signalType === SIGNAL_TYPES.FLIGHTS ? flightsLastUpdate : earthquakesLastUpdate;
  const itemCount = signalType === SIGNAL_TYPES.FLIGHTS ? flights.length : earthquakes.length;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`app ${isTransitioning ? 'transitioning' : ''}`}>
      <Header 
        flightCount={itemCount}
        lastUpdate={lastUpdate}
        isConnected={!error}
        signalType={signalType}
      />
      
      {/* Signal Type Switcher */}
      <div className="signal-switcher">
        <button 
          className={`signal-btn ${signalType === SIGNAL_TYPES.FLIGHTS ? 'active' : ''}`}
          onClick={() => handleSignalTypeChange(SIGNAL_TYPES.FLIGHTS)}
        >
          <span className="signal-icon">✈️</span>
          <span className="signal-label">Flights</span>
          <span className="signal-count">{flights.length}</span>
        </button>
        <button 
          className={`signal-btn ${signalType === SIGNAL_TYPES.EARTHQUAKES ? 'active' : ''}`}
          onClick={() => handleSignalTypeChange(SIGNAL_TYPES.EARTHQUAKES)}
        >
          <span className="signal-icon">🌍</span>
          <span className="signal-label">Earthquakes</span>
          <span className="signal-count">{earthquakes.length}</span>
        </button>
      </div>
      
      <main className="app-main">
        {/* Flight Views */}
        {signalType === SIGNAL_TYPES.FLIGHTS && (
          <>
            <div className={`view-container ${viewMode === VIEW_MODES.CESIUM ? 'active' : ''}`}>
              {viewMode === VIEW_MODES.CESIUM && (
                <CesiumGlobe 
                  flights={flights}
                  selectedFlight={selectedFlight}
                  onSelectFlight={setSelectedFlight}
                  onSwitchToGoogleMaps={handleSwitchToGoogleMaps}
                />
              )}
            </div>
            
            <div className={`view-container ${viewMode === VIEW_MODES.GOOGLE_MAPS ? 'active' : ''}`}>
              {viewMode === VIEW_MODES.GOOGLE_MAPS && (
                <GoogleFlightMap 
                  key={transitionKey.current}
                  flights={flights}
                  selectedFlight={selectedFlight}
                  onSelectFlight={setSelectedFlight}
                  initialCenter={googleMapsCenter}
                  onSwitchToGlobe={handleSwitchToCesium}
                />
              )}
            </div>
            
            {selectedFlight && (
              <FlightInfo 
                flight={selectedFlight}
                onClose={() => setSelectedFlight(null)}
              />
            )}
          </>
        )}
        
        {/* Earthquake Views */}
        {signalType === SIGNAL_TYPES.EARTHQUAKES && (
          <>
            <div className="view-container active">
              <EarthquakeGlobe 
                earthquakes={earthquakes}
                selectedEarthquake={selectedEarthquake}
                onSelectEarthquake={setSelectedEarthquake}
              />
            </div>
            
            {selectedEarthquake && (
              <EarthquakeInfo 
                earthquake={selectedEarthquake}
                onClose={() => setSelectedEarthquake(null)}
              />
            )}
          </>
        )}
      </main>

      {error && (
        <div className="error-toast">
          <span className="error-icon">⚠️</span>
          <span>Connection error: {error}</span>
        </div>
      )}
    </div>
  );
}

export default App;
