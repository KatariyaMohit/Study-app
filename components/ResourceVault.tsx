
import React from 'react';
import { Upload, File, FileImage, FileVideo, FileText, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { ResourceFile } from '../types';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

interface Props {
  resources: ResourceFile[];
  setResources: React.Dispatch<React.SetStateAction<ResourceFile[]>>;
}

const ResourceVault: React.FC<Props> = ({ resources, setResources }) => {
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result as string;
      let type: ResourceFile['type'] = 'other';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('image')) type = 'image';
      else if (file.type.includes('video')) type = 'video';

      const newResource: ResourceFile = {
        id: Date.now().toString(),
        name: file.name,
        type,
        url: base64, // Now saving full Base64 string for persistence
        lastOpened: new Date().toISOString()
      };

      setResources([newResource, ...resources]);
      setIsUploading(false);
    };

    reader.onerror = () => {
      alert("Failed to read file. Please try a smaller file.");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const openFile = async (file: ResourceFile) => {
    // Update last opened
    setResources(prev => prev.map(r => r.id === file.id ? { ...r, lastOpened: new Date().toISOString() } : r));
    
    if (Capacitor.isNativePlatform()) {
      try {
        // Using Capacitor Browser plugin to open the data URL.
        // This opens a system-level preview or a native browser tab.
        // On mobile, closing this tab/preview brings the user back to the app.
        await Browser.open({ url: file.url });
      } catch (e) {
        console.error("Browser failed, falling back to window.open", e);
        window.open(file.url, '_blank');
      }
    } else {
      // Web fallback
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${file.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  const getIconData = (type: string) => {
    switch (type) {
      case 'pdf': return { icon: <FileText className="w-5 h-5" />, color: 'text-rose-600', bg: 'bg-rose-50' };
      case 'image': return { icon: <FileImage className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'video': return { icon: <FileVideo className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      default: return { icon: <File className="w-5 h-5" />, color: 'text-slate-500', bg: 'bg-slate-50' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center text-center group hover:border-indigo-300 transition-all">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          {isUploading ? <Loader2 className="text-indigo-600 w-8 h-8 animate-spin" /> : <Upload className="text-indigo-600 w-8 h-8" />}
        </div>
        <h3 className="text-slate-800 font-black text-sm mb-1 tracking-tight">Expand Your Vault</h3>
        <p className="text-[11px] text-slate-400 mb-6 max-w-[220px] font-medium leading-relaxed">
          {isUploading ? "Encrypting and storing your file..." : "Add PDFs, images, and notes. They are saved offline forever."}
        </p>
        <label className={`bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {isUploading ? "Processing..." : "Choose Files"}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="space-y-3">
        {resources.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-3xl border border-slate-100">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <File className="text-slate-300 w-6 h-6" />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Your vault is empty</p>
          </div>
        ) : (
          resources.map(file => {
            const { icon, color, bg } = getIconData(file.type);
            return (
              <div key={file.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
                <div 
                  onClick={() => openFile(file)}
                  className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer`}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openFile(file)}>
                  <p className="text-[13px] font-black text-slate-700 truncate leading-tight mb-0.5">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${color}`}>{file.type}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(file.lastOpened).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => openFile(file)}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Open File"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeResource(file.id)}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ResourceVault;
