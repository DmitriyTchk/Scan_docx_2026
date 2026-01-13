import React, { useState } from 'react';
import { Column, TableData } from '../types';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface ColumnSettingsProps {
  table: TableData;
  onSave: (updatedColumns: Column[]) => void;
  onClose: () => void;
}

const ColumnSettings: React.FC<ColumnSettingsProps> = ({ table, onSave, onClose }) => {
  const [columns, setColumns] = useState<Column[]>([...table.columns]);

  const handleChange = (index: number, field: keyof Column, value: string) => {
    const newCols = [...columns];
    newCols[index] = { ...newCols[index], [field]: value };
    setColumns(newCols);
  };

  const handleDelete = (index: number) => {
    const newCols = columns.filter((_, i) => i !== index);
    setColumns(newCols);
  };

  const handleAdd = () => {
    const newId = `col_${Date.now()}`;
    setColumns([...columns, { id: newId, label: 'New Column', type: 'text' }]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Edit Template Structure</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {columns.map((col, idx) => (
            <div key={col.id} className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium ml-1">Label</label>
                  <input
                    type="text"
                    value={col.label}
                    onChange={(e) => handleChange(idx, 'label', e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium ml-1">Type</label>
                  <select
                    value={col.type}
                    onChange={(e) => handleChange(idx, 'type', e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-200 rounded text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Checkbox</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(idx)}
                className="mt-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <Plus size={18} /> Add Column
          </button>
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
          <button
            onClick={() => onSave(columns)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnSettings;
