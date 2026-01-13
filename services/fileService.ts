import { TableData, Column, Cell } from '../types';

export const parseCSV = (content: string, fileName: string): TableData => {
  const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) throw new Error("Empty file");

  // Naive CSV splitter that handles basic commas. 
  // For production, a robust regex or library is better for quoted commas.
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const columns: Column[] = headers.map((h, idx) => ({
    id: `col_${idx}`,
    label: h || `Column ${idx + 1}`,
    type: 'text' // Default to text
  }));

  const rows: Cell[] = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Cell = {};
    columns.forEach((col, idx) => {
      // Try to parse number if it looks like one
      const val = values[idx] || "";
      const numVal = parseFloat(val);
      
      if (!isNaN(numVal) && isFinite(numVal) && String(numVal) === val) {
          row[col.id] = numVal;
          // Upgrade column type inference
          if(col.type === 'text') col.type = 'number';
      } else {
          row[col.id] = val;
      }
    });
    return row;
  });

  return {
    id: crypto.randomUUID(),
    name: fileName.split('.')[0] || "Imported CSV",
    createdAt: Date.now(),
    lastModified: Date.now(),
    columns,
    rows
  };
};
