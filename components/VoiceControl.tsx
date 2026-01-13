import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, StopCircle } from 'lucide-react';
import { parseVoiceCommand } from '../services/geminiService';
import { TableData, VoiceUpdateResult, AppStatus, Language } from '../types';

interface VoiceControlProps {
  tableData: TableData;
  language: Language;
  onUpdate: (result: VoiceUpdateResult) => void;
  setStatus: (status: AppStatus) => void;
  status: AppStatus;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ tableData, language, onUpdate, setStatus, status }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus(AppStatus.LISTENING);
        setTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Error", event.error);
        setIsListening(false);
        setStatus(AppStatus.ERROR);
      };

      // We handle processing in onEnd logic via the second useEffect or careful closure handling.
      // Here we rely on the useEffect below to watch [transcript, isListening] changes or explicit stop.
      recognitionRef.current.onend = () => {
          setIsListening(false);
      }
    }
  }, [language]); // Re-init on language change

  // Separate effect to trigger processing when listening stops and we have text
  useEffect(() => {
      if (!isListening && transcript && status === AppStatus.LISTENING) {
          const process = async () => {
             setStatus(AppStatus.PROCESSING);
             try {
                const updates = await parseVoiceCommand(
                    transcript, 
                    tableData.columns, 
                    tableData.rows.length,
                    language
                );
                onUpdate(updates);
                setStatus(AppStatus.SUCCESS);
                setTranscript('');
                setTimeout(() => setStatus(AppStatus.IDLE), 2000);
             } catch (error) {
                console.error(error);
                setStatus(AppStatus.ERROR);
                setTimeout(() => setStatus(AppStatus.IDLE), 3000);
             }
          };
          process();
      } else if (!isListening && !transcript && status === AppStatus.LISTENING) {
          setStatus(AppStatus.IDLE);
      }
  }, [isListening, transcript, status, tableData, language, onUpdate, setStatus]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Mic start error", e);
      }
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-full px-4">
      {transcript && isListening && (
        <div className="bg-black/75 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm mb-2 max-w-sm text-center shadow-lg">
          "{transcript}"
        </div>
      )}

      {status === AppStatus.PROCESSING && (
         <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm shadow-lg flex items-center gap-2 animate-pulse">
            <Loader2 className="animate-spin" size={16} />
            AI Processing...
         </div>
      )}

      {status === AppStatus.ERROR && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm shadow-lg">
             Error or No Speech Detected
          </div>
      )}

      <button
        onClick={toggleListening}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
          isListening 
            ? 'bg-red-500 ring-4 ring-red-200 animate-pulse' 
            : status === AppStatus.PROCESSING 
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-100'
        }`}
        disabled={status === AppStatus.PROCESSING}
      >
        {isListening ? (
          <StopCircle className="text-white w-8 h-8" />
        ) : (
          <Mic className="text-white w-8 h-8" />
        )}
      </button>
    </div>
  );
};

export default VoiceControl;
