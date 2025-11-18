function validateEnv() {
  const requiredVars = {
    VITE_MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN,
    VITE_USERNAME: import.meta.env.VITE_USERNAME,
    VITE_PASSWORD: import.meta.env.VITE_PASSWORD,
  };

  const missing = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing);
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return requiredVars;
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