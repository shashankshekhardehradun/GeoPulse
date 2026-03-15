import './LoadingScreen.css';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-globe">
          <div className="globe-ring"></div>
          <div className="globe-ring"></div>
          <div className="globe-ring"></div>
          <span className="globe-icon">🌐</span>
        </div>
        <h1 className="loading-title">GeoPulse</h1>
        <p className="loading-text">Loading flight data...</p>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
}
