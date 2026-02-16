
import React, { useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
}

const UserProfileView: React.FC<Props> = ({ user, setUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser({ ...user, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 opacity-10"></div>
        
        <div className="relative mt-4">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 ring-4 ring-slate-50">
            <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform hover:bg-indigo-700"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleAvatarChange} 
          />
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.name}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Personal Profile
          </p>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-5">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Personal Details</h3>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Your Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter your name"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 pb-12">
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">ExamCrush • v1.3.0</p>
        <p className="text-[9px] text-slate-400 font-medium italic">Your progress is saved locally on this device.</p>
      </div>
    </div>
  );
};

export default UserProfileView;
