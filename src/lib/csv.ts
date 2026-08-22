/** Guards against CSV/formula injection when the file is opened in Excel/Sheets. */
function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map((h) => csvCell(String(h))).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => csvCell(String(cell))).join(","));
  }
  return lines.join("\r\n");
}
