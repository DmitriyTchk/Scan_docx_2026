import React, { useEffect, useState, useRef } from 'react';
import { WorkflowPlan, AppStatus, Language } from '../types';
import { Mic, Check, X, SkipForward, StopCircle } from 'lucide-react';

interface GuidedSessionProps {
  plan: WorkflowPlan;
  language: Language;
  onValueReceived: (rowIndex: number, colId: string, value: string) => void;
  onClose: () => void;
  log: (msg: string) => void;
}

const GuidedSession: React.FC<GuidedSessionProps> = ({ plan, language, onValueReceived, onClose, log }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const currentStep = plan.steps[currentStepIndex];

  // Initialize Speech
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript;
        }
        setTranscript(interim);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        handleResult(transcript);
      };
    }
  }, [currentStepIndex, transcript, language]);

  const handleResult = (text: string) => {
    const cleanText = text.trim().toLowerCase();
    if (!cleanText) return;

    log(`User said: "${cleanText}"`);

    // Basic Command Recognition (Localized)
    const stopWords = language === 'ru' ? ['стоп', 'выход', 'хватит'] : ['stop', 'exit'];
    const nextWords = language === 'ru' ? ['дальше', 'пропустить', 'скип'] : ['skip', 'next'];

    if (stopWords.some(w => cleanText.includes(w))) {
        onClose();
        return;
    }
    if (nextWords.some(w => cleanText.includes(w))) {
        nextStep();
        return;
    }

    // Capture value
    let value = cleanText;
    // Basic number cleanup
    if (currentStep.expectedType === 'number') {
        // Replace comma with dot for Russian numbers if needed, though usually regex handles it
        const norm = cleanText.replace(',', '.'); 
        const match = norm.match(/-?\d+(\.\d+)?/);
        if (match) value = match[0];
    }

    onValueReceived(currentStep.targetRowIndex, currentStep.targetColumnId, value);
    nextStep();
  };

  const nextStep = () => {
    if (currentStepIndex < plan.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        setTranscript('');
    } else {
        alert(language === 'ru' ? "Маршрут завершен!" : "Workflow Complete!");
        onClose();
    }
  };

  const toggleMic = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  // TTS Effect
  useEffect(() => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(currentStep.instruction);
          utterance.lang = language === 'ru' ? 'ru-RU' : 'en-US';
          window.speechSynthesis.speak(utterance);
      }
  }, [currentStepIndex, language]);

  if (!currentStep) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 bg-slate-900 text-white rounded-t-3xl z-50 shadow-2xl transition-transform transform translate-y-0 safe-area-pb">
      <div className="w-full bg-slate-800 h-1">
        <div 
            className="bg-green-500 h-1 transition-all duration-300" 
            style={{ width: `${((currentStepIndex + 1) / plan.steps.length) * 100}%` }} 
        />
      </div>

      <div className="p-6 pb-12 max-w-lg mx-auto">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    {language === 'ru' ? "Шаг" : "Step"} {currentStepIndex + 1} / {plan.steps.length}
                </h3>
                <h2 className="text-2xl font-bold text-white leading-tight">
                    {currentStep.instruction}
                </h2>
            </div>
            <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20">
                <X size={20} />
            </button>
        </div>

        {transcript && (
            <div className="bg-black/50 p-3 rounded-lg mb-6 text-center text-green-300 font-mono">
                "{transcript}"
            </div>
        )}

        <div className="flex items-center justify-between gap-4">
            <button 
                onClick={() => nextStep()}
                className="flex-1 py-4 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 flex flex-col items-center gap-1"
            >
                <SkipForward size={24} />
                <span className="text-xs">{language === 'ru' ? "Пропустить" : "Skip"}</span>
            </button>

            <button 
                onClick={toggleMic}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isListening ? 'bg-red-500 animate-pulse' : 'bg-green-600 hover:bg-green-500'
                }`}
            >
                {isListening ? <StopCircle size={32} /> : <Mic size={32} />}
            </button>

            <button 
                onClick={() => handleResult(transcript)}
                className="flex-1 py-4 bg-slate-800 rounded-xl font-medium text-slate-300 hover:bg-slate-700 flex flex-col items-center gap-1"
            >
                <Check size={24} />
                <span className="text-xs">{language === 'ru' ? "Ввод" : "Enter"}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedSession;
