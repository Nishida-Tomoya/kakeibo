import React, { useCallback, useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  previewUrl: string | null;
  onClear: () => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageSelected, 
  previewUrl, 
  onClear,
  isLoading 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImageSelected(file);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) onImageSelected(file);
  }, [onImageSelected]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="w-full">
      {!previewUrl ? (
        <div 
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${isLoading ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'border-blue-300 hover:bg-blue-50 hover:border-blue-400 bg-white'}`}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          onDrop={!isLoading ? handleDrop : undefined}
          onDragOver={!isLoading ? handleDragOver : undefined}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
            disabled={isLoading}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="text-base font-medium text-gray-700">
                レシート画像をアップロード
              </p>
              <p className="text-xs text-gray-500 mt-1">
                タップまたはドラッグ＆ドロップ
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <img 
            src={previewUrl} 
            alt="Receipt Preview" 
            className="w-full h-auto max-h-[400px] object-contain bg-gray-50"
          />
          {!isLoading && (
            <button 
              onClick={onClear}
              className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
            >
              <X size={20} />
            </button>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-800 font-medium bg-white/90 px-3 py-1 rounded-full shadow-sm text-sm">解析中...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
