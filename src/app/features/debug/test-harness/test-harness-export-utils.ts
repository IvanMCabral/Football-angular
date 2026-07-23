export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLines(header: string[], rows: Record<string, unknown>[]): string[] {
  return [
    header.join(','),
    ...rows.map((row) => header.map((key) => csvCell(row[key])).join(',')),
  ];
}
