import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';
const REFRESH_INTERVAL = 60000; // 1 minute (USGS updates every minute)

export default function useEarthquakes(feed = 'all_day', minMagnitude = null) {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchEarthquakes = useCallback(async () => {
    try {
      let url = `${API_BASE}/earthquakes?feed=${feed}`;
      if (minMagnitude !== null) {
        url += `&min_magnitude=${minMagnitude}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEarthquakes(data.earthquakes || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching earthquakes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [feed, minMagnitude]);

  useEffect(() => {
    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEarthquakes]);

  return { earthquakes, loading, error, lastUpdate, refetch: fetchEarthquakes };
}
