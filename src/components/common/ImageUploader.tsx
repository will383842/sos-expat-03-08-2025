import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Image, Check, AlertCircle, Upload, Camera, FileImage } from 'lucide-react';
import ImageCropModal from './ImageCropModal'; // Import du composant crop

// ===============================================
// GÉNÉRATION D'ID UNIQUE (remplace uuid)
// ===============================================
const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// ===============================================
// FIREBASE STORAGE MOCK POUR PRODUCTION
// ===============================================
interface StorageRef {
  fullPath: string;
}

interface UploadTask {
  on: (
    event: string,
    progress: (snapshot: UploadSnapshot) => void,
    error: (error: Error) => void,
    complete: () => void
  ) => void;
  snapshot: { ref: StorageRef };
}

interface UploadSnapshot {
  ref: StorageRef;
  bytesTransferred: number;
  totalBytes: number;
}

const mockFirebase = {
  getStorage: () => ({}),
  ref: (_storage: any, path: string): StorageRef => ({ fullPath: path }),
  uploadBytesResumable: (ref: StorageRef, file: File | Blob): UploadTask => {
    let progress = 0;
    const snapshot: UploadSnapshot = { ref, bytesTransferred: 0, totalBytes: file.size };

    return {
      on: (
        _event: string,
        onProgress: (snapshot: UploadSnapshot) => void,
        _onError: (error: Error) => void,
        onComplete: () => void
      ) => {
        const interval = setInterval(() => {
          progress += Math.max(1, Math.random() * (file.size / 5));
          snapshot.bytesTransferred = Math.min(progress, file.size);
          onProgress(snapshot);

          if (progress >= file.size) {
            clearInterval(interval);
            onComplete();
          }
        }, 100);
      },
      snapshot
    };
  },
  getDownloadURL: async (ref: StorageRef): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://your-storage.com/${ref.fullPath}?${Date.now()}`);
      }, 500);
    });
  },
  deleteObject: async (_ref: StorageRef): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
  }
};

// ===============================================
// DROPZONE NATIF (remplace react-dropzone)
// ===============================================
interface UseDropzoneReturn {
  getRootProps: () => {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
    role: string;
    tabIndex: number;
  };
  getInputProps: () => {
    type: string;
    accept: string;
    multiple: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style: React.CSSProperties;
  };
  isDragActive: boolean;
}

interface UseDropzoneOptions {
  onDrop: (files: File[]) => void;
  accept: Record<string, string[]>;
  maxSize: number;
  multiple: boolean;
  disabled: boolean;
  onError?: (error: Error) => void;
  noClick?: boolean;
  noKeyboard?: boolean;
}

const useDropzone = (options: UseDropzoneOptions): UseDropzoneReturn => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!options.disabled) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (options.disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const acceptedTypes = Object.values(options.accept).flat();
      return acceptedTypes.some((type) => type === 'image/*' || file.type.includes(type.replace('*', '')));
    });

    if (validFiles.length > 0) {
      options.onDrop(validFiles);
    }
  };

  const handleClick = () => {
    if (!options.disabled && !options.noClick) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const files = Array.from(e.target.files);
      options.onDrop(files);
    }
  };

  const acceptString = Object.keys(options.accept).join(',');

  return {
    getRootProps: () => ({
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onClick: handleClick,
      role: 'button',
      tabIndex: options.disabled ? -1 : 0
    }),
    getInputProps: () => ({
      type: 'file',
      accept: acceptString,
      multiple: options.multiple,
      onChange: handleInputChange,
      style: { display: 'none' }
    }),
    isDragActive
  };
};

// ===============================================
// CAMERA UTILITIES
// ===============================================
interface CameraCapture {
  openCamera: (facingMode?: 'user' | 'environment') => Promise<void>;
  isSupported: boolean;
}

