import { cx } from './Avatar.jsx';

/**
 * Standard data table: rounded bordered box, uppercase header row, divided
 * rows. Pass `columns` (header labels) and render rows as children <tr>s.
 * `raised` adds the card shadow for tables that sit directly on the page.
 */
export function Table({ columns, children, raised = false, className, empty, label }) {
  if (empty) return <div className="ui-table-empty">{empty}</div>;
  return (
    <div className={cx('ui-table-wrap', raised && 'ui-table-wrap--raised', className)}>
      <table className="ui-table" aria-label={label}>
        <thead>
          <tr>{columns.map((column, index) => <th key={column || `col-${index}`} aria-label={column ? undefined : 'Actions'}>{column}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Bold line with an optional muted second line — the usual first cell. */
export function CellStack({ primary, secondary, children }) {
  return (
    <>
      <span className="ui-table__primary">{primary}{children}</span>
      {secondary && <span className="ui-table__secondary">{secondary}</span>}
    </>
  );
}
