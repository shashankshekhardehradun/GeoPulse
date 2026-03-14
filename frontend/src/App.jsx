import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import CesiumGlobe from './components/CesiumGlobe';
import GoogleFlightMap from './components/GoogleFlightMap';
import FlightInfo from './components/FlightInfo';
import LoadingScreen from './components/LoadingScreen';
import { useFlights } from './hooks/useFlights';
import './App.css';

// View modes
const VIEW_MODES = {
  CESIUM: 'cesium',      // Global/regional view with Cesium
  GOOGLE_MAPS: 'google'  // Local/street view with Google Maps
};

function App() {
  const { flights, loading, error, lastUpdate } = useFlights();
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.CESIUM);
  const [googleMapsCenter, setGoogleMapsCenter] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionKey = useRef(0);

  // Handle transition from Cesium to Google Maps (when zoomed in close)
  const handleSwitchToGoogleMaps = useCallback((cameraState) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    transitionKey.current += 1;
    
    // Convert Cesium altitude to Google Maps zoom
    // Cesium altitude 50km ≈ Google zoom 10
    // Cesium altitude 10km ≈ Google zoom 13
    // Cesium altitude 1km ≈ Google zoom 16
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

  // Handle transition from Google Maps back to Cesium (when zoomed out)
  const handleSwitchToCesium = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setGoogleMapsCenter(null);
    
    setTimeout(() => {
      setViewMode(VIEW_MODES.CESIUM);
      setIsTransitioning(false);
    }, 200);
  }, [isTransitioning]);

  if (loading && flights.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className={`app ${isTransitioning ? 'transitioning' : ''}`}>
      <Header 
        flightCount={flights.length}
        lastUpdate={lastUpdate}
        isConnected={!error}
      />
      
      <main className="app-main">
        {/* Cesium Globe View */}
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
        
        {/* Google Maps View */}
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
        
        {/* Flight Info Panel */}
        {selectedFlight && (
          <FlightInfo 
            flight={selectedFlight}
            onClose={() => setSelectedFlight(null)}
          />
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
