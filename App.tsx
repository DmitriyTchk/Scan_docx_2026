import React, { useState, useEffect, useRef } from 'react';
import { TableData, Column, Cell, AppStatus, VoiceUpdateResult, LogEntry, WorkflowPlan, Language } from './types';
import { convertImageToTable } from './services/geminiService';
import { parseCSV } from './services/fileService';
import { saveTable } from './services/db';
import { Camera, FileUp, Plus, ArrowLeft, Download, Grid3X3, Loader2, Table, Settings, Image as ImageIcon, X, Terminal, Sparkles, Languages, Home } from 'lucide-react';
import VoiceControl from './components/VoiceControl';
import History from './components/History';
import CameraCapture from './components/CameraCapture';
import ColumnSettings from './components/ColumnSettings';
import DebugConsole from './components/DebugConsole';
import WorkflowWizard from './components/WorkflowWizard';
import GuidedSession from './components/GuidedSession';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'editor' | 'history'>('home');
  const [language, setLanguage] = useState<Language>('ru');
  const t = TRANSLATIONS[language];

  // Modals
  const [showCamera, setShowCamera] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  
  // Workflow
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowPlan | null>(null);

  // Debug
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  // Data
  const [currentTable, setCurrentTable] = useState<TableData | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const entry: LogEntry = {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString().split(' ')[0],
        message,
        type
    };
    setLogs(prev => [...prev, entry]);
  };

  useEffect(() => {
     log("App initialized.", 'info');
  }, []);

  const handleCreateNew = () => {
    const newTable: TableData = {
      id: crypto.randomUUID(),
      name: t.newTemplate,
      createdAt: Date.now(),
      lastModified: Date.now(),
      columns: [
        { id: 'col_1', label: 'Column 1', type: 'text' },
        { id: 'col_2', label: 'Column 2', type: 'number' },
      ],
      rows: []
    };
    setCurrentTable(newTable);
    setView('editor');
  };

  const processImage = async (base64: string, mimeType: string = 'image/jpeg') => {
    setShowCamera(false);
    setShowSourceModal(false);
    setStatus(AppStatus.PROCESSING);
    setFeedback(t.processing);
    
    try {
      const result = await convertImageToTable(base64, mimeType);
      
      const newTable: TableData = {
        id: crypto.randomUUID(),
        name: "Scan " + new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        lastModified: Date.now(),
        columns: result.columns || [],
        rows: (result.rows as Cell[]) || []
      };
      
      setCurrentTable(newTable);
      saveTable(newTable); 
      setView('editor');
      setStatus(AppStatus.SUCCESS);
      setFeedback("Review data, then click 'Pipeline' to set up voice guide.");
      setTimeout(() => setFeedback(null), 4000);
    } catch (error: any) {
      log(error.message, 'error');
      setStatus(AppStatus.ERROR);
      setFeedback(error.message);
      setTimeout(() => {
        setStatus(AppStatus.IDLE);
        setFeedback(null);
      }, 5000);
    }
  };

  const handleSaveWorkflow = (plan: WorkflowPlan) => {
      if(!currentTable) return;
      const updatedTable = { ...currentTable, workflowPlan: plan, lastModified: Date.now() };
      setCurrentTable(updatedTable);
      saveTable(updatedTable);
      setShowWorkflowWizard(false);
      setActiveWorkflow(plan); 
  };

  const handleVoiceUpdate = (result: VoiceUpdateResult) => {
    if (!currentTable) return;
    setFeedback(result.feedback);
    const newRows = [...currentTable.rows];
    result.rowUpdates.forEach(update => {
      if (update.rowIndex === -1 || result.action === 'append') {
        newRows.push(update.updates);
      } else if (update.rowIndex >= 0 && update.rowIndex < newRows.length) {
        newRows[update.rowIndex] = { ...newRows[update.rowIndex], ...update.updates };
      }
    });
    const updatedTable = { ...currentTable, rows: newRows, lastModified: Date.now() };
    setCurrentTable(updatedTable);
    saveTable(updatedTable);
  };

  const handleManualCellChange = (rowIndex: number, colId: string, val: string) => {
    if (!currentTable) return;
    const newRows = [...currentTable.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [colId]: val };
    const updated = { ...currentTable, rows: newRows, lastModified: Date.now() };
    setCurrentTable(updated);
    saveTable(updated); 
  };

  const handleGuidedValue = (rowIndex: number, colId: string, val: string) => {
      if (!currentTable) return;
      const newRows = [...currentTable.rows];
      if (!newRows[rowIndex]) {
          const newRow: any = {};
          currentTable.columns.forEach(c => newRow[c.id] = "");
          newRows[rowIndex] = newRow;
      }
      newRows[rowIndex] = { ...newRows[rowIndex], [colId]: val };
      const updated = { ...currentTable, rows: newRows, lastModified: Date.now() };
      setCurrentTable(updated);
      saveTable(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]; 
            processImage(base64, file.type);
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.onload = (evt) => {
             const text = evt.target?.result as string;
             const table = parseCSV(text, file.name);
             setCurrentTable(table);
             setView('editor');
          }
          reader.readAsText(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative font-sans text-slate-900">
      
      <DebugConsole logs={logs} isOpen={showConsole} onClose={() => setShowConsole(false)} />

      {/* Global (Home-only) floating controls - Moved inside conditional views below to avoid Editor overlap */}

      {view === 'history' ? (
        <History onSelect={(t) => { setCurrentTable(t); setView('editor'); }} onBack={() => setView('home')} />
      ) : view === 'editor' && currentTable ? (
        <div className="h-screen flex flex-col bg-slate-50">
          <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center shadow-sm sticky top-0 z-20 gap-4">
            {/* Left Section: Back & Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full flex-shrink-0">
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <input 
                  value={currentTable.name} 
                  onChange={(e) => setCurrentTable({...currentTable, name: e.target.value})}
                  className="font-bold text-slate-800 bg-transparent focus:bg-slate-100 outline-none rounded px-1 w-full truncate text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Right Section: All controls integrated */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
               <button 
                 onClick={() => setShowConsole(!showConsole)}
                 className={`p-2 rounded-full transition-colors ${showConsole ? 'bg-slate-800 text-green-400' : 'text-slate-600 hover:bg-slate-100'}`}
                 title="System Log"
               >
                 <Terminal size={18} />
               </button>

               <button 
                  onClick={() => setShowWorkflowWizard(true)} 
                  className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full border border-purple-100"
                  title="Pipeline"
               >
                 <Sparkles size={18} />
               </button>

               <button 
                  onClick={() => setShowColumnSettings(true)} 
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"
                  title="Settings"
               >
                 <Settings size={18} />
               </button>

               <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

               <div className="flex bg-slate-100 rounded-full p-0.5 border border-slate-200">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                  >EN</button>
                  <button 
                    onClick={() => setLanguage('ru')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${language === 'ru' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                  >RU</button>
               </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto relative">
             <div className="min-w-full inline-block align-middle pb-24">
               <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
                 <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                   <tr>
                     <th className="w-12 px-3 py-3 text-left text-xs font-medium text-slate-400 bg-slate-50 sticky left-0 border-r">#</th>
                     {currentTable.columns.map(col => (
                       <th key={col.id} className="px-3 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider min-w-[120px]">
                         {col.label}
                       </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-200">
                   {currentTable.rows.map((row, rIdx) => (
                     <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="px-3 py-4 text-xs text-slate-400 sticky left-0 bg-inherit border-r font-mono">
                            {rIdx + 1}
                        </td>
                        {currentTable.columns.map(col => (
                          <td key={`${rIdx}-${col.id}`} className="px-0 py-0">
                            <input 
                              type="text" 
                              value={String(row[col.id] ?? '')}
                              onChange={(e) => handleManualCellChange(rIdx, col.id, e.target.value)}
                              className="w-full h-full px-3 py-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
                            />
                          </td>
                        ))}
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="p-8 flex justify-center items-center opacity-50 hover:opacity-100 cursor-pointer border-t border-dashed"
                    onClick={() => {
                        const newRow: any = {};
                        currentTable.columns.forEach(c => newRow[c.id] = "");
                        setCurrentTable({...currentTable, rows: [...currentTable.rows, newRow]})
                    }}>
                    <Plus size={24} className="text-slate-400" />
               </div>
            </div>
          </div>

          {!activeWorkflow && !showCamera && (
            <VoiceControl 
                tableData={currentTable}
                language={language}
                onUpdate={handleVoiceUpdate} 
                status={status}
                setStatus={(s) => {
                    setStatus(s);
                    if (s === AppStatus.IDLE) setFeedback(null);
                }}
            />
          )}

          {showColumnSettings && (
              <ColumnSettings 
                  table={currentTable} 
                  onSave={(cols) => {
                      const updated = {...currentTable, columns: cols};
                      setCurrentTable(updated);
                      saveTable(updated);
                      setShowColumnSettings(false);
                  }} 
                  onClose={() => setShowColumnSettings(false)} 
              />
          )}

          {showWorkflowWizard && (
             <WorkflowWizard 
                table={currentTable}
                language={language}
                onSaveAndStart={handleSaveWorkflow} 
                onClose={() => setShowWorkflowWizard(false)} 
             />
          )}

          {activeWorkflow && (
              <GuidedSession 
                  plan={activeWorkflow}
                  language={language}
                  onValueReceived={handleGuidedValue}
                  onClose={() => setActiveWorkflow(null)}
                  log={(msg) => log(msg)}
              />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full justify-center relative">
            
            {/* Top Bar for Home View */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
                <button 
                  onClick={() => setShowConsole(!showConsole)}
                  className={`p-2.5 rounded-full shadow-sm border border-slate-200 transition-colors ${showConsole ? 'bg-slate-800 text-green-400 border-slate-800' : 'bg-white text-slate-500 hover:text-blue-600'}`}
                >
                    <Terminal size={18} />
                </button>
                <div className="flex bg-white rounded-full shadow-sm p-1 border border-slate-200">
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                    >EN</button>
                    <button 
                      onClick={() => setLanguage('ru')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${language === 'ru' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                    >RU</button>
                </div>
            </div>

            {status === AppStatus.PROCESSING && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl">
                <div className="flex flex-col items-center p-6 text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{t.processing}</h3>
                </div>
              </div>
            )}

            <div className="mb-12 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-blue-200 shadow-xl mb-6 transform rotate-3">
                    <Table className="text-white w-10 h-10" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">VoiceTable AI</h1>
                <p className="text-slate-500">
                    {language === 'ru' ? "Умные таблицы с голосовым управлением" : "Create spreadsheets with voice or camera"}
                </p>
            </div>

            <div className="grid gap-4 w-full">
                <button onClick={() => setShowSourceModal(true)} className="group relative flex items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all active:scale-95 text-left">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Camera size={24} /></div>
                    <div><h3 className="font-bold text-slate-800">{t.scanTable}</h3><p className="text-xs text-slate-400">{t.scanDesc}</p></div>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="group relative flex items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all active:scale-95 text-left">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><FileUp size={24} /></div>
                    <div><h3 className="font-bold text-slate-800">{t.uploadFile}</h3><p className="text-xs text-slate-400">{t.uploadDesc}</p></div>
                    <input type="file" accept="image/*,.csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </button>

                <button onClick={handleCreateNew} className="group relative flex items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 text-left">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mr-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Grid3X3 size={24} /></div>
                    <div><h3 className="font-bold text-slate-800">{t.newTemplate}</h3><p className="text-xs text-slate-400">{t.newDesc}</p></div>
                </button>
            </div>

            <div className="mt-12 text-center">
                 <button onClick={() => setView('history')} className="text-slate-500 hover:text-slate-800 text-sm font-medium underline underline-offset-4">{t.history}</button>
            </div>
        </div>
      )}

      {showCamera && (
        <CameraCapture 
            onCapture={(base64) => processImage(base64, 'image/jpeg')} 
            onClose={() => setShowCamera(false)}
            log={log}
        />
      )}

      {showSourceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-10 fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{language === 'ru' ? "Импорт" : "Import"}</h3>
                    <button onClick={() => setShowSourceModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="grid gap-3">
                    <button onClick={() => { setShowSourceModal(false); setShowCamera(true); }} className="flex items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3"><Camera size={20} /></div>
                        <div><div className="font-semibold text-slate-900">{language === 'ru' ? "Камера" : "Camera"}</div></div>
                    </button>
                    <button onClick={() => imageInputRef.current?.click()} className="flex items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                         <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3"><ImageIcon size={20} /></div>
                         <div><div className="font-semibold text-slate-900">{language === 'ru' ? "Галерея" : "Gallery"}</div></div>
                        <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => processImage((reader.result as string).split(',')[1], file.type);
                                 reader.readAsDataURL(file);
                             }
                        }} />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;