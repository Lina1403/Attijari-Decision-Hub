export function exportRowsToCsv<TData extends Record<string, string | number>>(
  rows: TData[],
  filename: string,
) {
  const firstRow = rows[0];

  if (!firstRow) {
    return;
  }

  const headers = Object.keys(firstRow);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
