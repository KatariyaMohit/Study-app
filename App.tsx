
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

  // Setup Channels and Listeners
  useEffect(() => {
    const setupNativeChannels = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await LocalNotifications.requestPermissions();
          
          // ALARM: High priority, wakes phone
          await LocalNotifications.createChannel({
            id: 'examcrush-alarms',
            name: 'Critical Study Alarms',
            description: 'Full-screen ringing alarms',
            importance: 5, // MAX priority
            visibility: 1,
            sound: 'focus_melody.mp3',
            vibration: true,
          });

          // REMINDERS: Normal priority (5-min warnings)
          await LocalNotifications.createChannel({
            id: 'examcrush-routines',
            name: 'Study Reminders',
            description: 'Routine starts and 5-minute pre-warnings',
            importance: 4, 
            visibility: 1,
            vibration: true,
          });

          // LISTENER 1: Triggered when notification is received (foreground)
          LocalNotifications.addListener('localNotificationReceived', (notif) => {
            if (notif.extra?.type === 'alarm') {
              triggerRinging(notif.extra?.alarmId);
            } else {
              // Just a standard notification banner for 5-min warnings
              setNotification({ title: notif.title || 'Reminder', message: notif.body || '' });
            }
          });

          // LISTENER 2: Triggered when user taps the notification or fires from background
          LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            const notif = action.notification;
            if (notif.extra?.type === 'alarm') {
              triggerRinging(notif.extra?.alarmId);
            }
          });
        } catch (e) { console.error("Native notification config error", e); }
      }
    };
    setupNativeChannels();
  }, [alarms]);

  const triggerRinging = (alarmId: string) => {
    const foundAlarm = alarms.find(a => a.id === alarmId);
    if (foundAlarm) {
      startLongAlarm(foundAlarm);
      setRingingAlarm({ ...foundAlarm, type: 'alarm' });
    }
  };

  useEffect(() => {
    localStorage.setItem('ec_syllabus', JSON.stringify(syllabus));
    localStorage.setItem('ec_sessions', JSON.stringify(sessions));
    localStorage.setItem('ec_schedule', JSON.stringify(schedule));
    localStorage.setItem('ec_resources', JSON.stringify(resources));
    localStorage.setItem('ec_alarms', JSON.stringify(alarms));
    localStorage.setItem('ec_user', JSON.stringify(user));
  }, [syllabus, sessions, schedule, resources, alarms, user]);

  const startLongAlarm = async (item: any) => {
    const isNative = Capacitor.isNativePlatform();
    const assetPath = `assets/${item.soundId || 'focus_melody.mp3'}`;
    const volume = item.volume ?? 0.8;

    if (isNative) {
      try {
        await NativeAudio.preload({ assetId: 'active_alarm', assetPath, audioChannelNum: 1 });
        await NativeAudio.setVolume({ assetId: 'active_alarm', volume });
        await NativeAudio.loop({ assetId: 'active_alarm' });
        nativeAudioActiveRef.current = 'active_alarm';
      } catch (e) { playWebAudio(assetPath, volume); }
    } else {
      playWebAudio(assetPath, volume);
    }

    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
    autoStopTimeoutRef.current = setTimeout(() => stopAlarmSound(), 120000); // Ring for 2 minutes
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
    
    if (ringingAlarm?.repeatType === 'once') {
      setAlarms(prev => prev.map(a => a.id === ringingAlarm.id ? { ...a, isEnabled: false } : a));
    }
    setRingingAlarm(null);
  };

  // Immediate check when app opens to see if an alarm should be ringing right now
  useEffect(() => {
    const checkNow = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const timeKey = `${h}:${m}`;
      const active = alarms.find(a => a.isEnabled && a.time === timeKey);
      if (active && !ringingAlarm) {
        triggerRinging(active.id);
      }
    };
    checkNow();
    const interval = setInterval(checkNow, 10000); // Also check every 10s while app is open
    return () => clearInterval(interval);
  }, [alarms, ringingAlarm]);

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
      {/* Full Screen Alarm UI - High priority */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-8 text-white text-center bg-indigo-600 animate-in fade-in zoom-in duration-300">
          <div className="mb-12 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
            <div className="relative bg-white/20 p-10 rounded-full shadow-2xl">
              <AlarmClock className="w-20 h-20 text-white" />
            </div>
          </div>
          <h2 className="text-5xl font-black mb-4 tracking-tighter uppercase leading-none italic">
            STUDY TIME!
          </h2>
          <div className="space-y-2 mb-16">
            <p className="text-2xl font-bold opacity-90">{ringingAlarm.topic || 'New Session Starting'}</p>
            {ringingAlarm.subject && <p className="text-indigo-200 font-black uppercase tracking-[0.3em] text-xs">{ringingAlarm.subject}</p>}
          </div>
          <button 
            onClick={stopAlarmSound} 
            className="w-full bg-white text-indigo-600 py-7 rounded-[40px] font-black text-2xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
          >
            DISMISS ALARM
          </button>
        </div>
      )}

      {/* Standard Notification Toast */}
      {notification && (
        <div className="absolute top-4 left-4 right-4 z-[500] animate-in slide-in-from-top-full duration-500">
          <div className="bg-indigo-700 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500 flex items-center justify-between">
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

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">
        {renderTabContent()}
      </main>

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
