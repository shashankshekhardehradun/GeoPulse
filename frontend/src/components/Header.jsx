import './Header.css';

export default function Header({ flightCount, lastUpdate, isConnected }) {
  const formatTime = (date) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString();
  };

  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">🌐</span>
        <h1>GeoPulse</h1>
      </div>
      
      <div className="header-stats">
        <div className="stat">
          <span className="stat-label">Tracking</span>
          <span className="stat-value">{flightCount}</span>
          <span className="stat-unit">flights</span>
        </div>
        
        <div className="stat">
          <span className="stat-label">Last Update</span>
          <span className="stat-value time">{formatTime(lastUpdate)}</span>
        </div>
        
        <div className={`connection-status ${isConnected ? 'connected' : 'error'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
}
