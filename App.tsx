
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Timer, 
  Calendar, 
  FileText, 
  Bell,
  X,
  AlarmClock,
  Music,
  CalendarDays
} from 'lucide-react';
import { NativeAudio } from '@capacitor-community/native-audio';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import Dashboard from './components/Dashboard';
import SyllabusTracker from './components/SyllabusTracker';
import TimerTools from './components/TimerTools';
import ScheduleManager from './components/ScheduleManager';
import ResourceVault from './components/ResourceVault';
import UserProfileView from './components/UserProfileView';
import { AppTab, SyllabusItem, StudySession, ScheduleEvent, ResourceFile, UserProfile, Alarm } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);
  const [ringingAlarm, setRingingAlarm] = useState<any | null>(null); 
  const notifiedRefs = useRef<Set<string>>(new Set());
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeAudioActiveRef = useRef<string | null>(null);
  
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>(() => {
    const saved = localStorage.getItem('ec_syllabus');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('ec_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [schedule, setSchedule] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('ec_schedule');
    return saved ? JSON.parse(saved) : [];
  });

  const [resources, setResources] = useState<ResourceFile[]>(() => {
    const saved = localStorage.getItem('ec_resources');
    return saved ? JSON.parse(saved) : [];
  });

  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const saved = localStorage.getItem('ec_alarms');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ec_user');
    return saved ? JSON.parse(saved) : {
      name: 'Guest Learner',
      avatar: 'https://picsum.photos/100/100?random=42',
      isLoggedIn: false
    };
  });
  
  // Request Notification Permissions on mount
  useEffect(() => {
    const requestPerms = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display !== 'granted') {
             console.warn("User denied notifications - Alarms won't work in background");
          }
        } catch (e) { console.error("Permission request error", e); }
      }
    };
    requestPerms();
  }, []);

  useEffect(() => localStorage.setItem('ec_syllabus', JSON.stringify(syllabus)), [syllabus]);
  useEffect(() => localStorage.setItem('ec_sessions', JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem('ec_schedule', JSON.stringify(schedule)), [schedule]);
  useEffect(() => localStorage.setItem('ec_resources', JSON.stringify(resources)), [resources]);
  useEffect(() => localStorage.setItem('ec_alarms', JSON.stringify(alarms)), [alarms]);
  useEffect(() => localStorage.setItem('ec_user', JSON.stringify(user)), [user]);

  const startLongAlarm = async (item: any) => {
    const isNative = Capacitor.isNativePlatform();
    const soundId = item.soundId || 'focus_melody.mp3';
    const assetPath = `assets/${soundId}`;
    const volume = item.volume ?? 0.6;

    if (isNative) {
      try {
        // Fix: Removed 'isVerification' as it is not a valid property of PreloadOptions
        await NativeAudio.preload({
          assetId: 'alarm_active',
          assetPath: assetPath,
          audioChannelNum: 1
        });
        await NativeAudio.setVolume({ assetId: 'alarm_active', volume });
        await NativeAudio.loop({ assetId: 'alarm_active' });
        nativeAudioActiveRef.current = 'alarm_active';
      } catch (e) {
        console.error("Native audio failed, trying web fallback", e);
        playWebAudio(assetPath, volume);
      }
    } else {
      playWebAudio(assetPath, volume);
    }

    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    autoStopTimeoutRef.current = setTimeout(() => stopAlarmSound(), 45000); 
  };

  const playWebAudio = (src: string, volume: number) => {
    if (alarmAudioRef.current) return;
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.loop = true;
      audio.play().catch(console.error);
      alarmAudioRef.current = audio;
    } catch (e) {}
  };

  const stopAlarmSound = async () => {
    if (nativeAudioActiveRef.current) {
      try {
        await NativeAudio.stop({ assetId: nativeAudioActiveRef.current });
        await NativeAudio.unload({ assetId: nativeAudioActiveRef.current });
      } catch (e) {}
      nativeAudioActiveRef.current = null;
    }

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current = null;
    }
    
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);

    if (ringingAlarm && ringingAlarm.repeatType === 'once') {
      setAlarms(prev => prev.map(a => a.id === ringingAlarm.id ? { ...a, isEnabled: false } : a));
    }
    setRingingAlarm(null);
  };

  useEffect(() => {
    const checkEvents = () => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentDay = now.getDay();
      const timeKey = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
      const minuteId = `${timeKey}-${now.getDate()}`;
      const futureDate = new Date(now.getTime() + 5 * 60000);
      const futureTimeKey = `${futureDate.getHours().toString().padStart(2, '0')}:${futureDate.getMinutes().toString().padStart(2, '0')}`;

      alarms.forEach(alarm => {
        if (!alarm.isEnabled) return;
        const isCorrectDay = alarm.repeatType === 'once' || alarm.repeatType === 'daily' || 
          (alarm.repeatType === 'custom' && alarm.repeatDays?.includes(currentDay));

        if (isCorrectDay && alarm.time === timeKey && !notifiedRefs.current.has(`alarm-${alarm.id}-${minuteId}`)) {
          startLongAlarm(alarm);
          setRingingAlarm({ ...alarm, type: 'alarm' });
          notifiedRefs.current.add(`alarm-${alarm.id}-${minuteId}`);
        }
      });

      schedule.forEach(event => {
        if (!event.days.includes(currentDay)) return;
        if (event.startTime === timeKey && !notifiedRefs.current.has(`routine-start-${event.id}-${minuteId}`)) {
          startLongAlarm(event); 
          setRingingAlarm({ ...event, type: 'routine' });
          notifiedRefs.current.add(`routine-start-${event.id}-${minuteId}`);
        }
        if (event.startTime === futureTimeKey && !notifiedRefs.current.has(`routine-remind-${event.id}-${minuteId}`)) {
          setNotification({
            title: "Upcoming Session",
            message: `Your ${event.subject || ''} routine "${event.title}" starts in 5 mins!`
          });
          notifiedRefs.current.add(`routine-remind-${event.id}-${minuteId}`);
        }
      });
    };

    const interval = setInterval(checkEvents, 10000); 
    return () => clearInterval(interval);
  }, [alarms, schedule]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard syllabus={syllabus} sessions={sessions} setSessions={setSessions} user={user} />;
      case 'syllabus': return <SyllabusTracker syllabus={syllabus} setSyllabus={setSyllabus} />;
      case 'timer': return <TimerTools alarms={alarms} setAlarms={setAlarms} syllabus={syllabus} onSessionComplete={(session) => setSessions([...sessions, session])} />;
      case 'schedule': return <ScheduleManager schedule={schedule} setSchedule={setSchedule} />;
      case 'vault': return <ResourceVault resources={resources} setResources={setResources} />;
      case 'profile': return <UserProfileView user={user} setUser={setUser} />;
      default: return <Dashboard syllabus={syllabus} sessions={sessions} setSessions={setSessions} user={user} />;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 shadow-2xl overflow-hidden relative">
      {ringingAlarm && (
        <div className="fixed inset-0 z-[200] bg-indigo-600 flex flex-col items-center justify-center p-8 text-white animate-in fade-in duration-300 text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
            <div className="relative bg-white/20 p-8 rounded-full">
              {ringingAlarm.type === 'routine' ? <CalendarDays className="w-16 h-16" /> : <AlarmClock className="w-16 h-16" />}
            </div>
          </div>
          <h2 className="text-4xl font-black mb-2 tracking-tighter uppercase leading-none">
            {ringingAlarm.type === 'routine' ? 'Routine Start!' : 'Focus Time!'}
          </h2>
          <div className="space-y-1 mb-12">
            <p className="text-xl font-bold">{ringingAlarm.title || ringingAlarm.topic || 'New Session'}</p>
            {ringingAlarm.subject && <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px]">{ringingAlarm.subject}</p>}
          </div>
          <button onClick={stopAlarmSound} className="w-full bg-white text-indigo-600 py-5 rounded-3xl font-black text-lg uppercase tracking-[0.15em] shadow-2xl active:scale-95 transition-transform">Dismiss</button>
        </div>
      )}

      {notification && (
        <div className="absolute top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-full duration-500">
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl"><Bell className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{notification.title}</p>
                <p className="text-sm font-medium opacity-90">{notification.message}</p>
              </div>
            </div>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('dashboard')} className="w-10 h-10 overflow-hidden active:scale-95 transition-transform">
            <img 
              src="./logo.png" 
              onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3069/3069186.png"; }}
              className="w-full h-full object-contain" 
              alt="Logo" 
            />
          </button>
          <div><h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">ExamCrush</h1><p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Study Buddy</p></div>
        </div>
        <button onClick={() => setActiveTab('profile')} className={`flex transition-all ${activeTab === 'profile' ? 'ring-2 ring-indigo-500 ring-offset-2 rounded-full' : ''}`}><img src={user.avatar} className="w-9 h-9 rounded-full border-2 border-white shadow-md object-cover" alt="avatar" /></button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">{renderTabContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t flex justify-around py-2 safe-area-bottom z-50">
        <NavButton active={activeTab === 'dashboard'} icon={LayoutDashboard} label="Home" onClick={() => setActiveTab('dashboard')} />
        <NavButton active={activeTab === 'syllabus'} icon={CheckSquare} label="Syllabus" onClick={() => setActiveTab('syllabus')} />
        <NavButton active={activeTab === 'timer'} icon={Timer} label="Focus" onClick={() => setActiveTab('timer')} />
        <NavButton active={activeTab === 'schedule'} icon={Calendar} label="Plan" onClick={() => setActiveTab('schedule')} />
        <NavButton active={activeTab === 'vault'} icon={FileText} label="Vault" onClick={() => setActiveTab('vault')} />
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    <Icon className={`w-6 h-6 ${active ? 'fill-indigo-50' : ''}`} />
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);

export default App;
