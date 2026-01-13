import React, { useState, useEffect } from 'react';
import { TableData, WorkflowPlan, WorkflowStep, Language } from '../types';
import { generateWorkflow } from '../services/geminiService';
import { Play, Sparkles, X, ArrowRight, Loader2, Save, ArrowUp, ArrowDown, Trash2, Edit2, Check, GripVertical, Plus, Copy, Square, CheckSquare } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface WorkflowWizardProps {
  table: TableData;
  language: Language;
  onSaveAndStart: (plan: WorkflowPlan) => void;
  onClose: () => void;
}

const WorkflowWizard: React.FC<WorkflowWizardProps> = ({ table, language, onSaveAndStart, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WorkflowPlan | null>(table.workflowPlan || null);
  
  // Edit State
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editRowIndex, setEditRowIndex] = useState<string>('');
  const [editColumnId, setEditColumnId] = useState<string>('');

  // Drag State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Selection State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const t = TRANSLATIONS[language];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const generatedPlan = await generateWorkflow(table, language);
      setPlan(generatedPlan);
      setSelectedIndices(new Set());
    } catch (e) {
      console.error(e);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteStep = (index: number) => {
    if (!plan) return;
    const newSteps = plan.steps.filter((_, i) => i !== index);
    setPlan({ ...plan, steps: newSteps });
    
    // Adjust selection indices if needed, or just clear for simplicity
    setSelectedIndices(new Set());
  };

  const startEditing = (step: WorkflowStep, idx: number) => {
      // Ensure ID exists
      const id = step.id || `step_${idx}_${Date.now()}`;
      setEditingStepId(id);
      setEditInstruction(step.instruction);
      setEditRowIndex(String(step.targetRowIndex + 1)); // Display 1-based index
      setEditColumnId(step.targetColumnId);
  };

  const saveStepEdit = (index: number) => {
      if(!plan) return;
      const newSteps = [...plan.steps];
      
      const parsedRow = parseInt(editRowIndex);
      const targetRowIndex = isNaN(parsedRow) ? 0 : Math.max(0, parsedRow - 1); // Back to 0-based

      newSteps[index] = { 
          ...newSteps[index], 
          instruction: editInstruction,
          targetRowIndex,
          targetColumnId: editColumnId
      };
      setPlan({ ...plan, steps: newSteps });
      setEditingStepId(null);
  };

  const addNewStep = () => {
    if (!plan) return;
    
    // Default to last step's row or 0
    const lastStep = plan.steps[plan.steps.length - 1];
    const defaultRow = lastStep ? lastStep.targetRowIndex : 0;
    
    const newStep: WorkflowStep = {
        id: `manual_${Date.now()}`,
        instruction: language === 'ru' ? 'Новый шаг' : 'New Step',
        targetRowIndex: defaultRow,
        targetColumnId: table.columns[0]?.id || 'col_0',
        expectedType: 'text'
    };

    setPlan({
        ...plan,
        steps: [...plan.steps, newStep]
    });
  };

  const toggleSelection = (index: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      setSelectedIndices(newSet);
  };

  const duplicateSelected = () => {
      if (!plan || selectedIndices.size === 0) return;
      
      const indices = Array.from(selectedIndices).sort((a: number, b: number) => a - b);
      const selectedSteps = indices.map(i => plan.steps[i]);
      
      // Calculate smart offset
      const rows = selectedSteps.map(s => s.targetRowIndex);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      // Logic: if block is 1 row tall, offset is 1. If block is rows 3,4 (height 2), offset is 2.
      const offset = (maxRow - minRow) + 1 || 1; 

      const newSteps = selectedSteps.map(step => ({
          ...step,
          id: `copy_${Date.now()}_${Math.random()}`,
          targetRowIndex: step.targetRowIndex + offset,
      }));
      
      setPlan({
          ...plan,
          steps: [...plan.steps, ...newSteps]
      });
      setSelectedIndices(new Set());
  };

  const deleteSelected = () => {
      if (!plan || selectedIndices.size === 0) return;
      const newSteps = plan.steps.filter((_, i) => !selectedIndices.has(i));
      setPlan({ ...plan, steps: newSteps });
      setSelectedIndices(new Set());
  };

  // Drag Handlers
  const onDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIdx(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); 
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (!plan || draggedIdx === null) return;
      
      const newSteps = [...plan.steps];
      const [movedItem] = newSteps.splice(draggedIdx, 1);
      newSteps.splice(dropIndex, 0, movedItem);
      
      setPlan({ ...plan, steps: newSteps });
      setDraggedIdx(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-purple-600" />
              {t.guideTitle}
            </h2>
            <p className="text-slate-500 mt-1">
              {plan ? t.editPipeline : t.guideDesc}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {!plan ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{t.genButton}</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                {language === 'ru' 
                 ? "AI проанализирует структуру таблицы и предложит оптимальный маршрут обхода ячеек для голосового заполнения."
                 : "AI will analyze the table structure and suggest an optimal walking path for voice entry."}
              </p>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center gap-3 mx-auto"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {loading ? t.processing : t.genButton}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-1">
                    {language === 'ru' ? "Стратегия" : "Strategy"}
                </h4>
                <p className="text-blue-900 text-sm">{plan.description}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <span>{language === 'ru' ? `Шаги (${plan.steps.length})` : `Steps (${plan.steps.length})`}</span>
                    {selectedIndices.size > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {selectedIndices.size} selected
                        </span>
                    )}
                    </h4>
                    
                    {selectedIndices.size > 0 ? (
                        <div className="flex gap-2">
                             <button 
                                onClick={duplicateSelected}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium flex items-center gap-1 transition-colors"
                            >
                                <Copy size={14} /> Duplicate
                            </button>
                            <button 
                                onClick={deleteSelected}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium flex items-center gap-1 transition-colors"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                        >
                            <Sparkles size={14} /> {language === 'ru' ? "Пересоздать" : "Regenerate"}
                        </button>
                    )}
                </div>
                
                <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                   {plan.steps.map((step, idx) => {
                     const stepId = step.id || `step_${idx}`;
                     const isEditing = editingStepId === stepId; 
                     const isSelected = selectedIndices.has(idx);
                     
                     return (
                     <div 
                        key={idx} 
                        draggable={!isEditing}
                        onDragStart={(e) => onDragStart(e, idx)}
                        onDragOver={(e) => onDragOver(e, idx)}
                        onDrop={(e) => onDrop(e, idx)}
                        className={`flex items-start gap-3 p-3 border-b last:border-0 group transition-colors 
                            ${draggedIdx === idx ? 'bg-slate-100 opacity-50' : isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                     >
                        <div className="pt-2 flex items-center gap-2">
                             <button 
                                onClick={() => toggleSelection(idx)} 
                                className={`text-slate-300 hover:text-blue-500 ${isSelected ? 'text-blue-500' : ''}`}
                             >
                                 {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                             </button>
                             <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                <GripVertical size={16} />
                             </div>
                        </div>
                        
                        <div className="pt-1">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                              <div className="flex flex-col gap-2 w-full bg-white p-2 rounded border border-blue-100 shadow-sm">
                                  <input 
                                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editInstruction}
                                    onChange={(e) => setEditInstruction(e.target.value)}
                                    placeholder="Instruction text..."
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                     <select 
                                        value={editColumnId} 
                                        onChange={(e) => setEditColumnId(e.target.value)}
                                        className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                     >
                                         {table.columns.map(c => (
                                             <option key={c.id} value={c.id}>{c.label}</option>
                                         ))}
                                     </select>
                                     <div className="flex items-center gap-1 w-20 flex-shrink-0">
                                         <span className="text-xs text-slate-500">Row:</span>
                                         <input 
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={editRowIndex}
                                            type="number"
                                            onChange={(e) => setEditRowIndex(e.target.value)}
                                          />
                                     </div>
                                     <button onClick={() => saveStepEdit(idx)} className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded flex-shrink-0 transition-colors"><Check size={16} /></button>
                                  </div>
                              </div>
                          ) : (
                              <div onClick={() => startEditing(step, idx)} className="cursor-pointer py-1">
                                <p className="font-medium text-slate-800 text-sm">{step.instruction}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Row {step.targetRowIndex + 1} • <span className="text-blue-600/70">{table.columns.find(c => c.id === step.targetColumnId)?.label || step.targetColumnId}</span>
                                </p>
                              </div>
                          )}
                        </div>

                        <div className={`flex items-center gap-1 transition-opacity self-center ${isEditing ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button onClick={() => startEditing(step, idx)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteStep(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                            </button>
                        </div>
                     </div>
                   );})}

                   {/* Add Step Button */}
                   <button 
                      onClick={addNewStep}
                      className="w-full py-3 flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors font-medium text-sm border-t border-dashed border-slate-200"
                   >
                       <Plus size={16} />
                       {language === 'ru' ? "Добавить шаг" : "Add Step"}
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {plan && (
          <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center">
             <div className="text-xs text-slate-400">
                 {plan.steps.length} {language === 'ru' ? "шагов" : "steps"}
             </div>
            <button 
              onClick={() => onSaveAndStart(plan)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={18} />
              {t.savePipeline}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowWizard;