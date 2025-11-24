function validateEnv() {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  
  // Mapbox token is required - provide a default for demo purposes
  if (!mapboxToken) {
    console.warn("VITE_MAPBOX_TOKEN not set. Using default public token for demo.");
  }

  // DisasterAware credentials are optional
  const username = import.meta.env.VITE_USERNAME;
  const password = import.meta.env.VITE_PASSWORD;
  
  if (!username || !password) {
    console.warn("DisasterAware credentials not set. Some features may be limited.");
  }

  return {
    VITE_MAPBOX_TOKEN: mapboxToken || 'pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNrZGVtbzEyMzBhMWYyeW81cjBzZGZoZmYifQ.demo-token',
    VITE_USERNAME: username || '',
    VITE_PASSWORD: password || '',
  };
}

export const env = validateEnv();

export const config = {
  mapbox: {
    token: env.VITE_MAPBOX_TOKEN,
    defaultStyle: "dark-v11",
    defaultCenter: [0, 20] as [number, number],
    defaultZoom: 1.5,
  },
  disasterAware: {
    username: env.VITE_USERNAME,
    password: env.VITE_PASSWORD,
    baseUrl: "https://api.disasteraware.com",
  },
  apis: {
    usgs: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
    nasa: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300",
    gdacs: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH",
  },
  ui: {
    refreshInterval: 300000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  }
};