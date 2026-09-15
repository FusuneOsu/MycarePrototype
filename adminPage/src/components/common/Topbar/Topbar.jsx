import './Topbar.css';

function Topbar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export default Topbar;
