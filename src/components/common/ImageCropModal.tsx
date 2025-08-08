import React, { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../utils/cropImage"; // utilitaire qui transforme le crop en image finale

interface ImageCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (croppedImageUrl: string) => void;
  cropShape?: "rect" | "round";
  outputSize?: number;
  locale?: "fr" | "en";
}

const translations = {
  fr: {
    title: "Recadrer la photo",
    cancel: "Annuler",
    save: "Enregistrer",
    zoom: "Zoom",
    move: "Déplacez ou zoomez l'image avec le doigt ou la souris",
  },
  en: {
    title: "Crop Photo",
    cancel: "Cancel",
    save: "Save",
    zoom: "Zoom",
    move: "Move or zoom the image with your finger or mouse",
  },
};

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onCancel,
  onComplete,
  cropShape = "round",
  outputSize = 512,
  locale = "fr",
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const t = translations[locale] || translations.fr;

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        outputSize,
        cropShape
      );
      onComplete(croppedImage);
    } catch (e) {
      console.error("Erreur recadrage :", e);
    }
  }, [croppedAreaPixels, cropShape, imageSrc, onComplete, outputSize]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-1">{t.title}</h2>
        <p className="text-sm text-gray-500 mb-3">{t.move}</p>

        <div className="relative w-full h-64 bg-gray-200 rounded overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </div>

        {/* Zoom slider */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.zoom}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Boutons */}
        <div className="mt-5 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
