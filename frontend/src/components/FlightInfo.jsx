import './FlightInfo.css';

export default function FlightInfo({ flight, onClose }) {
  if (!flight) return null;

  const altitudeFt = Math.round(flight.position.altitude * 3.28084);
  const isCountryOrigin = flight.origin && flight.origin.length > 3; // Country names are longer than airport codes

  return (
    <aside className="flight-info-panel">
      <div className="panel-header">
        <h2>Flight Details</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="flight-callsign">{flight.callsign}</div>
        
        {/* Show origin country */}
        {isCountryOrigin && (
          <div className="flight-origin-country">
            <span className="country-label">Origin Country:</span>
            <span className="country-value">{flight.origin}</span>
          </div>
        )}

        <div className="flight-details">
          <DetailRow label="Aircraft Type" value={flight.aircraft_type || "Unknown"} />
          <DetailRow label="Altitude" value={`${altitudeFt.toLocaleString()} ft`} />
          <DetailRow label="Speed" value={`${Math.round(flight.speed)} kts`} />
          <DetailRow label="Heading" value={`${Math.round(flight.heading)}°`} />
          <DetailRow 
            label="Vertical Speed" 
            value={`${flight.vertical_speed > 0 ? '+' : ''}${Math.round(flight.vertical_speed)} ft/min`}
            highlight={flight.vertical_speed !== 0}
          />
          <DetailRow label="Status" value={flight.status.replace('_', ' ')} status />
          <DetailRow 
            label="Position" 
            value={`${flight.position.latitude.toFixed(4)}°, ${flight.position.longitude.toFixed(4)}°`}
            small
          />
          <DetailRow 
            label="Flight ID" 
            value={flight.flight_id}
            small
          />
        </div>

        <div className="flight-note">
          <p>Real-time data from OpenSky Network</p>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value, highlight, status, small }) {
  return (
    <div className={`detail-row ${highlight ? 'highlight' : ''} ${small ? 'small' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${status ? 'status-badge' : ''}`}>{value}</span>
    </div>
  );
}
