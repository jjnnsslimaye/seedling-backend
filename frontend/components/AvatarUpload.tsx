'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';
import { api } from '@/lib/api';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  username: string;
  onImageSelected: (imageBlob: Blob | null) => void;
  onRemove: () => void;
}

export default function AvatarUpload({ currentAvatarUrl, username, onImageSelected, onRemove }: AvatarUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // Preview of cropped image
  const [pendingRemoval, setPendingRemoval] = useState(false); // Track pending removal for immediate visual feedback

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Reset pending removal when avatar URL changes (after successful save)
  useEffect(() => {
    setPendingRemoval(false);
  }, [currentAvatarUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result as string);
        setShowCropper(true);
        setError('');
      });
      reader.readAsDataURL(file);
    }
  };

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
    if (!selectedImage || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(selectedImage, croppedAreaPixels);

      // Create preview URL for the cropped image
      const previewUrl = URL.createObjectURL(croppedImage);
      setPreviewUrl(previewUrl);

      // Clear pending removal since we're adding a new image
      setPendingRemoval(false);

      // Pass the blob to parent component
      onImageSelected(croppedImage);

      // Close cropper
      setShowCropper(false);
      setSelectedImage(null);
      setError('');
    } catch (error: any) {
      console.error('Failed to process image:', error);
      setError('Failed to process image');
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setPendingRemoval(true); // Immediate visual feedback
    onRemove();
  };

  // Get initials from username
  const initials = username.slice(0, 2).toUpperCase();

  // Display avatar: if pending removal, show initials. Otherwise: preview > current > initials
  const displayAvatarUrl = pendingRemoval ? null : (previewUrl || currentAvatarUrl);
  const hasAvatar = !pendingRemoval && (previewUrl || currentAvatarUrl);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="h-32 w-32 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
        {displayAvatarUrl ? (
          <img src={displayAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <label className="px-4 py-2 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 cursor-pointer transition-colors duration-200 flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Upload Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {hasAvatar && (
          <button
            type="button"
            onClick={handleRemove}
            className="px-4 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm font-medium">Remove Photo</span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4">Crop Your Photo</h3>

            <div className="relative h-96 bg-gray-100 rounded-2xl overflow-hidden">
              <Cropper
                image={selectedImage!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-2xl appearance-none cursor-pointer"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCropper(false);
                  setSelectedImage(null);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCrop}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-2xl hover:bg-brand-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
