import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAREGIVING_SITES } from '../../../../shared/careVocabulary.js';
import './LocationMap.css';

// Fix default marker icon (webpack/vite bundling issue with Leaflet's default icons).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const defaultCenter = [3.1279, 101.6560]; // Kuala Lumpur center
const defaultZoom = 11;

/**
 * Inner component that watches for map clicks to update the marker position.
 */
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

/**
 * Fly the map to a given lat/lng when it changes externally.
 */
function FlyTo({ lat, lng }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (lat != null && lng != null) {
      const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
      if (key !== prev.current) {
        prev.current = key;
        map.flyTo([lat, lng], map.getZoom() < 14 ? 14 : map.getZoom(), { duration: 0.8 });
      }
    }
  }, [lat, lng, map]);
  return null;
}

/**
 * LocationMap — OpenStreetMap picker with a draggable marker.
 *
 * Props:
 *   latitude, longitude  — current position (numbers or null)
 *   onChange(lat, lng)   — called when user clicks/drags the marker
 *   readOnly             — if true, marker is not draggable and map cannot be clicked
 *   height               — CSS height (default '250px')
 *   showSiteSelector     — show a dropdown to pick from caregiving sites
 *   siteSelectorLabel    — label for the site dropdown
 *   showOpenInGmaps      — show a link to open coordinates in Google Maps
 */
export default function LocationMap({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  height = '250px',
  showSiteSelector = false,
  siteSelectorLabel = 'Select a caregiving site',
  showOpenInGmaps = false,
}) {
  const [lat, setLat] = useState(latitude != null ? Number(latitude) : null);
  const [lng, setLng] = useState(longitude != null ? Number(longitude) : null);
  const [sites, setSites] = useState(CAREGIVING_SITES);

  // Fetch sites from the API on mount (overrides static list with DB data).
  useEffect(() => {
    fetch('/api/caregiving-sites')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSites(data); })
      .catch(() => { /* fall back to static CAREGIVING_SITES */ });
  }, []);

  // Sync external lat/lng changes (e.g. from a loaded appointment).
  useEffect(() => {
    if (latitude != null && longitude != null) {
      setLat(Number(latitude));
      setLng(Number(longitude));
    }
  }, [latitude, longitude]);

  const handleClick = (pos) => {
    if (readOnly) return;
    const nLat = Number(pos.lat);
    const nLng = Number(pos.lng);
    setLat(nLat);
    setLng(nLng);
    if (onChange) onChange(nLat, nLng);
  };

  const handleSiteSelect = (e) => {
    const siteId = e.target.value;
    if (!siteId) return;
    const site = sites.find((s) => s.id === siteId);
    if (site) {
      const nLat = Number(site.latitude);
      const nLng = Number(site.longitude);
      setLat(nLat);
      setLng(nLng);
      if (onChange) onChange(nLat, nLng);
    }
  };

  const hasCoords = lat != null && lng != null;
  const openInGmapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="location-map" style={{ height }}>
      {showSiteSelector && (
        <div className="location-map__site-selector">
          <label>{siteSelectorLabel}</label>
          <select onChange={handleSiteSelect} defaultValue="">
            <option value="" disabled>— Choose a site —</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} — {site.area}
              </option>
            ))}
            <option value="custom">Custom pinpoint (click on map)</option>
          </select>
        </div>
      )}

      <MapContainer
        center={hasCoords ? [lat, lng] : defaultCenter}
        zoom={hasCoords ? 14 : defaultZoom}
        className="location-map__map"
        scrollWheelZoom={true}
        key={`${lat ?? 'no'}_${lng ?? 'no'}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && <ClickHandler onMapClick={handleClick} />}
        {hasCoords && (
          <Marker
            position={[lat, lng]}
            draggable={!readOnly}
            eventHandlers={
              !readOnly
                ? {
                    dragend(e) {
                      const pos = e.target.getLatLng();
                      setLat(pos.lat);
                      setLng(pos.lng);
                      if (onChange) onChange(pos.lat, pos.lng);
                    },
                  }
                : undefined
            }
          >
            <Popup>
              {lat?.toFixed(5)}, {lng?.toFixed(5)}
            </Popup>
          </Marker>
        )}
        <FlyTo lat={lat} lng={lng} />
      </MapContainer>

      {hasCoords && (
        <div className="location-map__coords">
          <span className="location-map__coord-text">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
          {showOpenInGmaps && openInGmapsUrl && (
            <a
              href={openInGmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="location-map__gmaps-link"
              title="Open in Google Maps"
            >
              Open in Google Maps ↗
            </a>
          )}
        </div>
      )}

      {!hasCoords && !readOnly && (
        <p className="location-map__hint">Click on the map to place a pinpoint.</p>
      )}
    </div>
  );
}