const useCameraCapture = (onCapture: (file: File) => void): CameraCapture => {
  const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const openCamera = useCallback(
    async (facingMode: 'user' | 'environment' = 'user') => {
      if (!isSupported) {
        throw new Error('Camera not supported');
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 1280 }
          }
        });

        // Créer un modal de caméra
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90';

        const container = document.createElement('div');
        container.className = 'bg-white rounded-lg p-4 max-w-sm w-full mx-4';

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.className = 'w-full h-64 object-cover rounded-lg bg-black';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'flex gap-3 mt-4';

        const captureBtn = document.createElement('button');
        captureBtn.textContent = 'Prendre la photo';
        captureBtn.className = 'flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Annuler';
        cancelBtn.className = 'flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50';

        const switchBtn = document.createElement('button');
        switchBtn.textContent = '🔄';
        switchBtn.className = 'px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50';
        switchBtn.title = 'Changer de caméra';

        buttonsContainer.appendChild(cancelBtn);
        buttonsContainer.appendChild(switchBtn);
        buttonsContainer.appendChild(captureBtn);

        container.appendChild(video);
        container.appendChild(buttonsContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);

        let currentFacingMode = facingMode;

        const cleanup = () => {
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(modal);
        };

        captureBtn.onclick = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const file = new File([blob], 'camera-capture.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                onCapture(file);
              }
              cleanup();
            },
            'image/jpeg',
            0.9
          );
        };

        cancelBtn.onclick = cleanup;

        switchBtn.onclick = async () => {
          try {
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 1280 }
              }
            });

            stream.getTracks().forEach((track) => track.stop());
            video.srcObject = newStream;
          } catch (error: unknown) {
            console.warn('Could not switch camera:', error);
          }
        };
      } catch (error: unknown) {
        console.error('Camera access error:', error);
        throw new Error("Impossible d'accéder à la caméra");
      }
    },
    [isSupported, onCapture]
  );

  return { openCamera, isSupported };
};

// ===============================================
// CONFIGURATION ET CONSTANTES
// ===============================================
const SUPPORTED_IMAGE_CONFIG = {
  extensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.heic',
    '.heif',
    '.bmp',
    '.tiff',
    '.tif',
    '.avif',
    '.apng',
    '.ico'
  ],
  mimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    'image/avif'
  ],
  maxDimension: 2048,
  jpegQuality: 0.85
} as const;

// FR (existant)
const MESSAGES = {
  errors: {
    unsupportedFormat:
      'Format non supporté. Formats acceptés: JPG, PNG, WEBP, GIF, HEIC, BMP, TIFF, AVIF',
    fileTooLarge: (sizeMB: number, maxSizeMB: number) =>
      `L'image ne doit pas dépasser ${maxSizeMB}MB (actuelle: ${sizeMB.toFixed(1)}MB)`,
    uploadFailed: (error: string) => `Erreur d'upload: ${error}`,
    previewFailed: "Erreur lors de la création de l'aperçu",
    deleteFailed: 'Erreur lors de la suppression',
    imageLoadError: 'Erreur de chargement',
    cameraNotSupported: 'Caméra non supportée sur cet appareil',
    cameraAccessFailed: "Impossible d'accéder à la caméra"
  },
  ui: {
    dropHere: "Déposez l'image ici",
    clickOrDrag: 'Cliquez ou glissez une image',
    formatInfo: (maxSizeMB: number) => `JPG, PNG, WEBP, GIF, HEIC • Max ${maxSizeMB}MB`,
    uploading: (progress: number) => `Upload en cours... ${progress}%`,
    uploadSuccess: 'Image uploadée avec succès!',
    replaceImage: "Remplacer l'image",
    removeImage: "Supprimer l'image",
    profileImage: 'Photo de profil',
    converting: "Conversion de l'image...",
    takePhoto: 'Prendre une photo',
    chooseFromGallery: 'Galerie',
    switchCamera: 'Changer caméra'
  }
} as const;

