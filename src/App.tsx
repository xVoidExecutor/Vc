import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Monitor, Smartphone, Video,
  Wand2, Image as ImageIcon, Settings,
  Play, Square, Layers, RefreshCw, Upload, AlertCircle
} from 'lucide-react';

type SourceType = 'webcam' | 'screen' | 'phone' | 'file';
type EffectType = 'none' | 'blur' | 'bg-remove' | 'image' | 'grayscale' | 'sepia';

export default function App() {
  const [activeSource, setActiveSource] = useState<SourceType>('webcam');
  const [isVirtualCamActive, setIsVirtualCamActive] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectType>('none');
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'simulated' | 'idle'>('simulated');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, []);

  const requestMediaStream = useCallback(async (source: 'webcam' | 'screen') => {
    stopCurrentStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setStreamStatus('simulated');
      setStatusMessage('Media devices API unavailable in this environment — using live synthetic feed.');
      return;
    }

    setStreamStatus('connecting');
    setStatusMessage(null);

    try {
      let stream: MediaStream;
      if (source === 'webcam') {
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera capture is not supported in this browser.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } else {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen capture is not supported in this browser.');
        }
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      }

      streamRef.current = stream;
      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          setStreamStatus('simulated');
          setStatusMessage('Capture ended — switched back to live synthetic feed.');
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStreamStatus('live');
      setStatusMessage(null);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatusMessage(
          source === 'webcam'
            ? 'Camera access is restricted in this context — running live synthetic studio feed.'
            : 'Screen capture permission was not granted — running live synthetic studio feed.'
        );
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatusMessage('No camera hardware detected — running live synthetic studio feed.');
      } else {
        setStatusMessage('Live capture unavailable here — running live synthetic studio feed.');
      }
      setStreamStatus('simulated');
    }
  }, [stopCurrentStream]);

  // Handle source changes
  useEffect(() => {
    if (activeSource === 'webcam') {
      void requestMediaStream('webcam');
    } else if (activeSource === 'screen') {
      void requestMediaStream('screen');
    } else if (activeSource === 'file') {
      stopCurrentStream();
      if (fileUrl && videoRef.current) {
        videoRef.current.src = fileUrl;
        videoRef.current.loop = true;
        void videoRef.current.play().catch(() => undefined);
        setStreamStatus('live');
        setStatusMessage(null);
      } else {
        setStreamStatus('idle');
        setStatusMessage(null);
      }
    } else {
      stopCurrentStream();
      setStreamStatus('simulated');
      setStatusMessage('Mobile WebRTC pairing preview — running simulated mobile feed.');
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeSource, fileUrl, requestMediaStream, stopCurrentStream]);

  // Revoke object URL when replaced or on unmount
  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setFileUrl(nextUrl);
    setActiveSource('file');
  };

  // Render & effects loop
  useEffect(() => {
    let animationFrameId: number;

    const drawSyntheticFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#18181b');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle studio grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Animated ambient glow
      const cx = width / 2 + Math.sin(time * 0.001) * 40;
      const cy = height * 0.48 + Math.cos(time * 0.0013) * 18;
      const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 280);
      glow.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Stylized subject silhouette
      ctx.save();
      ctx.fillStyle = '#e4e4e7';
      // Shoulders
      ctx.beginPath();
      ctx.ellipse(cx, cy + 175, 130, 95, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(cx, cy + 25, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Overlay badge
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
      const label =
        activeSource === 'phone'
          ? 'MOBILE WEBRTC STREAM (SIMULATED)'
          : activeSource === 'screen'
            ? 'SCREEN CAPTURE PREVIEW (SIMULATED)'
            : 'STUDIO TEST FEED (SYNTHETIC)';
      ctx.fillText(label, 32, height - 32);
    };

    const renderLoop = (time: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const hasLiveVideo =
            streamStatus === 'live' &&
            video &&
            video.readyState >= video.HAVE_CURRENT_DATA &&
            video.videoWidth > 0;

          const width = hasLiveVideo ? video.videoWidth : 1280;
          const height = hasLiveVideo ? video.videoHeight : 720;

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          ctx.save();
          ctx.filter = 'none';
          if (activeEffect === 'blur') ctx.filter = 'blur(10px)';
          if (activeEffect === 'grayscale') ctx.filter = 'grayscale(100%)';
          if (activeEffect === 'sepia') ctx.filter = 'sepia(100%)';

          if (hasLiveVideo) {
            ctx.drawImage(video, 0, 0, width, height);
          } else {
            drawSyntheticFrame(ctx, width, height, time);
          }
          ctx.restore();

          if (activeEffect === 'bg-remove') {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#ecfdf5';
            ctx.font = '600 24px ui-sans-serif, system-ui, sans-serif';
            ctx.fillText('AI Background Removal Active', 32, 48);
          } else if (activeEffect === 'image') {
            ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#eef2ff';
            ctx.font = '600 24px ui-sans-serif, system-ui, sans-serif';
            ctx.fillText('Virtual Studio Backdrop Active', 32, 48);
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeEffect, activeSource, streamStatus]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Left Sidebar - Sources */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Camera className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold tracking-tight">vCamera</h1>
        </div>

        <div className="p-4 flex-1">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Sources</h2>
          <div className="space-y-1">
            <SourceButton
              icon={<Camera size={18} />}
              label="Webcam"
              active={activeSource === 'webcam'}
              onClick={() => setActiveSource('webcam')}
            />
            <SourceButton
              icon={<Monitor size={18} />}
              label="Screen Capture"
              active={activeSource === 'screen'}
              onClick={() => setActiveSource('screen')}
            />
            <SourceButton
              icon={<Smartphone size={18} />}
              label="Mobile Phone"
              active={activeSource === 'phone'}
              onClick={() => setActiveSource('phone')}
            />
            <SourceButton
              icon={<Video size={18} />}
              label="Media File"
              active={activeSource === 'file'}
              onClick={() => setActiveSource('file')}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setStatusMessage('Output profile: 1080p • 60fps • NV12 Shared Memory')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content - Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-md text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              1080p • 60fps
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-md text-sm">
              <span className="text-zinc-400">Latency:</span>
              <span className="text-emerald-400 font-mono">24ms</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsVirtualCamActive(!isVirtualCamActive)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              isVirtualCamActive
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20'
            }`}
          >
            {isVirtualCamActive ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            {isVirtualCamActive ? 'Stop Virtual Camera' : 'Start Virtual Camera'}
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-zinc-950 relative gap-4 overflow-hidden">
          {/* Hidden video element for source */}
          <video ref={videoRef} autoPlay playsInline muted className="hidden" />

          {statusMessage && (
            <div className="w-full max-w-4xl flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
              {(activeSource === 'webcam' || activeSource === 'screen') && (
                <button
                  type="button"
                  onClick={() => void requestMediaStream(activeSource)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium shrink-0 transition-colors"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Canvas for processed output */}
          <div className="relative w-full max-w-4xl aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {activeSource === 'file' && !fileUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-4">
                <Video size={48} className="opacity-50" />
                <p className="text-sm">Select a local video file to stream through the virtual camera</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                >
                  <Upload size={16} />
                  Choose Video File
                </button>
              </div>
            ) : (
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            )}

            {isVirtualCamActive && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-md uppercase tracking-wider shadow-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                Live
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Effects */}
      <div className="w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold flex items-center gap-2">
            <Wand2 size={18} className="text-indigo-400" />
            Effects &amp; Processing
          </h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* AI Background */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers size={14} />
              AI Background
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <EffectCard
                label="None"
                active={activeEffect === 'none'}
                onClick={() => setActiveEffect('none')}
              />
              <EffectCard
                label="Blur"
                active={activeEffect === 'blur'}
                onClick={() => setActiveEffect('blur')}
              />
              <EffectCard
                label="Remove"
                active={activeEffect === 'bg-remove'}
                onClick={() => setActiveEffect('bg-remove')}
                highlight
              />
              <EffectCard
                label="Image"
                active={activeEffect === 'image'}
                onClick={() => setActiveEffect('image')}
              />
            </div>
          </div>

          {/* Color Filters */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ImageIcon size={14} />
              Color Filters
            </h3>
            <div className="space-y-2">
              <FilterRow label="Grayscale" active={activeEffect === 'grayscale'} onClick={() => setActiveEffect('grayscale')} />
              <FilterRow label="Sepia" active={activeEffect === 'sepia'} onClick={() => setActiveEffect('sepia')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-500/10 text-indigo-400'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EffectCard({ label, active, onClick, highlight = false }: { label: string, active: boolean, onClick: () => void, highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg text-sm font-medium border transition-all flex flex-col items-center justify-center gap-2 ${
        active
          ? highlight
            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
            : 'bg-zinc-800 border-zinc-600 text-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  );
}

function FilterRow({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'
      }`}
    >
      {label}
      <div className={`w-4 h-4 rounded-full border ${active ? 'border-indigo-500 border-4' : 'border-zinc-600'}`} />
    </button>
  );
}
