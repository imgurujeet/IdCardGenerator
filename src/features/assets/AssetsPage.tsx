import { useState } from 'react';
import { Upload, Copy, Check } from 'lucide-react';

interface AssetMock {
  id: string;
  name: string;
  url: string;
  category: 'logo' | 'portrait' | 'background' | 'graphic';
  size: string;
}

const STORAGE_ASSETS_KEY = 'idforge_media_assets';

function getStoredAssets(): AssetMock[] {
  try {
    const raw = localStorage.getItem(STORAGE_ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredAssets(list: AssetMock[]) {
  try {
    localStorage.setItem(STORAGE_ASSETS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save assets:', e);
  }
}

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetMock[]>(getStoredAssets);
  const [category, setCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = assets.filter((a) => (category === 'all' ? true : a.category === category));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAsset: AssetMock = {
          id: `ast-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: reader.result as string,
          category: file.name.toLowerCase().includes('logo')
            ? 'logo'
            : file.name.toLowerCase().includes('bg') || file.name.toLowerCase().includes('background')
            ? 'background'
            : 'graphic',
          size: `${Math.round(file.size / 1024)} KB`,
        };
        const updated = [newAsset, ...assets];
        setAssets(updated);
        saveStoredAssets(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Media & Asset Library</h1>
          <p className="text-sm text-surface-500 mt-1">
            Store and organize logos, background patterns, portraits, and decorative graphics for templates.
          </p>
        </div>

        <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Upload Asset</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2">
        {['all', 'logo', 'portrait', 'background', 'graphic'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              category === cat ? 'bg-surface-900 text-white' : 'text-surface-600 hover:bg-surface-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-surface-900 mb-1">No Assets Uploaded Yet</h3>
          <p className="text-xs text-surface-500 mb-6 leading-relaxed">
            Upload your college emblem, logos, watermarks, stamps, or background artwork to use across your ID cards.
          </p>
          <label className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Your First File</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group bg-white rounded-xl border border-surface-200 p-2.5 flex flex-col justify-between shadow-subtle hover:border-brand-400 transition-all"
            >
              <div className="h-32 bg-surface-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => copyUrl(asset.id, asset.url)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-md text-surface-700 shadow-xs hover:bg-white transition-colors"
                  title="Copy Image URL"
                >
                  {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-2.5">
                <p className="font-semibold text-xs text-surface-900 truncate">{asset.name}</p>
                <div className="flex items-center justify-between text-[10px] text-surface-400 mt-0.5">
                  <span className="capitalize">{asset.category}</span>
                  <span>{asset.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
