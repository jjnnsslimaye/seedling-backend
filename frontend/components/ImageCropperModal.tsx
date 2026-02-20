'use client';

import { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onClose: () => void;
  aspectRatio?: number; // e.g., 16/9 for landscape, 1 for square
}

export default function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onClose,
  aspectRatio = 16 / 9,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropCompleteInternal = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSaveCrop = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Failed to crop image:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Crop Cover Image</h3>

        <div className="relative h-[500px] bg-gray-100 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={setZoom}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCrop}
            className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors duration-200"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
