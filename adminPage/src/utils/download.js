/** Saves `text` as a file through a temporary link — used for CSV exports. */
export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  // The BOM makes Excel read the CSV as UTF-8, so names like "中文" survive.
  const blob = new Blob([type.startsWith('text/csv') ? '﻿' : '', text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Rows (arrays) to CSV text. */
export const toCsv = (rows) => rows.map((row) => row.map(cell).join(',')).join('\n');

/** Today as YYYY-MM-DD in local time, for export filenames. */
export const fileDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
