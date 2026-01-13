import React, { useEffect, useState } from 'react';
import { TableData } from '../types';
import { getTables, deleteTable } from '../services/db';
import { FileSpreadsheet, Trash2, Clock, ChevronRight } from 'lucide-react';

interface HistoryProps {
  onSelect: (table: TableData) => void;
  onBack: () => void;
}

const History: React.FC<HistoryProps> = ({ onSelect, onBack }) => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getTables();
      setTables(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this table?")) {
        await deleteTable(id);
        load();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white shadow-sm border-b sticky top-0 z-10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">History</h2>
        <button onClick={onBack} className="text-blue-600 font-medium text-sm">Close</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
            <div className="text-center text-slate-400 mt-10">Loading...</div>
        ) : tables.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">No saved tables found.</div>
        ) : (
            tables.map((table) => (
                <div 
                    key={table.id}
                    onClick={() => onSelect(table)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 truncate max-w-[180px]">{table.name}</h3>
                            <div className="flex items-center text-xs text-slate-500 gap-2">
                                <Clock size={12} />
                                <span>{new Date(table.lastModified).toLocaleDateString()}</span>
                                <span>• {table.rows.length} rows</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={(e) => handleDelete(e, table.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                        <ChevronRight size={18} className="text-slate-300" />
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default History;
