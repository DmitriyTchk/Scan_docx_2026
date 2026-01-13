import React, { useRef, useEffect, useState } from 'react';
import { X, SwitchCamera, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  log: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, log }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopStream = () => {
    // 1. Pause video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    // 2. Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false; // Explicitly disable
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const startCamera = async () => {
      setIsInitializing(true);
      setError(null);
      
      stopStream();

      // Moderate delay to allow OS to release handle
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!isMounted) return;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera API not supported in this browser.");
        setIsInitializing(false);
        return;
      }

      const attemptGetUserMedia = async (constraints: MediaStreamConstraints, label: string) => {
          try {
              log(`Trying: ${label}`, 'info');
              return await navigator.mediaDevices.getUserMedia(constraints);
          } catch (e: any) {
              console.warn(`${label} failed:`, e.name);
              // Hardware busy or generic abort usually means OS lock
              if (e.name === 'NotReadableError' || e.name === 'TrackStartError' || e.name === 'AbortError') {
                  throw e; 
              }
              return null; // Just a constraint mismatch, try next
          }
      };

      try {
        let stream: MediaStream | null = null;

        // Strategy 1: Ideal 1080p
        if (!stream) {
            try {
                stream = await attemptGetUserMedia({
                    video: { 
                        facingMode: useBackCamera ? 'environment' : 'user',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                }, "1080p Preference");
            } catch (e) { /* ignore */ }
        }

        // Strategy 2: Basic Preference
        if (!stream) {
             try {
                stream = await attemptGetUserMedia({
                    video: { 
                        facingMode: useBackCamera ? 'environment' : 'user'
                    }
                }, "Basic Preference");
            } catch (e: any) {
                if (e.name === 'NotReadableError') throw e;
            }
        }

        // Strategy 3: Fallback
        if (!stream) {
             try {
                stream = await attemptGetUserMedia({ video: true }, "Fallback Any");
             } catch (e: any) {
                throw e; 
             }
        }

        if (!isMounted) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.load(); 
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.warn("Play error:", playErr);
            }
        }
        log("Camera active.", 'success');

      } catch (err: any) {
        console.error("Camera Start Error:", err);
        
        const isHardwareBusy = err.name === 'NotReadableError' || err.name === 'TrackStartError';

        // Retry logic for transient locks
        if (isHardwareBusy && retryCount < MAX_RETRIES) {
            log(`System busy (${err.name}). Retrying...`, 'info');
            retryCount++;
            await new Promise(r => setTimeout(r, 1500));
            if (isMounted) return startCamera();
        }

        // Final Error Messaging
        let userMsg = "Failed to start camera.";
        let detailedMsg = "";

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMsg = "Permission denied.";
            detailedMsg = "Please allow camera access in your browser/device settings.";
        } else if (isHardwareBusy) {
            // Explicit instruction for OS-level locks
            userMsg = "Camera System Lock Detected";
            detailedMsg = "The camera is blocked by the OS or another app. Please close other apps, check Antivirus/Privacy settings, or restart your device.";
        } else if (err.name === 'NotFoundError') {
            userMsg = "No camera found.";
            detailedMsg = "Please ensure a camera is connected.";
        } else {
            detailedMsg = err.message || "Unknown error occurred.";
        }
        
        if (isMounted) {
            setError(userMsg + "::" + detailedMsg); // Separator for UI formatting
            log(`Error: ${userMsg}`, 'error');
        }
      } finally {
          if (isMounted) setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [useBackCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      log("Capturing...", 'info');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState < 2 || video.videoWidth === 0) {
          return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const base64 = dataUrl.split(',')[1];
            onCapture(base64);
        } catch (e) {
            log("Encoding failed", 'error');
        }
      }
    }
  };

  const [errTitle, errDetail] = error ? error.split("::") : ["Error", ""];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isInitializing && !error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                <Loader2 className="text-white w-10 h-10 animate-spin" />
            </div>
        )}
        
        {error ? (
           <div className="text-white text-center p-6 max-w-sm bg-slate-900 rounded-xl mx-4 z-30 shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
             <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
             <h3 className="text-xl font-bold mb-2 text-red-100">{errTitle}</h3>
             <p className="mb-6 text-slate-300 text-sm leading-relaxed">{errDetail || error}</p>
             
             <div className="flex flex-col gap-3">
                 <button 
                    onClick={() => { setError(null); setIsInitializing(true); setUseBackCamera(!useBackCamera); }}
                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
                 >
                    <RefreshCw size={18} /> Retry / Switch Cam
                 </button>
                 <button 
                    onClick={onClose} 
                    className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white transition-colors"
                 >
                    Close
                 </button>
             </div>
           </div>
        ) : (
           <video 
             ref={videoRef} 
             autoPlay 
             playsInline 
             muted
             className="absolute inset-0 w-full h-full object-cover"
           />
        )}
        
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full z-40 hover:bg-black/60 backdrop-blur-md transition-all"
        >
            <X size={24} />
        </button>
      </div>

      {!error && (
          <div className="bg-slate-900 p-8 flex justify-between items-center pb-10 safe-area-pb z-40">
             <div className="w-12"></div> 
             
             <button 
               onClick={handleCapture}
               disabled={isInitializing}
               className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all duration-200 active:scale-95 ${isInitializing ? 'opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'}`}
             >
               <div className="w-16 h-16 bg-white rounded-full shadow-inner" />
             </button>

             <button 
               onClick={() => setUseBackCamera(!useBackCamera)}
               disabled={isInitializing}
               className="p-4 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
             >
               <SwitchCamera size={28} />
             </button>
          </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;