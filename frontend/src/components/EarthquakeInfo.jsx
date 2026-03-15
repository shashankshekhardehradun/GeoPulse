import './EarthquakeInfo.css';

const getMagnitudeClass = (magnitude) => {
  if (magnitude >= 7) return 'extreme';
  if (magnitude >= 6) return 'severe';
  if (magnitude >= 5) return 'strong';
  if (magnitude >= 4) return 'moderate';
  if (magnitude >= 3) return 'light';
  return 'minor';
};

const getAlertClass = (alert) => {
  if (!alert) return '';
  return `alert-${alert}`;
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

export default function EarthquakeInfo({ earthquake, onClose }) {
  if (!earthquake) return null;

  const magClass = getMagnitudeClass(earthquake.magnitude);
  const alertClass = getAlertClass(earthquake.alert);

  return (
    <aside className="earthquake-info-panel">
      <div className="panel-header">
        <h2>Earthquake Details</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className={`magnitude-display ${magClass}`}>
          <span className="mag-value">{earthquake.magnitude.toFixed(1)}</span>
          <span className="mag-type">{earthquake.magnitude_type.toUpperCase()}</span>
        </div>
        
        <div className="earthquake-location">
          {earthquake.place}
        </div>

        <div className="earthquake-time">
          <span className="time-relative">{formatTime(earthquake.time)}</span>
          <span className="time-absolute">{new Date(earthquake.time).toLocaleString()}</span>
        </div>

        {earthquake.alert && (
          <div className={`alert-badge ${alertClass}`}>
            {earthquake.alert.toUpperCase()} ALERT
          </div>
        )}

        {earthquake.tsunami && (
          <div className="tsunami-warning">
            🌊 TSUNAMI WARNING
          </div>
        )}

        <div className="earthquake-details">
          <DetailRow label="Depth" value={`${earthquake.position.depth.toFixed(1)} km`} />
          <DetailRow 
            label="Coordinates" 
            value={`${earthquake.position.latitude.toFixed(4)}°, ${earthquake.position.longitude.toFixed(4)}°`}
            small
          />
          <DetailRow label="Significance" value={earthquake.significance} />
          {earthquake.felt && (
            <DetailRow label="Felt Reports" value={earthquake.felt.toLocaleString()} />
          )}
          <DetailRow label="Status" value={earthquake.status} status />
        </div>

        <a 
          href={earthquake.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="usgs-link"
        >
          View on USGS →
        </a>

        <div className="earthquake-note">
          <p>Data from USGS Earthquake Hazards Program</p>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value, small, status }) {
  return (
    <div className={`detail-row ${small ? 'small' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${status ? 'status-badge' : ''}`}>{value}</span>
    </div>
  );
}
