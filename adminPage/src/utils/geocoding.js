export function parseCoordinates(value) {
  const match = String(value || '').trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export async function forwardGeocode(query) {
  if (!query || query.trim().length < 3) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=my`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!response.ok) return null;
    const results = await response.json();
    if (!results?.length) return null;
    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
      address: results[0].display_name || query,
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!response.ok) return null;
    const result = await response.json();
    return result?.display_name || null;
  } catch {
    return null;
  }
}
