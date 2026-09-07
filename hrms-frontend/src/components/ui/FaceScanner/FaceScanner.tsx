import { useEffect, useRef, useState } from 'react';
import { ScanFace, CameraOff, X, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../Button/Button';

interface FaceScannerProps {
  onScanComplete: (success: boolean) => void;
  onCancel: () => void;
  label?: string;
}

export function FaceScanner({ onScanComplete, onCancel, label = 'Đang nhận diện khuôn mặt...' }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or error: ", err);
        setHasError(true);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
      <div className="relative w-48 h-48 md:w-64 md:h-64 bg-surface-alt rounded-full overflow-hidden border-4 border-brand-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-alt text-text-muted">
            <CameraOff className="w-10 h-10 mb-2" />
            <span className="text-xs text-center px-4">Không thể mở Camera. Vui lòng cấp quyền.</span>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
          />
        )}
        
        {/* Scanning laser line animation */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-400 shadow-[0_0_15px_3px_rgba(99,102,241,0.8)]"
             style={{ animation: 'scan 2s linear infinite' }}>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ScanFace className="w-16 h-16 md:w-20 md:h-20 text-brand-500/80" />
        </div>
      </div>
      <p className="text-sm font-medium text-brand-600 dark:text-brand-400 animate-pulse flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping"></span>
        {label}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 md:mr-1" /> <span className="hidden md:inline">Hủy</span>
        </Button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(256px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
