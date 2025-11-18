import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Hazard, MapViewProps } from "../types";
import { fetchHazardsActive } from "../api/disasteraware";
import { config } from "../config";
import { HAZARD_COLORS, defaultColor } from "../config/hazardColors";

const MapView: React.FC<MapViewProps> = ({
  filter,
  mapStyle,
  onDataUpdate
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (map.current) return;
    mapboxgl.accessToken = config.mapbox.token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      projection: "globe",
      center: [0, 20],
      zoom: 1.5
    });

    map.current.on("load", () => {
      map.current?.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6
      });
      fetchDisasters();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (map.current && disasters.length > 0) {
      addMarkersToMap(
        filter === "ALL" ? disasters : disasters.filter(d => d.type === filter)
      );
    }
  }, [filter, disasters, mapStyle]);

  // 当 mapStyle 改变时更新地图样式
  useEffect(() => {
    if (map.current && mapStyle) {
      map.current.setStyle(`mapbox://styles/mapbox/${mapStyle}`);
      map.current.once("styledata", () => {
        addMarkersToMap(
          filter === "ALL"
            ? disasters
            : disasters.filter(d => d.type === filter)
        );
      });
    }
  }, [mapStyle]);

  const fetchDisasterAwareHazards = async (): Promise<Hazard[]> => {
    try {
      const data = await fetchHazardsActive(
        filter === "ALL" ? "EVENT" : filter
      );
      return data.map((hazard: any) => ({
        id: hazard.hazard_ID || `da-${Date.now()}`,
        title: hazard.hazard_Name || "Unknown Hazard",
        type: hazard.type_ID || "UNKNOWN",
        geometry:
          hazard.latitude && hazard.longitude
            ? {
                type: "Point",
                coordinates: [hazard.longitude, hazard.latitude]
              }
            : { type: "Point", coordinates: [0, 0] },
        description:
          hazard.description ||
          hazard.hazard_Name ||
          "No description available",
        source: hazard.creator || "DisasterAware",
        severity: hazard.severity_ID,
        timestamp: hazard.create_Date
      }));
    } catch (error) {
      console.warn("DisasterAware API failed", error);
      return [];
    }
  };

  const fetchDisasters = async () => {
    try {
      // Prefer using the DisasterAware API; if it fails, fall back to other data sources.
      const res = await fetchDisasterAwareHazards();
      if (res.length > 0) {
        setDisasters(res);
        onDataUpdate(res);
      } else {
        const [usgs, nasa, gdacs] = await Promise.allSettled([
          fetchUSGSEarthquakes(),
          fetchNASAEONET(),
          fetchGDACS()
        ]);

        const all: Hazard[] = [];
        [usgs, nasa, gdacs].forEach(res => {
          if (res.status === "fulfilled" && res.value.length > 0)
            all.push(...res.value);
        });
        setDisasters(all);
        onDataUpdate(all);
      }
    } catch (err) {
      console.error("Error loading disasters:", err);
    }
  };

  // Fetch from USGS Earthquake API
  async function fetchUSGSEarthquakes(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.features
        .map((feature: any) => ({
          id: feature.id,
          title: feature.properties.title || feature.properties.place,
          type: 'EARTHQUAKE',
          severity: feature.properties.mag >= 6.0 ? 'WARNING' as const : 
                  feature.properties.mag >= 5.0 ? 'WATCH' as const : 'ADVISORY' as const,
          description: `Magnitude ${feature.properties.mag} earthquake - ${feature.properties.place}`,
          geometry: feature.geometry,
          magnitude: feature.properties.mag,
          time: new Date(feature.properties.time).toISOString(),
          source: 'USGS'
        }));
    } catch (error) {
      console.error('USGS fetch error:', error);
      return [];
    }
  }

  // Fetch from NASA EONET
  async function fetchNASAEONET(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300');
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.events
        .map((event: any) => {
          const category = event.categories[0]?.title || 'UNKNOWN';
          const hazardType = mapNASACategoryToType(category);
          
          const geom = event.geometry[event.geometry.length - 1];
          
          return {
            id: event.id,
            title: event.title,
            type: hazardType,
            severity: 'ADVISORY' as const,
            description: `${category} - ${event.title}`,
            geometry: {
              type: geom.type,
              coordinates: geom.coordinates
            },
            time: geom.date,
            source: 'NASA EONET'
          };
        });
    } catch (error) {
      console.error('NASA EONET fetch error:', error);
      return [];
    }
  }

  // Fetch from GDACS
  async function fetchGDACS(): Promise<Hazard[]> {
    try {
      const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH');
      if (!response.ok) return [];
      
      const geojson = await response.json();
      const features = geojson.features || [];
      const results: Hazard[] = [];

      features.forEach((feature: any) => {
        const { geometry, properties } = feature;
        if (!geometry?.coordinates) return;
        
        const title = properties.name || properties.eventname || 'Unknown Event';
        const description = properties.description || properties.htmldescription || '';
        const hazardType = detectHazardTypeFromTitle(title.concat(' ', description, ' ', properties.severitydata.severitytext || ''));
        const severity =
          properties.alertlevel === 'Red' ? 'WARNING' :
          properties.alertlevel === 'Orange' ? 'WATCH' :
          'ADVISORY';

        results.push({
          id: `gdacs-${properties.eventid || Date.now()}`,
          title,
          type: hazardType,
          severity,
          description,
          geometry,
          source: 'GDACS',
          link: properties.url?.report || null
        });
      });

      return results;
    } catch (error) {
      console.error('GDACS fetch error:', error);
      return [];
    }
  }


  const mapNASACategoryToType = (category: string): string => {
    if (category.includes("Wildfires")) return "WILDFIRE";
    if (category.includes("Volcanoes")) return "VOLCANO";
    if (category.includes("Floods")) return "FLOOD";
    if (category.includes("Severe Storms")) return "STORM";
    if (category.includes("Drought")) return "DROUGHT";
    if (category.includes("Landslides")) return "LANDSLIDE";
    return "UNKNOWN";
  };

  const detectHazardTypeFromTitle = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes("earthquake")) return "EARTHQUAKE";
    if (t.includes("flood")) return "FLOOD";
    if (
      t.includes("cyclone") ||
      t.includes("hurricane") ||
      t.includes("typhoon")
    )
      return "TROPICAL_CYCLONE";
    if (t.includes("volcano")) return "VOLCANO";
    if (t.includes("drought")) return "DROUGHT";
    if (t.includes("tsunami")) return "TSUNAMI";
    if (t.includes("storm")) return "STORM";
    return "UNKNOWN";
  };

  const addMarkersToMap = (hazards: any[]) => {
    markers.current.forEach(m => m.remove());
    markers.current = [];
    hazards.forEach(h => {
      const coords = h.geometry?.coordinates;
      if (!coords) return;
      const color = HAZARD_COLORS[h.type] || defaultColor;
      const el = document.createElement("div");
      el.className = "disaster-marker";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = "2px solid white";
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="popup-title">${h.title}</div>
        <div class="popup-info">
            <strong>Type:</strong> ${h.type.replace(/_/g, " ")}<br>
            <strong>Severity:</strong> ${h.severity}<br>
            <strong>Description:</strong> ${h.description}<br>
            <strong>Platform:</strong> Prometheus Global Guardian
        </div>
      `);
      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);
      markers.current.push(marker);
    });
  };

  return <div ref={mapContainer} style={{ width: "100vw", height: "100vh" }} />;
};

export default MapView;
