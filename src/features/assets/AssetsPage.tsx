import { useState } from 'react';
import { Upload, Copy, Check } from 'lucide-react';

interface AssetMock {
  id: string;
  name: string;
  url: string;
  category: 'logo' | 'portrait' | 'background' | 'graphic';
  size: string;
}

const INITIAL_ASSETS: AssetMock[] = [
  {
    id: 'ast-1',
    name: 'Oakwood Official Seal',
    url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=300&q=80',
    category: 'logo',
    size: '184 KB',
  },
  {
    id: 'ast-2',
    name: 'Campus Guilloche Texture',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    category: 'background',
    size: '420 KB',
  },
  {
    id: 'ast-3',
    name: 'Sample Student Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    category: 'portrait',
    size: '312 KB',
  },
];

export const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetMock[]>(INITIAL_ASSETS);
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
          category: 'graphic',
          size: `${Math.round(file.size / 1024)} KB`,
        };
        setAssets([newAsset, ...assets]);
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

      {/* Asset Grid */}
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
    </div>
  );
};
