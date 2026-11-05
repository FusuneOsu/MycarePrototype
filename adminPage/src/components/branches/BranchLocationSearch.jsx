import { useState } from 'react';
import { Button, Input } from '../../../../shared/ui/index.js';
import { forwardGeocode, parseCoordinates, reverseGeocode } from '../../utils/geocoding.js';
import './BranchLocationSearch.css';

export default function BranchLocationSearch({ value, onChange, onLocationSelected, disabled = false }) {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const query = String(value || '').trim();
    if (!query) return;
    setSearching(true);
    setError('');
    try {
      const coordinates = parseCoordinates(query);
      if (coordinates) {
        const address = await reverseGeocode(coordinates.lat, coordinates.lng);
        onLocationSelected({ ...coordinates, address: address || query, searchText: address || query });
      } else {
        const result = await forwardGeocode(query);
        if (!result) {
          setError('No location found. Try another place name or latitude, longitude.');
          return;
        }
        onLocationSelected({ ...result, searchText: result.address || query });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="branch-location-search">
      <label htmlFor="branch-location-search">Search place or coordinates</label>
      <div className="branch-location-search__row">
        <Input
          id="branch-location-search"
          value={value}
          onChange={(event) => { onChange(event.target.value); setError(''); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleSearch(); } }}
          placeholder="Place name or latitude, longitude"
          disabled={disabled || searching}
        />
        <Button variant="secondary" size="sm" onClick={handleSearch} disabled={disabled || searching || !String(value || '').trim()}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </div>
      {error && <p className="branch-location-search__error" role="alert">{error}</p>}
      <p className="branch-location-search__hint">Search with Nominatim or pan, zoom, and click the map to place the pin.</p>
    </div>
  );
}