// EN (nouveau)
const MESSAGES_EN = {
  errors: {
    unsupportedFormat:
      'Unsupported format. Accepted: JPG, PNG, WEBP, GIF, HEIC, BMP, TIFF, AVIF',
    fileTooLarge: (sizeMB: number, maxSizeMB: number) =>
      `Image must not exceed ${maxSizeMB}MB (current: ${sizeMB.toFixed(1)}MB)`,
    uploadFailed: (error: string) => `Upload error: ${error}`,
    previewFailed: 'Preview creation failed',
    deleteFailed: 'Deletion failed',
    imageLoadError: 'Load error',
    cameraNotSupported: 'Camera not supported on this device',
    cameraAccessFailed: 'Cannot access camera'
  },
  ui: {
    dropHere: 'Drop the image here',
    clickOrDrag: 'Click or drag an image',
    formatInfo: (maxSizeMB: number) => `JPG, PNG, WEBP, GIF, HEIC • Max ${maxSizeMB}MB`,
    uploading: (progress: number) => `Uploading… ${progress}%`,
    uploadSuccess: 'Image uploaded successfully!',
    replaceImage: 'Replace image',
    removeImage: 'Remove image',
    profileImage: 'Profile photo',
    converting: 'Converting image…',
    takePhoto: 'Take a photo',
    chooseFromGallery: 'Gallery',
    switchCamera: 'Switch camera'
  }
} as const;

