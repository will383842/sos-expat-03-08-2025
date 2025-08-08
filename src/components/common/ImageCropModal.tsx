import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, Check, ZoomIn, AlertCircle, RotateCw } from 'lucide-react';

/**
 * Accessible slider (clavier, tactile), compact & sans dépendance
 */
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (event: Event | null, value: number | number[]) => void;
  disabled?: boolean;
  'aria-label'?: string;
}
const CustomSlider: React.FC<SliderProps> = ({
  value, min, max, step, onChange, disabled = false, 'aria-label': ariaLabel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const percentage = ((value - min) / (max - min)) * 100;

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleFromClientX = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const newValue = min + (pct / 100) * (max - min);
    const stepped = Math.round(newValue / step) * step;
    onChange(null, clamp(stepped));
  }, [min, max, step, onChange]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleFromClientX(e.clientX);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleFromClientX(e.touches[0].clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let next = value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(value + step);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(value - step);
    if (e.key === 'Home') next = min;
    if (e.key === 'End') next = max;
    if (next !== value) {
      e.preventDefault();
      onChange(null, next);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const mm = (e: MouseEvent) => handleFromClientX(e.clientX);
    const mu = () => setIsDragging(false);
    const tm = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      handleFromClientX(e.touches[0].clientX);
    };
    const tu = () => setIsDragging(false);

    document.addEventListener('mousemove', mm, { passive: true });
    document.addEventListener('mouseup', mu, { passive: true });
    document.addEventListener('touchmove', tm, { passive: false });
    document.addEventListener('touchend', tu, { passive: true });
    return () => {
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      document.removeEventListener('touchmove', tm);
      document.removeEventListener('touchend', tu);
    };
  }, [isDragging, handleFromClientX]);

  return (
    <div className="flex-1">
      <div
        ref={sliderRef}
        className={`relative h-2 bg-gray-300 rounded-full cursor-pointer touch-manipulation ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(2))}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
      >
        <div className="absolute h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
        <div
          className={`absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full shadow-md transform -translate-y-1/2 top-1/2 transition-all ${
            isDragging ? 'scale-110 shadow-lg' : 'hover:scale-105'
          } ${disabled ? 'border-gray-400 bg-gray-200' : ''}`}
          style={{ left: `calc(${percentage}% - 12px)` }}
        />
      </div>
    </div>
  );
};

// ===========================
// ImageCropModal
// ===========================
type Locale = 'fr' | 'en';

const I18N = {
  fr: {
    title: "Recadrer l'image",
    hint: "Glissez l'image pour la repositionner. Utilisez les contrôles pour ajuster.",
    preview: 'Aperçu :',
    finalSize: 'Taille finale :',
    quality: 'Format optimisé, haute qualité',
    zoom: 'Zoom',
    rotate: 'Rotation 90°',
    cancel: 'Annuler',
    validate: 'Valider',
    processing: 'Traitement...',
    altToCrop: 'À recadrer',
    altPreview: 'Aperçu recadrage',
  },
  en: {
    title: 'Crop image',
    hint: 'Drag the image to reposition. Use controls to adjust.',
    preview: 'Preview:',
    finalSize: 'Final size:',
    quality: 'Optimized format, high quality',
    zoom: 'Zoom',
    rotate: 'Rotate 90°',
    cancel: 'Cancel',
    validate: 'Apply',
    processing: 'Processing...',
    altToCrop: 'Image to crop',
    altPreview: 'Crop preview',
  },
} as const;

interface ImageCropModalProps {
  imageUrl: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  cropShape?: 'rect' | 'round';
  /** outputSize = width in px; height is computed from aspectRatio */
  outputSize?: number;
  /** width/height (e.g., 1 for square, 4/3, 3/4, 16/9, etc.) */
  aspectRatio?: number;
  isOpen: boolean;
  locale?: Locale;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  cropShape = 'rect',
  outputSize = 512,
  aspectRatio = 1,
  isOpen,
  locale = 'fr',
}) => {
  const t = I18N[locale];

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const CROP_BASE = useMemo(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 160 : 220), []);
  // compute crop width/height from aspect ratio (width/height)
  const CROP_W = useMemo(() => CROP_BASE, [CROP_BASE]);
  const CROP_H = useMemo(() => Math.round(CROP_BASE / (aspectRatio || 1)), [CROP_BASE, aspectRatio]);

  const CONTAINER_HEIGHT = useMemo(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 360 : 420), []);

  const getOptimalImageDimensions = useCallback(() => {
    if (!containerRef.current || !isImageLoaded) return null;

    const container = containerRef.current.getBoundingClientRect();
    const containerWidth = container.width;
    const containerHeight = container.height;

    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    const minW = Math.max(CROP_W * 1.5, containerWidth * 0.6);
    const minH = Math.max(CROP_H * 1.5, containerHeight * 0.6);

    let optimalWidth: number;
    let optimalHeight: number;

    if (imageAspect >= 1) {
      optimalWidth = minW;
      optimalHeight = optimalWidth / imageAspect;
      if (optimalHeight < minH) {
        optimalHeight = minH;
        optimalWidth = optimalHeight * imageAspect;
      }
    } else {
      optimalHeight = minH;
      optimalWidth = optimalHeight * imageAspect;
      if (optimalWidth < minW) {
        optimalWidth = minW;
        optimalHeight = optimalWidth / imageAspect;
      }
    }

    const calculatedScale = optimalWidth / imageNaturalSize.width;
    const centerX = (containerWidth - optimalWidth) / 2;
    const centerY = (containerHeight - optimalHeight) / 2;

    return { width: optimalWidth, height: optimalHeight, scale: calculatedScale, x: centerX, y: centerY };
  }, [imageNaturalSize, isImageLoaded, CROP_W, CROP_H]);

  const initializeImage = useCallback(() => {
    const dims = getOptimalImageDimensions();
    if (!dims) return;
    setScale(dims.scale);
    setPosition({ x: dims.x, y: dims.y });
    setIsInitialized(true);
  }, [getOptimalImageDimensions]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsImageLoaded(true);
  }, []);

  useEffect(() => {
    if (isImageLoaded && !isInitialized) {
      const timer = setTimeout(initializeImage, 40);
      return () => clearTimeout(timer);
    }
  }, [isImageLoaded, isInitialized, initializeImage]);

  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsImageLoaded(false);
      setIsInitialized(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setPreviewUrl(null);
    }
  }, [imageUrl, isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isProcessing) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isProcessing) return;
    setIsDragging(true);
    const t = e.touches[0];
    dragStartPos.current = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStartPos.current.x;
    const dy = t.clientY - dragStartPos.current.y;
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStartPos.current = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  }, [isDragging]);
  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleScaleChange = useCallback((newScale: number) => {
    if (!containerRef.current || !isImageLoaded) return;
    const container = containerRef.current.getBoundingClientRect();
    const centerX = container.width / 2;
    const centerY = container.height / 2;

    const newW = imageNaturalSize.width * newScale;
    const newH = imageNaturalSize.height * newScale;
    const curW = imageNaturalSize.width * scale;
    const curH = imageNaturalSize.height * scale;

    const curCX = position.x + curW / 2;
    const curCY = position.y + curH / 2;
    const ratio = newScale / scale;

    const newCX = centerX + (curCX - centerX) * ratio;
    const newCY = centerY + (curCY - centerY) * ratio;

    setPosition({ x: newCX - newW / 2, y: newCY - newH / 2 });
    setScale(newScale);
  }, [scale, position, imageNaturalSize, isImageLoaded]);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
    setTimeout(() => { if (isImageLoaded) initializeImage(); }, 100);
  }, [initializeImage, isImageLoaded]);

  // generate preview (low cost) respecting aspect ratio
  useEffect(() => {
    if (!imageRef.current || !containerRef.current || !isImageLoaded || !isInitialized) return;

    const run = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const previewW = 120;
      const previewH = Math.max(60, Math.round(previewW / (aspectRatio || 1)));
      canvas.width = previewW;
      canvas.height = previewH;

      const container = containerRef.current!.getBoundingClientRect();
      const cropCenterX = container.width / 2;
      const cropCenterY = container.height / 2;

      const curW = imageNaturalSize.width * scale;
      const curH = imageNaturalSize.height * scale;
      const imgCX = position.x + curW / 2;
      const imgCY = position.y + curH / 2;

      const offX = cropCenterX - imgCX;
      const offY = cropCenterY - imgCY;

      const sScale = 1 / scale;
      const sCropW = CROP_W * sScale;
      const sCropH = CROP_H * sScale;
      const sOffX = offX * sScale;
      const sOffY = offY * sScale;

      const sCX = imageNaturalSize.width / 2;
      const sCY = imageNaturalSize.height / 2;

      const sx = sCX + sOffX - sCropW / 2;
      const sy = sCY + sOffY - sCropH / 2;

      if (rotation !== 0) {
        const tmp = document.createElement('canvas');
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tmp.width = imageNaturalSize.width;
        tmp.height = imageNaturalSize.height;
        tctx.translate(tmp.width / 2, tmp.height / 2);
        tctx.rotate((rotation * Math.PI) / 180);
        tctx.drawImage(imageRef.current!, -tmp.width / 2, -tmp.height / 2);

        ctx.drawImage(tmp, sx, sy, sCropW, sCropH, 0, 0, previewW, previewH);
      } else {
        ctx.drawImage(imageRef.current!, sx, sy, sCropW, sCropH, 0, 0, previewW, previewH);
      }

      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
    };

    const timer = setTimeout(run, 40);
    return () => clearTimeout(timer);
  }, [position, scale, rotation, CROP_W, CROP_H, imageNaturalSize, isImageLoaded, isInitialized, aspectRatio]);

  const handleCrop = async () => {
    if (!imageRef.current || !containerRef.current || !isImageLoaded || !isInitialized) return;
    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const outW = outputSize;
      const outH = Math.max(1, Math.round(outputSize / (aspectRatio || 1)));
      canvas.width = outW;
      canvas.height = outH;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const container = containerRef.current.getBoundingClientRect();
      const cropCenterX = container.width / 2;
      const cropCenterY = container.height / 2;

      const curW = imageNaturalSize.width * scale;
      const curH = imageNaturalSize.height * scale;
      const imgCX = position.x + curW / 2;
      const imgCY = position.y + curH / 2;

      const offX = cropCenterX - imgCX;
      const offY = cropCenterY - imgCY;

      const sScale = 1 / scale;
      const sCropW = CROP_W * sScale;
      const sCropH = CROP_H * sScale;
      const sOffX = offX * sScale;
      const sOffY = offY * sScale;

      const sCX = imageNaturalSize.width / 2;
      const sCY = imageNaturalSize.height / 2;

      const sx = sCX + sOffX - sCropW / 2;
      const sy = sCY + sOffY - sCropH / 2;

      if (rotation !== 0) {
        const tmp = document.createElement('canvas');
        const tctx = tmp.getContext('2d');
        if (!tctx) throw new Error('Temp canvas context not available');
        tmp.width = imageNaturalSize.width;
        tmp.height = imageNaturalSize.height;
        tctx.translate(tmp.width / 2, tmp.height / 2);
        tctx.rotate((rotation * Math.PI) / 180);
        tctx.drawImage(imageRef.current!, -tmp.width / 2, -tmp.height / 2);

        ctx.drawImage(tmp, sx, sy, sCropW, sCropH, 0, 0, outW, outH);
      } else {
        ctx.drawImage(imageRef.current!, sx, sy, sCropW, sCropH, 0, 0, outW, outH);
      }

      canvas.toBlob((blob) => {
        if (blob) onCropComplete(blob);
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);
    } catch (e) {
      console.error('Crop error:', e);
      setIsProcessing(false);
    }
  };

  // close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey, { passive: true });
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{t.title}</h3>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t.cancel}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 bg-blue-50 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {t.hint}
          </div>
        </div>

        <div ref={containerRef} className="relative bg-gray-900 overflow-hidden" style={{ height: `${CONTAINER_HEIGHT}px` }}>
          {(!isImageLoaded || !isInitialized) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <img
            ref={imageRef}
            src={imageUrl}
            alt={t.altToCrop}
            className="absolute block max-w-none"
            style={{
              width: `${imageNaturalSize.width * scale}px`,
              height: `${imageNaturalSize.height * scale}px`,
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              opacity: isInitialized ? 1 : 0,
              transition: isInitialized ? 'none' : 'opacity 0.2s'
            }}
            onLoad={handleImageLoad}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            draggable={false}
          />

          {/* Crop mask */}
          <div
            className="absolute top-1/2 left-1/2 border-2 border-white shadow-lg pointer-events-none z-10"
            style={{
              width: `${CROP_W}px`,
              height: `${CROP_H}px`,
              transform: 'translate(-50%, -50%)',
              borderRadius: cropShape === 'round' ? '9999px' : '12px',
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255,255,255,0.3)`
            }}
            aria-hidden="true"
          />

          {/* Grid helper */}
          {isInitialized && (
            <div
              className="absolute top-1/2 left-1/2 pointer-events-none z-10 opacity-30"
              style={{
                width: `${CROP_W}px`,
                height: `${CROP_H}px`,
                transform: 'translate(-50%, -50%)',
                borderRadius: cropShape === 'round' ? '9999px' : '12px'
              }}
              aria-hidden="true"
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/50" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 bg-gray-50">
          {/* Preview */}
          <div className="flex items-center gap-4 bg-white p-3 rounded-lg border">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">{t.preview}</div>
              <div
                className="border-2 border-gray-300 bg-gray-100 overflow-hidden rounded"
                style={{
                  width: 120,
                  height: Math.max(60, Math.round(120 / (aspectRatio || 1))),
                  borderRadius: cropShape === 'round' ? '9999px' : '8px'
                }}
              >
                {previewUrl && <img src={previewUrl} alt={t.altPreview} className="w-full h-full object-cover" />}
              </div>
            </div>
            <div className="flex-1 text-sm text-gray-600">
              <div className="font-medium text-gray-800 mb-1">{t.finalSize}</div>
              <div className="text-blue-600 font-mono">
                {outputSize} × {Math.max(1, Math.round(outputSize / (aspectRatio || 1)))} px
              </div>
              <div className="text-xs text-gray-500 mt-1">{t.quality}</div>
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn size={18} className="text-gray-600" />
            <CustomSlider
              value={scale}
              min={0.2}
              max={3}
              step={0.05}
              onChange={(_, v) => handleScaleChange(v as number)}
              disabled={!isInitialized || isProcessing}
              aria-label={t.zoom}
            />
            <span className="text-sm text-gray-600 min-w-[3rem] text-right">{Math.round(scale * 100)}%</span>
          </div>

          {/* Rotate */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRotate}
              disabled={isProcessing || !isInitialized}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw size={16} />
              {t.rotate}
            </button>
            <span className="text-sm text-gray-600">{rotation}°</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing || !isInitialized}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.processing}
                </>
              ) : (
                <>
                  <Check size={16} />
                  {t.validate}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
