import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, Check, ZoomIn, AlertCircle, RotateCw } from 'lucide-react';

// ===============================================
// CUSTOM SLIDER COMPONENT 
// ===============================================
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
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  'aria-label': ariaLabel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const newValue = min + (percentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    
    onChange(null, Math.max(min, Math.min(max, steppedValue)));
  }, [min, max, step, onChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    const touch = e.touches[0];
    handleMove(touch.clientX);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX);
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleTouchMove, handleTouchEnd]);

  return (
    <div className="flex-1">
      <div
        ref={sliderRef}
        className={`relative h-2 bg-gray-300 rounded-full cursor-pointer touch-manipulation ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
      >
        <div
          className="absolute h-full bg-blue-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
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

// ===============================================
// IMAGE CROP MODAL COMPONENT
// ===============================================
interface ImageCropModalProps {
  imageUrl: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  cropShape?: 'rect' | 'round';
  outputSize?: number;
  isOpen: boolean;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageUrl,
  onCropComplete,
  onCancel,
  cropShape = 'rect',
  outputSize = 512,
  isOpen
}) => {
  // États du composant
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Constantes de configuration
  const CROP_SIZE = useMemo(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 140 : 180;
  }, []);

  const CONTAINER_HEIGHT = useMemo(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 320 : 380;
  }, []);

  // Calcul des dimensions optimales
  const getOptimalImageDimensions = useCallback(() => {
    if (!containerRef.current || !isImageLoaded) return null;

    const container = containerRef.current.getBoundingClientRect();
    const containerWidth = container.width;
    const containerHeight = container.height;
    
    // Calculer le ratio d'aspect de l'image
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    
    // Calculer les dimensions pour s'adapter au conteneur tout en couvrant le crop
    let optimalWidth, optimalHeight;
    
    // Assurer que l'image couvre toujours la zone de crop avec une marge
    const minSizeToFitCrop = CROP_SIZE * 1.5;
    
    if (imageAspect > 1) {
      // Image paysage
      optimalWidth = Math.max(minSizeToFitCrop, containerWidth * 0.6);
      optimalHeight = optimalWidth / imageAspect;
      
      // Si la hauteur est trop petite, ajuster
      if (optimalHeight < minSizeToFitCrop) {
        optimalHeight = minSizeToFitCrop;
        optimalWidth = optimalHeight * imageAspect;
      }
    } else {
      // Image portrait ou carrée
      optimalHeight = Math.max(minSizeToFitCrop, containerHeight * 0.6);
      optimalWidth = optimalHeight * imageAspect;
      
      // Si la largeur est trop petite, ajuster
      if (optimalWidth < minSizeToFitCrop) {
        optimalWidth = minSizeToFitCrop;
        optimalHeight = optimalWidth / imageAspect;
      }
    }
    
    // Calculer le scale correspondant
    const calculatedScale = optimalWidth / imageNaturalSize.width;
    
    // Centrer l'image
    const centerX = (containerWidth - optimalWidth) / 2;
    const centerY = (containerHeight - optimalHeight) / 2;
    
    return {
      width: optimalWidth,
      height: optimalHeight,
      scale: calculatedScale,
      x: centerX,
      y: centerY
    };
  }, [imageNaturalSize, isImageLoaded, CROP_SIZE]);

  // Initialisation de l'image
  const initializeImage = useCallback(() => {
    const dimensions = getOptimalImageDimensions();
    if (!dimensions) return;

    setScale(dimensions.scale);
    setPosition({ x: dimensions.x, y: dimensions.y });
    setIsInitialized(true);
  }, [getOptimalImageDimensions]);

  // Chargement de l'image
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    setImageNaturalSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setIsImageLoaded(true);
  }, []);

  // Effet pour initialiser après chargement
  useEffect(() => {
    if (isImageLoaded && !isInitialized) {
      // Petit délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(initializeImage, 50);
      return () => clearTimeout(timer);
    }
  }, [isImageLoaded, isInitialized, initializeImage]);

  // Reset quand l'image change
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

  // Gestion du drag - Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isProcessing) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Gestion du drag - Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isProcessing) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    e.preventDefault();
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartPos.current.x;
    const deltaY = touch.clientY - dragStartPos.current.y;
    
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    e.preventDefault();
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Gestion du zoom avec conservation du centre
  const handleScaleChange = useCallback((newScale: number) => {
    if (!containerRef.current || !isImageLoaded) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const centerX = container.width / 2;
    const centerY = container.height / 2;
    
    // Calculer les nouvelles dimensions
    const newWidth = imageNaturalSize.width * newScale;
    const newHeight = imageNaturalSize.height * newScale;
    
    // Calculer le point de pivot (centre du crop)
    const currentWidth = imageNaturalSize.width * scale;
    const currentHeight = imageNaturalSize.height * scale;
    
    // Position actuelle du centre de l'image
    const currentCenterX = position.x + currentWidth / 2;
    const currentCenterY = position.y + currentHeight / 2;
    
    // Calculer le ratio de changement
    const scaleRatio = newScale / scale;
    
    // Nouvelle position pour maintenir le centre relatif
    const newCenterX = centerX + (currentCenterX - centerX) * scaleRatio;
    const newCenterY = centerY + (currentCenterY - centerY) * scaleRatio;
    
    // Nouvelle position du coin supérieur gauche
    const newX = newCenterX - newWidth / 2;
    const newY = newCenterY - newHeight / 2;
    
    setPosition({ x: newX, y: newY });
    setScale(newScale);
  }, [scale, position, imageNaturalSize, isImageLoaded]);

  // Rotation
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
    // Réinitialiser après rotation pour éviter les décalages
    setTimeout(() => {
      if (isImageLoaded) {
        initializeImage();
      }
    }, 100);
  }, [initializeImage, isImageLoaded]);

  // Génération du preview
  useEffect(() => {
    if (!imageRef.current || !containerRef.current || !isImageLoaded || !isInitialized) return;

    const generatePreview = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const previewSize = 100;
      canvas.width = previewSize;
      canvas.height = previewSize;

      const container = containerRef.current!.getBoundingClientRect();
      const cropCenterX = container.width / 2;
      const cropCenterY = container.height / 2;
      
      // Calculer la zone source dans l'image originale
      const currentWidth = imageNaturalSize.width * scale;
      const currentHeight = imageNaturalSize.height * scale;
      
      // Position du centre de l'image actuellement affichée
      const imageCenterX = position.x + currentWidth / 2;
      const imageCenterY = position.y + currentHeight / 2;
      
      // Décalage entre le centre du crop et le centre de l'image
      const offsetX = cropCenterX - imageCenterX;
      const offsetY = cropCenterY - imageCenterY;
      
      // Conversion en coordonnées de l'image source
      const sourceScale = 1 / scale;
      const sourceCropSize = CROP_SIZE * sourceScale;
      const sourceOffsetX = offsetX * sourceScale;
      const sourceOffsetY = offsetY * sourceScale;
      
      const sourceCenterX = imageNaturalSize.width / 2;
      const sourceCenterY = imageNaturalSize.height / 2;
      
      const sourceX = sourceCenterX + sourceOffsetX - sourceCropSize / 2;
      const sourceY = sourceCenterY + sourceOffsetY - sourceCropSize / 2;

      // Appliquer la rotation si nécessaire
      if (rotation !== 0) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        tempCanvas.width = imageNaturalSize.width;
        tempCanvas.height = imageNaturalSize.height;
        
        tempCtx.translate(imageNaturalSize.width / 2, imageNaturalSize.height / 2);
        tempCtx.rotate((rotation * Math.PI) / 180);
        tempCtx.drawImage(imageRef.current!, -imageNaturalSize.width / 2, -imageNaturalSize.height / 2);
        
        ctx.drawImage(
          tempCanvas,
          sourceX, sourceY, sourceCropSize, sourceCropSize,
          0, 0, previewSize, previewSize
        );
      } else {
        ctx.drawImage(
          imageRef.current!,
          sourceX, sourceY, sourceCropSize, sourceCropSize,
          0, 0, previewSize, previewSize
        );
      }

      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));
    };

    const timer = setTimeout(generatePreview, 50);
    return () => clearTimeout(timer);
  }, [position, scale, rotation, CROP_SIZE, imageNaturalSize, isImageLoaded, isInitialized]);

  // Fonction de crop finale
  const handleCrop = async () => {
    if (!imageRef.current || !containerRef.current || !isImageLoaded || !isInitialized) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = outputSize;
      canvas.height = outputSize;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const container = containerRef.current.getBoundingClientRect();
      const cropCenterX = container.width / 2;
      const cropCenterY = container.height / 2;
      
      // Même logique que le preview mais pour la taille finale
      const currentWidth = imageNaturalSize.width * scale;
      const currentHeight = imageNaturalSize.height * scale;
      
      const imageCenterX = position.x + currentWidth / 2;
      const imageCenterY = position.y + currentHeight / 2;
      
      const offsetX = cropCenterX - imageCenterX;
      const offsetY = cropCenterY - imageCenterY;
      
      const sourceScale = 1 / scale;
      const sourceCropSize = CROP_SIZE * sourceScale;
      const sourceOffsetX = offsetX * sourceScale;
      const sourceOffsetY = offsetY * sourceScale;
      
      const sourceCenterX = imageNaturalSize.width / 2;
      const sourceCenterY = imageNaturalSize.height / 2;
      
      const sourceX = sourceCenterX + sourceOffsetX - sourceCropSize / 2;
      const sourceY = sourceCenterY + sourceOffsetY - sourceCropSize / 2;

      // Appliquer la rotation si nécessaire
      if (rotation !== 0) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Temp canvas context not available');
        
        tempCanvas.width = imageNaturalSize.width;
        tempCanvas.height = imageNaturalSize.height;
        
        tempCtx.translate(imageNaturalSize.width / 2, imageNaturalSize.height / 2);
        tempCtx.rotate((rotation * Math.PI) / 180);
        tempCtx.drawImage(imageRef.current, -imageNaturalSize.width / 2, -imageNaturalSize.height / 2);
        
        ctx.drawImage(
          tempCanvas,
          sourceX, sourceY, sourceCropSize, sourceCropSize,
          0, 0, outputSize, outputSize
        );
      } else {
        ctx.drawImage(
          imageRef.current,
          sourceX, sourceY, sourceCropSize, sourceCropSize,
          0, 0, outputSize, outputSize
        );
      }

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
        setIsProcessing(false);
      }, 'image/jpeg', 0.9);
    } catch (error: unknown) {
      console.error('Crop error:', error);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Recadrer l'image</h3>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-4 py-3 bg-blue-50 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            Glissez l'image pour la repositionner. Utilisez les contrôles pour ajuster.
          </div>
        </div>

        {/* Crop Area */}
        <div 
          ref={containerRef}
          className="relative bg-gray-900 overflow-hidden"
          style={{ height: `${CONTAINER_HEIGHT}px` }}
        >
          {(!isImageLoaded || !isInitialized) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <img
            ref={imageRef}
            src={imageUrl}
            alt="À recadrer"
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
          
          {/* Zone de crop */}
          <div
            className="absolute top-1/2 left-1/2 border-2 border-white shadow-lg pointer-events-none z-10"
            style={{
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              transform: 'translate(-50%, -50%)',
              borderRadius: cropShape === 'round' ? '50%' : '8px',
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.3)`
            }}
          />
          
          {/* Grille d'aide au cadrage */}
          {isInitialized && (
            <div
              className="absolute top-1/2 left-1/2 pointer-events-none z-10 opacity-30"
              style={{
                width: `${CROP_SIZE}px`,
                height: `${CROP_SIZE}px`,
                transform: 'translate(-50%, -50%)',
                borderRadius: cropShape === 'round' ? '50%' : '8px'
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white border-opacity-50"></div>
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
              <div className="text-sm font-medium text-gray-700 mb-1">Aperçu :</div>
              <div 
                className="w-20 h-20 border-2 border-gray-300 bg-gray-100 overflow-hidden rounded" 
                style={{ borderRadius: cropShape === 'round' ? '50%' : '6px' }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            <div className="flex-1 text-sm text-gray-600">
              <div className="font-medium text-gray-800 mb-1">Taille finale :</div>
              <div className="text-blue-600 font-mono">{outputSize} × {outputSize} px</div>
              <div className="text-xs text-gray-500 mt-1">
                Format carré, haute qualité
              </div>
            </div>
          </div>

          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <ZoomIn size={18} className="text-gray-600" />
            <CustomSlider
              value={scale}
              min={0.2}
              max={2.5}
              step={0.05}
              onChange={(_, value) => handleScaleChange(value as number)}
              disabled={isProcessing || !isInitialized}
              aria-label="Zoom"
            />
            <span className="text-sm text-gray-600 min-w-[3rem] text-right">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Rotation Control */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRotate}
              disabled={isProcessing || !isInitialized}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw size={16} />
              Rotation 90°
            </button>
            <span className="text-sm text-gray-600">
              {rotation}°
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing || !isInitialized}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Valider
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