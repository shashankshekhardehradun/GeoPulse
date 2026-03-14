import { useRef, useEffect, useCallback, useState } from 'react';
import { Viewer, Entity, PointGraphics, LabelGraphics } from 'resium';
import * as Cesium from 'cesium';
import './EarthquakeGlobe.css';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || '';

window.CESIUM_BASE_URL = '/Cesium/';

// Get color based on magnitude
const getMagnitudeColor = (magnitude) => {
  if (magnitude >= 7) return Cesium.Color.fromCssColorString('#dc2626'); // extreme - dark red
  if (magnitude >= 6) return Cesium.Color.fromCssColorString('#ef4444'); // severe - red
  if (magnitude >= 5) return Cesium.Color.fromCssColorString('#f97316'); // strong - orange
  if (magnitude >= 4) return Cesium.Color.fromCssColorString('#eab308'); // moderate - yellow
  if (magnitude >= 3) return Cesium.Color.fromCssColorString('#84cc16'); // light - lime
  return Cesium.Color.fromCssColorString('#22c55e'); // minor - green
};

// Get point size based on magnitude
const getMagnitudeSize = (magnitude, cameraHeight) => {
  const baseSize = Math.max(6, magnitude * 4);
  // Scale based on camera height
  if (cameraHeight > 10000000) return baseSize;
  if (cameraHeight > 5000000) return baseSize * 1.2;
  if (cameraHeight > 1000000) return baseSize * 1.5;
  return baseSize * 2;
};

// Get time-based opacity (recent = more opaque)
const getTimeOpacity = (time) => {
  const now = new Date();
  const eqTime = new Date(time);
  const hoursAgo = (now - eqTime) / (1000 * 60 * 60);
  
  if (hoursAgo < 1) return 1.0;
  if (hoursAgo < 6) return 0.9;
  if (hoursAgo < 12) return 0.8;
  if (hoursAgo < 24) return 0.7;
  return 0.5;
};

export default function EarthquakeGlobe({ 
  earthquakes, 
  selectedEarthquake, 
  onSelectEarthquake,
  onSwitchToGoogleMaps 
}) {
  const viewerRef = useRef(null);
  const earthquakeMap = useRef({});
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

  // Monitor camera height
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const updateHeight = () => {
      const height = viewer.camera.positionCartographic.height;
      setCameraHeight(height);
    };

    viewer.camera.changed.addEventListener(updateHeight);
    viewer.camera.moveEnd.addEventListener(updateHeight);
    
    return () => {
      viewer.camera.changed.removeEventListener(updateHeight);
      viewer.camera.moveEnd.removeEventListener(updateHeight);
    };
  }, []);

  // Fly to earthquake when selected
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !selectedEarthquake) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedEarthquake.position.longitude,
        selectedEarthquake.position.latitude,
        2000000
      ),
      duration: 1.5
    });
  }, [selectedEarthquake]);

  const handleResetView = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
      duration: 1.5
    });
    onSelectEarthquake(null);
  }, [onSelectEarthquake]);

  // Update earthquake map when earthquakes change
  useEffect(() => {
    earthquakeMap.current = {};
    earthquakes.forEach(eq => {
      earthquakeMap.current[eq.earthquake_id] = eq;
    });
  }, [earthquakes]);

  const handleEntityClick = useCallback((entityId) => {
    const eq = earthquakeMap.current[entityId];
    if (eq) {
      onSelectEarthquake(eq);
    }
  }, [onSelectEarthquake]);

  return (
    <div className="earthquake-globe-container">
      <Viewer
        ref={viewerRef}
        full
        terrainProvider={terrainProvider}
        animation={false}
        baseLayerPicker={false}
        fullscreenButton={false}
        vrButton={false}
        geocoder={false}
        homeButton={false}
        infoBox={false}
        sceneModePicker={false}
        selectionIndicator={false}
        timeline={false}
        navigationHelpButton={false}
        scene3DOnly={true}
        skyBox={false}
        onClick={(_, target) => {
          if (target?.id && typeof target.id === 'string' && target.id.startsWith('eq_')) {
            handleEntityClick(target.id.replace('eq_', ''));
          } else {
            onSelectEarthquake(null);
          }
        }}
      >
        {earthquakes.map((eq) => {
          const isSelected = selectedEarthquake?.earthquake_id === eq.earthquake_id;
          const color = getMagnitudeColor(eq.magnitude);
          const opacity = getTimeOpacity(eq.time);
          const size = getMagnitudeSize(eq.magnitude, cameraHeight);
          
          return (
            <Entity
              key={eq.earthquake_id}
              id={`eq_${eq.earthquake_id}`}
              position={Cesium.Cartesian3.fromDegrees(
                eq.position.longitude,
                eq.position.latitude,
                0
              )}
              name={eq.place}
            >
              <PointGraphics
                pixelSize={isSelected ? size * 1.5 : size}
                color={isSelected ? Cesium.Color.WHITE : color.withAlpha(opacity)}
                outlineColor={isSelected ? color : Cesium.Color.BLACK}
                outlineWidth={isSelected ? 3 : 1}
              />
              {(cameraHeight < 5000000 || isSelected) && (
                <LabelGraphics
                  text={`M${eq.magnitude.toFixed(1)}`}
                  font="bold 12px sans-serif"
                  fillColor={Cesium.Color.WHITE}
                  outlineColor={Cesium.Color.BLACK}
                  outlineWidth={2}
                  style={Cesium.LabelStyle.FILL_AND_OUTLINE}
                  verticalOrigin={Cesium.VerticalOrigin.TOP}
                  pixelOffset={new Cesium.Cartesian2(0, size + 5)}
                />
              )}
            </Entity>
          );
        })}
      </Viewer>

      {/* Controls */}
      <div className="earthquake-controls">
        <button className="earthquake-control-btn" onClick={handleResetView} title="Reset View">
          🌍
        </button>
      </div>

      {/* Info overlay */}
      <div className="earthquake-info-overlay">
        <div className="info-item">
          <span className="info-label">Earthquakes</span>
          <span className="info-value">{earthquakes.length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="earthquake-legend">
        <div className="legend-title">Magnitude</div>
        <div className="legend-item">
          <span className="legend-dot extreme"></span>
          <span>7.0+</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot severe"></span>
          <span>6.0-6.9</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot strong"></span>
          <span>5.0-5.9</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot moderate"></span>
          <span>4.0-4.9</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot light"></span>
          <span>3.0-3.9</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot minor"></span>
          <span>&lt;3.0</span>
        </div>
      </div>
    </div>
  );
}
