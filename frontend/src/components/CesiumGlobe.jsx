import { useRef, useEffect, useCallback, useState } from 'react';
import { Viewer, Entity, BillboardGraphics, LabelGraphics } from 'resium';
import * as Cesium from 'cesium';
import './CesiumGlobe.css';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || '';

window.CESIUM_BASE_URL = '/Cesium/';

// Create airplane icon as data URL
const createAirplaneIcon = (isSelected) => {
  const fillColor = isSelected ? '#ef4444' : '#ffffff';
  const strokeColor = '#000000';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <path d="M16 2 L18 8 L18 12 L28 18 L28 21 L18 17 L18 26 L22 29 L22 31 L16 29 L10 31 L10 29 L14 26 L14 17 L4 21 L4 18 L14 12 L14 8 L16 2 Z" 
      fill="${fillColor}" 
      stroke="${strokeColor}" 
      stroke-width="1.5"
      stroke-linejoin="round"
    />
  </svg>`;
  
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

// Threshold for switching to Google Maps (in meters altitude)
const GOOGLE_MAPS_THRESHOLD = 50000; // 50km altitude

export default function CesiumGlobe({ 
  flights, 
  selectedFlight, 
  onSelectFlight, 
  onSwitchToGoogleMaps 
}) {
  const viewerRef = useRef(null);
  const [cameraHeight, setCameraHeight] = useState(20000000);
  const [terrainProvider, setTerrainProvider] = useState(null);

  // Initialize terrain provider asynchronously
  useEffect(() => {
    const initTerrain = async () => {
      try {
        const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        setTerrainProvider(terrain);
      } catch (error) {
        console.warn('Failed to load Cesium terrain:', error);
      }
    };
    initTerrain();
  }, []);

  // Set up imagery provider after viewer is ready
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const setupImagery = async () => {
      try {
        const imagery = await Cesium.IonImageryProvider.fromAssetId(3);
        viewer.imageryLayers.addImageryProvider(imagery);
      } catch (error) {
        console.warn('Failed to load Cesium imagery:', error);
      }
    };
    setupImagery();
  }, []);


  // Monitor camera height for Google Maps transition
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const moveEndListener = viewer.camera.moveEnd.addEventListener(() => {
      const height = viewer.camera.positionCartographic.height;
      setCameraHeight(height);

      if (height < GOOGLE_MAPS_THRESHOLD && onSwitchToGoogleMaps) {
        const cartographic = viewer.camera.positionCartographic;
        onSwitchToGoogleMaps({
          lat: Cesium.Math.toDegrees(cartographic.latitude),
          lng: Cesium.Math.toDegrees(cartographic.longitude),
          altitude: height,
          heading: Cesium.Math.toDegrees(viewer.camera.heading),
          pitch: Cesium.Math.toDegrees(viewer.camera.pitch)
        });
      }
    });

    const changeListener = viewer.camera.changed.addEventListener(() => {
      const height = viewer.camera.positionCartographic.height;
      setCameraHeight(height);
    });

    return () => {
      moveEndListener();
      changeListener();
    };
  }, [onSwitchToGoogleMaps]);

  // Handle flight selection
  const handleFlightClick = useCallback((flight) => {
    onSelectFlight(flight);
    
    const viewer = viewerRef.current?.cesiumElement;
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          flight.position.longitude,
          flight.position.latitude,
          flight.position.altitude + 500000
        ),
        duration: 1.5
      });
    }
  }, [onSelectFlight]);

  // Reset view
  const handleResetView = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
        duration: 2
      });
    }
  }, []);

  // Get icon scale based on camera height
  const getIconScale = () => {
    if (cameraHeight > 10000000) return 0.6;
    if (cameraHeight > 5000000) return 0.8;
    if (cameraHeight > 1000000) return 1.0;
    return 1.2;
  };


  return (
    <div className="cesium-globe-container">
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        selectionIndicator={false}
        infoBox={false}
        scene3DOnly={true}
        terrainProvider={terrainProvider}
      >
        {/* Render flight entities */}
        {flights.map((flight) => {
          const isSelected = selectedFlight?.flight_id === flight.flight_id;
          const position = Cesium.Cartesian3.fromDegrees(
            flight.position.longitude,
            flight.position.latitude,
            flight.position.altitude
          );

          return (
            <Entity
              key={flight.flight_id}
              position={position}
              name={flight.callsign}
              description={`${flight.origin} → ${flight.destination}`}
              onClick={() => handleFlightClick(flight)}
            >
              <BillboardGraphics
                image={createAirplaneIcon(isSelected)}
                scale={isSelected ? getIconScale() * 1.3 : getIconScale()}
                rotation={Cesium.Math.toRadians(-(flight.heading || 0))}
                verticalOrigin={Cesium.VerticalOrigin.CENTER}
                horizontalOrigin={Cesium.HorizontalOrigin.CENTER}
              />
              {cameraHeight < 5000000 && (
                <LabelGraphics
                  text={flight.callsign}
                  font="12px sans-serif"
                  fillColor={Cesium.Color.WHITE}
                  outlineColor={Cesium.Color.BLACK}
                  outlineWidth={2}
                  style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                  verticalOrigin={Cesium.VerticalOrigin.TOP}
                  pixelOffset={new Cesium.Cartesian2(0, 20)}
                />
              )}
            </Entity>
          );
        })}

      </Viewer>

      {/* Controls */}
      <div className="cesium-controls">
        <button className="cesium-control-btn" onClick={handleResetView} title="Reset View">
          🌍
        </button>
      </div>

      {/* Info overlay */}
      <div className="cesium-info">
        <div className="info-item">
          <span className="info-label">Flights</span>
          <span className="info-value">{flights.length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="cesium-legend">
        <div className="legend-item">
          <span className="legend-dot white"></span>
          <span>Aircraft</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot red"></span>
          <span>Selected</span>
        </div>
        <div className="legend-hint">
          Zoom in to switch to Google Maps
        </div>
      </div>
    </div>
  );
}
