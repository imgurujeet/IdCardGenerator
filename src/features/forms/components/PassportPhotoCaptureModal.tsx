import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  SwitchCamera,
  AlertCircle,
} from 'lucide-react';

interface PassportPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const PassportPhotoCaptureModal: React.FC<PassportPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  // Modes: 'camera' | 'upload' | 'crop'
  const [mode, setMode] = useState<'camera' | 'upload' | 'crop'>('camera');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Raw image source for cropping
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Transform states for cropper
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // degrees
  const [fineRotation, setFineRotation] = useState(0); // -30 to 30 deg
  const [showGuide, setShowGuide] = useState(true);

  // Dragging state for pan
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cropperContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser or switch to "Upload Photo".'
          : 'Could not access camera. Please select "Upload Photo" instead.'
      );
    }
  }, [cameraFacing, stopCameraStream]);

  // Handle mode transitions
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    if (mode === 'camera') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, mode, cameraFacing, startCameraStream, stopCameraStream]);

  // Snap photo from camera
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image so it feels natural
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCameraStream();
    setRawImageSrc(dataUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFineRotation(0);
    setMode('crop');
  };

  // Handle uploaded file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawImageSrc(event.target.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setRotation(0);
        setFineRotation(0);
        setMode('crop');
      }
    };
    reader.readAsDataURL(file);
  };

  // Mouse / Touch handlers for panning within cropper
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Generate final passport photo crop (standard 35mm x 45mm at 300 DPI = 413 x 531 px or 700 x 900 px high-res)
  const handleApplyCrop = async () => {
    if (!rawImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImageSrc;

    await new Promise((res) => {
      img.onload = res;
    });

    const targetWidth = 700;
    const targetHeight = 900; // 35:45 ratio

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // We calculate the scale between container preview and output canvas
    // Cropper preview box is 280 x 360 px (7:9 ratio)
    const previewWidth = 280;
    const scaleRatio = targetWidth / previewWidth;

    ctx.save();
    // Center of canvas
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // Apply pan & zoom & rotation
    const totalAngle = ((rotation + fineRotation) * Math.PI) / 180;
    ctx.rotate(totalAngle);
    ctx.scale(zoom, zoom);

    // Center image in crop frame
    const scaledPanX = pan.x * scaleRatio;
    const scaledPanY = pan.y * scaleRatio;
    ctx.translate(scaledPanX, scaledPanY);

    // Determine base scale to cover preview
    const imgRatio = img.width / img.height;
    const cropRatio = targetWidth / targetHeight;
    let drawW = targetWidth;
    let drawH = targetHeight;
    if (imgRatio > cropRatio) {
      drawH = targetHeight;
      drawW = targetHeight * imgRatio;
    } else {
      drawW = targetWidth;
      drawH = targetWidth / imgRatio;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `passport_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-surface-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-surface-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-bold tracking-tight">Passport Size Photo & Centering</h2>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only shown when not actively cropping) */}
        {mode !== 'crop' && (
          <div className="flex border-b border-surface-200 bg-surface-50 shrink-0">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                mode === 'camera'
                  ? 'border-brand-600 text-brand-700 bg-white'
                  : 'border-transparent text-surface-500 hover:text-surface-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Use Camera & Silhouette</span>
            </button>
            <button
              onClick={() => {
                setMode('upload');
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                mode === 'upload'
                  ? 'border-brand-600 text-brand-700 bg-white'
                  : 'border-transparent text-surface-500 hover:text-surface-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Device</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-y-auto">
          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="w-full flex flex-col items-center space-y-3">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-3 max-w-sm">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <p className="text-xs text-amber-900 font-medium">{cameraError}</p>
                  <button
                    onClick={() => {
                      setMode('upload');
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Select Photo from Gallery
                  </button>
                </div>
              ) : (
                <>
                  {/* Camera Viewport with Silhouette Guide */}
                  <div className="relative w-[280px] h-[360px] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-brand-500">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* Human Head & Shoulders Silhouette Vector Guide */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <svg
                        className="w-full h-full text-brand-400/80 drop-shadow-md"
                        viewBox="0 0 280 360"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Shaded outer vignette mask */}
                        <defs>
                          <mask id="silhouette-mask">
                            <rect width="280" height="360" fill="white" />
                            {/* Head Cutout Oval */}
                            <ellipse cx="140" cy="140" rx="55" ry="72" fill="black" />
                            {/* Torso Cutout */}
                            <path
                              d="M 60 360 C 60 270, 85 220, 140 220 C 195 220, 220 270, 220 360 Z"
                              fill="black"
                            />
                          </mask>
                        </defs>

                        {/* Dark translucent outer area */}
                        <rect width="280" height="360" fill="rgba(0,0,0,0.4)" mask="url(#silhouette-mask)" />

                        {/* Head Outline Oval */}
                        <ellipse
                          cx="140"
                          cy="140"
                          rx="55"
                          ry="72"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                        />

                        {/* Eye-level line */}
                        <line
                          x1="110"
                          y1="130"
                          x2="170"
                          y2="130"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          opacity="0.85"
                        />
                        {/* Nose/Center Vertical line */}
                        <line
                          x1="140"
                          y1="105"
                          x2="140"
                          y2="175"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          opacity="0.6"
                        />

                        {/* Chin Mark */}
                        <path
                          d="M 128 206 C 136 214, 144 214, 152 206"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Shoulders / Upper Torso Arch */}
                        <path
                          d="M 35 360 C 40 265, 80 230, 140 230 C 200 230, 240 265, 245 360"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                        />
                      </svg>

                      {/* Floating Prompt Pill */}
                      <div className="absolute top-3 bg-surface-950/80 backdrop-blur-xs text-white text-[11px] font-medium px-3 py-1 rounded-full border border-white/20 shadow-sm text-center">
                        Align face & eyes in oval guide
                      </div>
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-center gap-4 pt-1 w-full max-w-xs">
                    {/* Switch Front/Rear Camera */}
                    <button
                      type="button"
                      onClick={() => setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
                      className="p-3 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-full border border-surface-300 transition-colors shadow-xs"
                      title="Switch Camera (Front / Rear)"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>

                    {/* Shutter Button */}
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-brand-500/25 transition-all transform active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* UPLOAD MODE FALLBACK VIEW */}
          {mode === 'upload' && (
            <div className="w-full flex flex-col items-center space-y-4 py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs h-56 border-2 border-dashed border-brand-400 hover:border-brand-600 bg-brand-50/50 hover:bg-brand-50 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-brand-950 mb-1">Click to select portrait photo</p>
                <p className="text-[11px] text-surface-500">Supports JPG, PNG, WebP up to 15MB</p>
              </div>

              <button
                type="button"
                onClick={() => setMode('camera')}
                className="text-xs font-semibold text-brand-700 hover:underline flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Or use live camera instead</span>
              </button>
            </div>
          )}

          {/* CROPPER / ADJUSTMENT MODE */}
          {mode === 'crop' && rawImageSrc && (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* Cropper Viewport */}
              <div
                ref={cropperContainerRef}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 1) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handlePointerUp}
                className="relative w-[280px] h-[360px] bg-surface-900 rounded-2xl overflow-hidden shadow-xl border-2 border-brand-500 cursor-grab active:cursor-grabbing select-none"
              >
                {/* Rotated & Panned Image */}
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation + fineRotation}deg)`,
                    transformOrigin: 'center center',
                    transition: isDraggingRef.current ? 'none' : 'transform 0.05s ease-out',
                  }}
                >
                  <img
                    src={rawImageSrc}
                    alt="Crop preview"
                    className="max-w-none w-full h-full object-cover"
                    draggable={false}
                  />
                </div>

                {/* Passport Standard Silhouette / Face Overlay (Toggleable) */}
                {showGuide && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <svg
                      className="w-full h-full text-brand-400 drop-shadow-md"
                      viewBox="0 0 280 360"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Outer boundary shadow */}
                      <rect width="280" height="360" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />

                      {/* Head guide oval */}
                      <ellipse
                        cx="140"
                        cy="140"
                        rx="55"
                        ry="72"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Eye-level line */}
                      <line
                        x1="110"
                        y1="130"
                        x2="170"
                        y2="130"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />

                      {/* Chin Arc */}
                      <path
                        d="M 125 210 C 135 218, 145 218, 155 210"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />

                      {/* Shoulders Arch */}
                      <path
                        d="M 35 360 C 40 270, 80 235, 140 235 C 200 235, 240 270, 245 360"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    </svg>

                    <div className="absolute top-2.5 bg-surface-950/75 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      Drag to center • 35×45mm Passport
                    </div>
                  </div>
                )}
              </div>

              {/* Cropper Controls & Sliders */}
              <div className="w-full max-w-sm space-y-2.5 text-xs bg-surface-50 p-3 rounded-xl border border-surface-200">
                {/* Zoom Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-surface-600 w-12 shrink-0">Zoom:</span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                    className="p-1 rounded hover:bg-surface-200 text-surface-600"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-brand-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                    className="p-1 rounded hover:bg-surface-200 text-surface-600"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-surface-500 w-10 text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                {/* Rotate Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-200 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="px-2.5 py-1 bg-white hover:bg-surface-100 border border-surface-300 rounded font-medium flex items-center gap-1 text-surface-700"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                        setRotation(0);
                        setFineRotation(0);
                      }}
                      className="px-2 py-1 bg-white hover:bg-surface-100 border border-surface-300 rounded text-surface-600"
                      title="Reset Position"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-surface-600">
                    <input
                      type="checkbox"
                      checked={showGuide}
                      onChange={(e) => setShowGuide(e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span className="text-[10px]">Passport Guide</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between w-full max-w-sm pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('camera');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors"
                >
                  ← Retake
                </button>

                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