// ===============================================
// COMPOSANT PRINCIPAL IMAGEUPLOADER
// ===============================================
interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  className?: string;
  maxSizeMB?: number;
  uploadPath?: string;
  disabled?: boolean;
  aspectRatio?: number;
  preferredCamera?: 'user' | 'environment';
  outputSize?: number;
  cropShape?: 'rect' | 'round';

  // 👇 AJOUT i18n / overrides / compat
  locale?: 'fr' | 'en';
  labels?: Partial<typeof MESSAGES['ui']>;
  hideNativeFileLabel?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUploaded,
  currentImage,
  className = '',
  maxSizeMB = 10,
  uploadPath = 'temp_profiles',
  disabled = false,
  aspectRatio = 1,
  preferredCamera = 'user',
  outputSize = 512,
  cropShape = 'rect',
  // nouveaux
  locale = 'fr',
  labels,
  hideNativeFileLabel // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  // i18n sélection + override
  const L = useMemo(() => {
    const pack = locale === 'en' ? MESSAGES_EN : MESSAGES;
    return {
      errors: pack.errors,
      ui: { ...pack.ui, ...(labels || {}) }
    };
  }, [locale, labels]);

  // États principaux
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // États pour le crop modal
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  // Camera hook
  const { openCamera, isSupported: isCameraSupported } = useCameraCapture((file) => {
    handleFileSelect([file]);
  });

  // Refs
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync avec l'image courante
  useEffect(() => {
    setPreviewUrl(currentImage || null);
    if (currentImage) {
      setSuccess(false);
      setError(null);
    }
  }, [currentImage]);

  // Auto-clear des messages de succès
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Nettoyage à la désinstallation
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (tempImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tempImageUrl);
      }
    };
  }, [tempImageUrl]);

  /**
   * Validation stricte des fichiers
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      const fileName = file.name.toLowerCase();
      const hasValidExtension = SUPPORTED_IMAGE_CONFIG.extensions.some((ext) =>
        fileName.endsWith(ext)
      );
      const hasValidMimeType =
        file.type === '' || SUPPORTED_IMAGE_CONFIG.mimeTypes.includes(file.type as never);

      if (!hasValidExtension && !hasValidMimeType) {
        return L.errors.unsupportedFormat;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return L.errors.fileTooLarge(file.size / 1024 / 1024, maxSizeMB);
      }

      return null;
    },
    [maxSizeMB, L.errors]
  );

  /**
   * Traitement et conversion d'images avec optimisation
   */
  const processImage = useCallback(async (file: File): Promise<File> => {
    const fileName = file.name.toLowerCase();
    const needsConversion = fileName.match(/\.(heic|heif|tiff|tif|bmp)$/i);

    if (!needsConversion) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file);
            return;
          }

          let { width, height } = img;
          const { maxDimension } = SUPPORTED_IMAGE_CONFIG;

          if (width > maxDimension || height > maxDimension) {
            const scale = maxDimension / Math.max(width, height);
            width *= scale;
            height *= scale;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFileName = file.name.replace(
                  /\.(heic|heif|tiff|tif|bmp)$/i,
                  '.jpg'
                );
                const newFile = new File([blob], newFileName, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(newFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            SUPPORTED_IMAGE_CONFIG.jpegQuality
          );
        };

        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };

      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }, []);

  /**
   * Suppression depuis le stockage
   */
  const deleteFromStorage = useCallback(
    async (url: string): Promise<void> => {
      if (!url?.includes('your-storage.com')) {
        return;
      }

      try {
        const storage = mockFirebase.getStorage();
        const pathMatch = url.match(/\/([^\/\?]+)(\?|$)/);
        if (pathMatch?.[1]) {
          const filePath = pathMatch[1];
          const storageRef = mockFirebase.ref(storage, `${uploadPath}/${filePath}`);
          await mockFirebase.deleteObject(storageRef);
        }
      } catch (error: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to delete previous image:', error);
        }
      }
    },
    [uploadPath]
  );

  /**
   * Upload optimisé
   */
  const uploadImage = useCallback(
    async (file: File | Blob): Promise<string> => {
      const storage = mockFirebase.getStorage();

      let fileToUpload: File;
      if (file instanceof Blob && !(file instanceof File)) {
        fileToUpload = new File([file], 'profile-image.jpg', { type: 'image/jpeg' });
      } else {
        fileToUpload = file as File;
      }

      const processedFile = await processImage(fileToUpload);
      const extension = processedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${generateUniqueId()}.${extension}`;
      const storageRef = mockFirebase.ref(storage, `${uploadPath}/${fileName}`);

      return new Promise((resolve, reject) => {
        const uploadTask = mockFirebase.uploadBytesResumable(storageRef, processedFile);

        uploadTask.on(
          'state_changed',
          (snapshot: UploadSnapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(progress);
          },
          (error: Error) => {
            setUploadProgress(0);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await mockFirebase.getDownloadURL(uploadTask.snapshot.ref);
              setUploadProgress(100);
              resolve(downloadUrl);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    },
    [uploadPath, processImage]
  );

  /**
   * Gestion de la sélection de fichiers
   */
  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || disabled || isUploading) return;

      setError(null);
      setSuccess(false);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        const url = URL.createObjectURL(file);
        setTempImageUrl(url);
        setShowCropModal(true);
      } catch (err: unknown) {
        setError(L.errors.previewFailed);
        if (process.env.NODE_ENV === 'development') {
          console.error('Preview creation error:', err);
        }
      }
    },
    [validateFile, disabled, isUploading, L.errors.previewFailed]
  );

  /**
   * Finalisation du crop
   */
  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setShowCropModal(false);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        if (previewUrl?.includes('your-storage.com')) {
          await deleteFromStorage(previewUrl);
        }

        const url = await uploadImage(croppedBlob);
        setPreviewUrl(url);
        setSuccess(true);
        onImageUploaded(url);

        setTimeout(() => setUploadProgress(0), 1500);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(L.errors.uploadFailed(errorMessage));
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
        if (tempImageUrl) {
          URL.revokeObjectURL(tempImageUrl);
          setTempImageUrl(null);
        }
      }
    },
    [previewUrl, deleteFromStorage, uploadImage, onImageUploaded, tempImageUrl, L.errors]
  );

  /**
   * Annulation du crop
   */
  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
      setTempImageUrl(null);
    }
  }, [tempImageUrl]);

  /**
   * Configuration de la dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      'image/*': SUPPORTED_IMAGE_CONFIG.extensions
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
    disabled: disabled || isUploading,
    onError: (err) => setError(err.message),
    noClick: false,
    noKeyboard: false
  });

  /**
   * Ouverture de la caméra
   */
  const openCameraCapture = useCallback(
    async (facingMode: 'user' | 'environment' = preferredCamera) => {
      if (!disabled && !isUploading && isCameraSupported) {
        try {
          await openCamera(facingMode);
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : L.errors.cameraAccessFailed);
        }
      } else if (!isCameraSupported) {
        setError(L.errors.cameraNotSupported);
      }
    },
    [disabled, isUploading, isCameraSupported, openCamera, preferredCamera, L.errors]
  );

  /**
   * Sélecteur de fichiers
   */
  const openFileSelector = useCallback(
    (accept: string = 'image/*') => {
      if (!disabled && !isUploading) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = false;

        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files?.length) {
            handleFileSelect(Array.from(files));
          }
        };

        input.click();
      }
    },
    [disabled, isUploading, handleFileSelect]
  );

  /**
   * Suppression avec confirmation
   */
  const handleRemoveImage = useCallback(async () => {
    if (isUploading || disabled) return;

    setIsUploading(true);

    try {
      if (previewUrl) {
        await deleteFromStorage(previewUrl);
      }

      setPreviewUrl(null);
      setError(null);
      setSuccess(false);
      setUploadProgress(0);
      onImageUploaded('');
    } catch (err: unknown) {
      setError(L.errors.deleteFailed);
      if (process.env.NODE_ENV === 'development') {
        console.error('Delete error:', err);
      }
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, disabled, previewUrl, deleteFromStorage, onImageUploaded, L.errors.deleteFailed]);

  /**
   * Remplacement d'image avec choix d'options (mobile: caméra/galerie)
   */
  const handleReplaceImage = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      if (isUploading || disabled) return;

      if (window.innerWidth < 640 && isCameraSupported) {
        // Modal d’options pour mobile
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';

        const container = document.createElement('div');
        container.className = 'bg-white rounded-lg p-6 max-w-sm w-full mx-4';

        const title = document.createElement('h3');
        title.textContent = locale === 'en' ? 'Choose an image' : 'Choisir une image';
        title.className = 'text-lg font-semibold mb-4 text-center';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'space-y-3';

        const cameraBtn = document.createElement('button');
        cameraBtn.innerHTML = `
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          ${locale === 'en' ? 'Take a photo' : 'Prendre une photo'}
        `;
        cameraBtn.className =
          'w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';

        const galleryBtn = document.createElement('button');
        galleryBtn.innerHTML = `
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          ${locale === 'en' ? 'Choose from gallery' : 'Choisir depuis la galerie'}
        `;
        galleryBtn.className =
          'w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = locale === 'en' ? 'Cancel' : 'Annuler';
        cancelBtn.className = 'w-full px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors';

        const cleanup = () => {
          document.body.removeChild(modal);
        };

        cameraBtn.onclick = () => {
          cleanup();
          openCameraCapture('user');
        };

        galleryBtn.onclick = () => {
          cleanup();
          openFileSelector();
        };

        cancelBtn.onclick = cleanup;

        buttonsContainer.appendChild(cameraBtn);
        buttonsContainer.appendChild(galleryBtn);
        buttonsContainer.appendChild(cancelBtn);

        container.appendChild(title);
        container.appendChild(buttonsContainer);
        modal.appendChild(container);
        document.body.appendChild(modal);

        modal.onclick = (event) => {
          if (event.target === modal) cleanup();
        };
      } else {
        openFileSelector();
      }
    },
    [isUploading, disabled, isCameraSupported, openCameraCapture, openFileSelector, locale]
  );

  return (
    <div className={`w-full ${className}`}>
      {previewUrl ? (
        <div className="relative group">
          <div className="relative">
            <div
              className={`absolute inset-0 z-10 ${
                disabled || isUploading ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={disabled || isUploading ? undefined : handleReplaceImage}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
                  e.preventDefault();
                  handleReplaceImage();
                }
              }}
              tabIndex={disabled || isUploading ? -1 : 0}
              role="button"
              aria-label={disabled || isUploading ? L.ui.profileImage : L.ui.replaceImage}
            />

            <img
              src={previewUrl}
              alt={L.ui.profileImage}
              className={`w-full h-auto rounded-lg object-cover max-h-72 sm:max-h-96 border border-gray-200 transition-opacity ${
                disabled || isUploading ? 'opacity-75' : 'group-hover:opacity-90'
              }`}
              onError={(e) => {
                e.currentTarget.src =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y0ZjRmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkVycmV1ciBkZSBjaGFyZ2VtZW50PC90ZXh0Pjwvc3ZnPg==';
              }}
            />

            {!isUploading && !disabled && (
              <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-40 rounded-lg sm:hidden">
                <div className="bg-white bg-opacity-90 rounded-full p-3">
                  <Camera className="w-6 h-6 text-gray-800" />
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="absolute top-2 right-2 flex gap-1 sm:gap-2 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReplaceImage();
              }}
              disabled={isUploading || disabled}
              className="p-2.5 sm:p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              title={L.ui.replaceImage}
              aria-label={L.ui.replaceImage}
            >
              <Camera size={18} className="sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              disabled={isUploading || disabled}
              className="p-2.5 sm:p-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              title={L.ui.removeImage}
              aria-label={L.ui.removeImage}
            >
              <X size={18} className="sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Overlay de progression */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-lg z-40">
              <div className="text-white text-sm font-medium mb-4 px-4 text-center">
                {L.ui.uploading(uploadProgress)}
              </div>
              <div className="w-3/4 bg-gray-300 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          )}

          {/* Indicateur de succès */}
          {success && !isUploading && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white p-2 rounded-full shadow-lg z-30">
              <Check size={16} aria-label="Upload success" />
            </div>
          )}
        </div>
      ) : (
        /* Zone de drop */
        <div
          {...getRootProps()}
          onClick={(e) => {
            if (!disabled && !isUploading && !isDragActive) {
              e.preventDefault();
              e.stopPropagation();
              if (window.innerWidth < 640 && isCameraSupported) {
                handleReplaceImage();
              } else {
                openFileSelector();
              }
            }
          }}
          className={`
            border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all
            ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : isUploading || disabled
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
            focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
          `}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          aria-label={isDragActive ? L.ui.dropHere : L.ui.clickOrDrag}
        >
          <input {...getInputProps()} ref={fileInputRef} aria-describedby="upload-description" />

          {isUploading ? (
            <div className="space-y-3">
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 mx-auto animate-pulse" />
              <p className="text-gray-600 text-sm sm:text-base">{L.ui.uploading(uploadProgress)}</p>
              <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Image className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">
                  {isDragActive ? L.ui.dropHere : L.ui.clickOrDrag}
                </p>
                <p id="upload-description" className="text-gray-500 text-xs sm:text-sm mt-1">
                  {L.ui.formatInfo(maxSizeMB)}
                </p>

                {/* Boutons pour mobile avec choix photo/galerie */}
                <div className="mt-4 flex gap-2 sm:hidden">
                  {isCameraSupported && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCameraCapture('user');
                      }}
                      disabled={disabled || isUploading}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <Camera className="w-4 h-4" />
                      {L.ui.takePhoto}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileSelector();
                    }}
                    disabled={disabled || isUploading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <FileImage className="w-4 h-4" />
                    {L.ui.chooseFromGallery}
                  </button>
                </div>

                {/* Instructions pour desktop */}
                <div className="hidden sm:block mt-2 text-xs text-gray-400">
                  {isCameraSupported
                    ? locale === 'en'
                      ? 'Or use the webcam with the replace buttons'
                      : 'Ou utilisez la webcam avec les boutons de remplacement'
                    : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages d'erreur */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2" role="alert" aria-live="polite">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Messages de succès */}
      {success && !isUploading && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2" role="status" aria-live="polite">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">{L.ui.uploadSuccess}</span>
        </div>
      )}

      {/* Modal de crop */}
      {tempImageUrl && (
        <ImageCropModal
          imageUrl={tempImageUrl}
          isOpen={showCropModal}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={aspectRatio}
          cropShape={cropShape}
          outputSize={outputSize}
          locale={locale} // 👈 passe la langue au modal
        />
      )}
    </div>
  );
};

export default ImageUploader;
