
import React from 'react';
import { Upload, File, FileImage, FileVideo, FileText, Trash2, ExternalLink } from 'lucide-react';
import { ResourceFile } from '../types';

interface Props {
  resources: ResourceFile[];
  setResources: React.Dispatch<React.SetStateAction<ResourceFile[]>>;
}

const ResourceVault: React.FC<Props> = ({ resources, setResources }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a temporary URL for the session.
    const url = URL.createObjectURL(file);
    let type: ResourceFile['type'] = 'other';
    if (file.type.includes('pdf')) type = 'pdf';
    else if (file.type.includes('image')) type = 'image';
    else if (file.type.includes('video')) type = 'video';

    const newResource: ResourceFile = {
      id: Date.now().toString(),
      name: file.name,
      type,
      url,
      lastOpened: new Date().toISOString()
    };

    setResources([newResource, ...resources]);
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
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
          <Upload className="text-indigo-600 w-8 h-8" />
        </div>
        <h3 className="text-slate-800 font-black text-sm mb-1 tracking-tight">Expand Your Vault</h3>
        <p className="text-[11px] text-slate-400 mb-6 max-w-[220px] font-medium leading-relaxed">Add PDFs, images, and video lectures to study with Crush Buddy.</p>
        <label className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest">
          Choose Files
          <input type="file" className="hidden" onChange={handleFileUpload} />
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
                <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
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
                    onClick={() => window.open(file.url, '_blank')}
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
