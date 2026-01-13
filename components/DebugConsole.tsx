import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, X } from 'lucide-react';

interface DebugConsoleProps {
  logs: LogEntry[];
  onClose: () => void;
  isOpen: boolean;
}

const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onClose, isOpen }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 left-4 w-64 md:w-80 bg-black/90 text-green-400 font-mono text-xs rounded-lg shadow-2xl z-50 border border-slate-700 backdrop-blur max-h-[60vh] flex flex-col pointer-events-auto">
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50 rounded-t-lg">
        <div className="flex items-center gap-2">
            <Terminal size={14} />
            <span className="font-bold">System Log</span>
        </div>
        <button onClick={onClose} className="hover:text-white"><X size={14} /></button>
      </div>
      <div className="overflow-y-auto p-2 space-y-1 flex-1">
        {logs.length === 0 && <div className="text-slate-600 italic">No logs yet...</div>}
        {logs.map((log) => (
          <div key={log.id} className="break-words">
            <span className="text-slate-500">[{log.time}]</span>{' '}
            <span className={`${
                log.type === 'error' ? 'text-red-400 font-bold' : 
                log.type === 'success' ? 'text-green-300' : 'text-slate-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default DebugConsole;
