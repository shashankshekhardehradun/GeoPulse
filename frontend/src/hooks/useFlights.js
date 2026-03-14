import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const UPDATE_INTERVAL = 2000;

export function useFlights() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchFlights = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flights`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFlights(data.flights);
      setLastUpdate(new Date());
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch flights:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  return { flights, loading, error, lastUpdate, refetch: fetchFlights };
}

export function useAirports() {
  const [airports, setAirports] = useState({});

  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/airports`);
        if (response.ok) {
          const data = await response.json();
          setAirports(data.airports);
        }
      } catch (err) {
        console.error('Failed to fetch airports:', err);
      }
    };
    fetchAirports();
  }, []);

  return airports;
}
