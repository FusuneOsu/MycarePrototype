import LocationMap from '../map/LocationMap.jsx';
import './BranchMap.css';

export default function BranchMap({ latitude, longitude, height = '420px', readOnly = true, onChange }) {
  return (
    <div className="branch-map">
      <LocationMap latitude={latitude} longitude={longitude} onChange={onChange} readOnly={readOnly} height={height} showOpenInGmaps />
    </div>
  );
}
