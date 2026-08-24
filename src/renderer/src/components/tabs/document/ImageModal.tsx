import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Upload, Globe, X, Check } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (imageUrl: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('upload');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && preview) {
      onSubmit(preview);
    } else if (activeTab === 'url' && url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-artemis-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <ImageIcon className="w-4 h-4 text-artemis-accent" />
            Insert Image
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle: Local Upload vs Web URL */}
        <div className="flex gap-2 mt-4 p-1 bg-artemis-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'upload'
                ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'url'
                ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Web Image URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {activeTab === 'upload' ? (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-artemis-accent/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-artemis-950/50"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-40 rounded-lg object-contain mb-2"
                  />
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-500 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">
                      Click to choose image file
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      PNG, JPG, SVG, WebP up to 5MB
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Image Web Address (URL)
              </label>
              <input
                type="text"
                placeholder="https://example.com/photo.png"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={activeTab === 'upload' ? !preview : !url.trim()}
              className="px-4 py-1.5 rounded-lg bg-artemis-accent hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-artemis-accent text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Insert Image
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
