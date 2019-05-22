import {readFileSync} from 'fs';

export function getCSVData(filename: string) {
  const lines = readFileSync(filename).toString();
  const records = [];
  for (const line of lines.split('\n')) {
    const entries = [];
    const parts = line.split(',');
    let current = null;
    for (const part of parts) {
      if (part[0] == '"') {
        current = part.substring(1);
      } else if (current == null) {
        entries.push(part.trim());
      } else {
        current += ',' + part;
        if (current[current.length - 1] == '"') {
          entries.push(current.substring(0, current.length - 1).trim());
          current = null;
        }
      }
    }
    records.push(entries);
  }
  return records;
}
