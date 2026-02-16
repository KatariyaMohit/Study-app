
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlarmClock, Plus, Trash2, Bell, X, Edit2, Music, ChevronDown, CalendarDays, Target, CheckCircle, Volume2 } from 'lucide-react';
import { NativeAudio } from '@capacitor-community/native-audio';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { StudySession, Alarm, TimerMode, SyllabusItem } from '../types';

interface Props {
  onSessionComplete: (session: StudySession) => void;
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
  syllabus?: SyllabusItem[];
}

const PREBUILT_SOUNDS = [
  { id: 'focus_melody.mp3', name: 'Focus Melody' },
  { id: 'energy_boost.mp3', name: 'Morning Energy' },
  { id: 'nature_calm.mp3', name: 'Nature Calm' },
  { id: 'lofi_beat.mp3', name: 'Lo-Fi Study' },
];

const PRESETS = [15, 25, 45, 60];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TimerTools: React.FC<Props> = ({ onSessionComplete, alarms, setAlarms, syllabus = [] }) => {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);

  const [currentFocus, setCurrentFocus] = useState<SyllabusItem | null>(
    syllabus.length > 0 ? syllabus[0] : null
  );
  
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [newAlarmTime, setNewAlarmTime] = useState('09:00');
  const [newAlarmTopic, setNewAlarmTopic] = useState('');
  const [newAlarmSubject, setNewAlarmSubject] = useState('');
  const [newAlarmVolume, setNewAlarmVolume] = useState(0.8);
  const [newSoundType, setNewSoundType] = useState<'prebuilt' | 'custom'>('prebuilt');
  const [newSoundId, setNewSoundId] = useState('focus_melody.mp3');
  const [newCustomSoundData, setNewCustomSoundData] = useState<string | undefined>(undefined);
  const [newCustomSoundName, setNewCustomSoundName] = useState<string | undefined>(undefined);
  const [newRepeatType, setNewRepeatType] = useState<'once' | 'daily' | 'custom'>('once');
  const [newRepeatDays, setNewRepeatDays] = useState<number[]>([]);
  
  const timerRef = useRef<any | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewAlarmSound = async () => {
    const isNative = Capacitor.isNativePlatform();
    const assetPath = (newSoundType === 'custom' && newCustomSoundData) 
      ? newCustomSoundData 
      : `assets/${newSoundId}`;

    if (isNative && newSoundType === 'prebuilt') {
      try {
        await NativeAudio.preload({ assetId: 'preview_sound', assetPath, audioChannelNum: 1 });
        await NativeAudio.setVolume({ assetId: 'preview_sound', volume: newAlarmVolume });
        await NativeAudio.play({ assetId: 'preview_sound' });
        setTimeout(async () => {
          try { await NativeAudio.stop({ assetId: 'preview_sound' }); await NativeAudio.unload({ assetId: 'preview_sound' }); } catch (e) {}
        }, 5000);
      } catch (e) { webPreviewFallback(assetPath); }
    } else {
      webPreviewFallback(assetPath);
    }
  };

  const webPreviewFallback = (src: string) => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    try {
      const audio = new Audio(src);
      audio.volume = newAlarmVolume;
      audio.play().catch(() => {});
      previewAudioRef.current = audio;
      setTimeout(() => { if (previewAudioRef.current === audio) audio.pause(); }, 5000);
    } catch (e) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewCustomSoundData(event.target?.result as string);
        setNewCustomSoundName(file.name);
        setNewSoundType('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === 'pomodoro') {
          setTimeLeft((prev) => (prev <= 1 ? (handleFinish(), 0) : prev - 1));
        } else if (mode === 'stopwatch') {
          setStopwatchTime((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, mode]);

  const handleFinish = () => {
    const elapsedSeconds = mode === 'pomodoro' ? (initialTime - timeLeft) : stopwatchTime;
    if (elapsedSeconds >= 30) {
      onSessionComplete({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)), 
        subject: currentFocus?.subject || 'General',
        topic: currentFocus?.title || 'Focused Study'
      });
    }
    reset();
  };

  const reset = () => { setIsActive(false); if (mode === 'pomodoro') setTimeLeft(initialTime); else setStopwatchTime(0); };
  const setPreset = (mins: number) => { setInitialTime(mins * 60); setTimeLeft(mins * 60); setIsActive(false); };

  const openAddForm = () => {
    setEditingAlarmId(null); setNewAlarmTime('09:00'); setNewAlarmTopic(''); setNewAlarmSubject('');
    setNewAlarmVolume(0.8); setNewSoundType('prebuilt'); setNewSoundId('focus_melody.mp3');
    setNewCustomSoundData(undefined); setNewCustomSoundName(undefined); setNewRepeatType('once');
    setNewRepeatDays([]); setShowAddAlarm(true);
  };

  const openEditForm = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id); 
    setNewAlarmTime(alarm.time); 
    setNewAlarmTopic(alarm.topic || '');
    setNewAlarmSubject(alarm.subject || ''); 
    setNewAlarmVolume(alarm.volume ?? 0.8);
    setNewSoundType(alarm.soundType); 
    setNewSoundId(alarm.soundId || 'focus_melody.mp3');
    setNewCustomSoundData(alarm.customSoundData); 
    setNewCustomSoundName(alarm.customSoundName);
    setNewRepeatType(alarm.repeatType); 
    setNewRepeatDays(alarm.repeatDays || []);
    setShowAddAlarm(true);
  };

  const getNextAlarmDate = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const target = new Date();
    // FORCE exact 00 seconds and 0ms for maximum precision
    target.setHours(h, m, 0, 0); 
    if (target <= new Date()) target.setDate(target.getDate() + 1);
    return target;
  };

  const saveAlarm = async () => {
    if (!newAlarmTime) return;
    
    const alarmId = editingAlarmId || Date.now().toString();
    const scheduledDate = getNextAlarmDate(newAlarmTime);
    const idInt = parseInt(alarmId.slice(-7));

    if (Capacitor.isNativePlatform()) {
      try {
        // 1. Cancel previous versions of this notification set
        await LocalNotifications.cancel({ notifications: [{ id: idInt }, { id: idInt + 1 }] });

        // 2. Schedule Pre-warning 5 mins before (Notification Only)
        const warnDate = new Date(scheduledDate.getTime() - 5 * 60000);
        if (warnDate > new Date()) {
          await LocalNotifications.schedule({
            notifications: [{
              id: idInt + 1,
              title: "Starting in 5 Minutes! 📚",
              body: `Ready for ${newAlarmSubject || 'Study'}? Topic: ${newAlarmTopic}`,
              schedule: { at: warnDate, allowWhileIdle: true },
              channelId: 'examcrush-routines',
              extra: { type: 'reminder' }
            }]
          });
        }

        // 3. Schedule Main Alarm (Full Screen Trigger)
        await LocalNotifications.schedule({
          notifications: [{
            id: idInt,
            title: "Study Session Start! 🚀",
            body: `${newAlarmSubject}: ${newAlarmTopic}`,
            schedule: { at: scheduledDate, allowWhileIdle: true },
            channelId: 'examcrush-alarms',
            extra: { alarmId: alarmId, type: 'alarm' }
          }]
        });
      } catch (e) { console.error("Schedule error", e); }
    }

    const alarmData: Alarm = {
      id: alarmId, time: newAlarmTime, topic: newAlarmTopic,
      subject: newAlarmSubject, volume: newAlarmVolume, soundType: newSoundType,
      soundId: newSoundId, customSoundData: newCustomSoundData, customSoundName: newCustomSoundName,
      repeatType: newRepeatType, repeatDays: newRepeatDays, isEnabled: true
    };

    setAlarms(prev => {
      const idx = prev.findIndex(a => a.id === alarmId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = alarmData;
        return copy;
      }
      return [alarmData, ...prev];
    });
    
    setShowAddAlarm(false);
    setEditingAlarmId(null);
  };

  const deleteAlarm = async (id: string) => {
    if (Capacitor.isNativePlatform()) {
      const idInt = parseInt(id.slice(-7));
      await LocalNotifications.cancel({ notifications: [{ id: idInt }, { id: idInt + 1 }] });
    }
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius; 

  return (
    <div className="flex flex-col items-center space-y-6 py-2">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full">
        {(['pomodoro', 'stopwatch', 'alarms'] as TimerMode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); reset(); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>
            {m}
          </button>
        ))}
      </div>

      {mode !== 'alarms' ? (
        <>
          <div className="w-full bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
             <div className="flex items-center gap-2 px-1">
                <Target className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recording Focus For</span>
             </div>
             <div className="relative">
                <select className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-indigo-500" value={currentFocus?.id || ''} onChange={(e) => { const s = syllabus.find(s => s.id === e.target.value); if (s) setCurrentFocus(s); }} disabled={isActive}>
                  {syllabus.length === 0 ? <option value="">No topics added yet</option> : syllabus.map(t => <option key={t.id} value={t.id}>{t.subject}: {t.title}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
          </div>

          <div className="relative w-80 h-80 flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} className="stroke-slate-50 fill-none" strokeWidth="5" />
              {mode === 'pomodoro' && <circle cx="100" cy="100" r={radius} className="stroke-indigo-600 fill-none transition-all duration-1000" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * ((initialTime - timeLeft) / initialTime))} strokeLinecap="round" />}
            </svg>
            <div className="text-center z-10 flex flex-col items-center">
              <p className="text-6xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                {mode === 'pomodoro' ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` : `${Math.floor(stopwatchTime / 60).toString().padStart(2, '0')}:${(stopwatchTime % 60).toString().padStart(2, '0')}`}
              </p>
            </div>
          </div>

          <div className="flex gap-8 items-center">
            <button onClick={reset} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:scale-105 active:scale-90 transition-transform"><RotateCcw className="w-5 h-5" /></button>
            <button onClick={() => setIsActive(!isActive)} className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 hover:bg-indigo-700 transition-all">{isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-1" />}</button>
            <button className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:scale-105 active:scale-90 transition-transform" onClick={() => setMode('alarms')}><AlarmClock className="w-5 h-5" /></button>
          </div>
        </>
      ) : (
        <div className="w-full space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Your Alarms</h3>
            <button onClick={openAddForm} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"><Plus className="w-3 h-3" /> Add Alarm</button>
          </div>

          {showAddAlarm && (
            <div className="bg-white border-2 border-indigo-100 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex justify-between items-center"><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{editingAlarmId ? 'Update Alarm' : 'Set New Alarm'}</span><button onClick={() => setShowAddAlarm(false)}><X className="w-5 h-5 text-slate-300" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold" value={newAlarmTime} onChange={e => setNewAlarmTime(e.target.value)} />
                <input type="text" placeholder="Subject" className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold" value={newAlarmSubject} onChange={e => setNewAlarmSubject(e.target.value)} />
              </div>
              <input type="text" placeholder="Topic name" className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold" value={newAlarmTopic} onChange={e => setNewAlarmTopic(e.target.value)} />
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-slate-400">Alarm Volume</label><button onClick={previewAlarmSound} className="text-[9px] font-black text-indigo-600 uppercase">Test</button></div>
                <input type="range" min="0" max="1" step="0.1" value={newAlarmVolume} onChange={e => setNewAlarmVolume(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
              </div>
              <button onClick={saveAlarm} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Save Alarm</button>
            </div>
          )}

          <div className="space-y-4">
            {alarms.map(alarm => (
              <div key={alarm.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between ${!alarm.isEnabled && 'opacity-60 grayscale'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><AlarmClock className="w-5 h-5" /></div>
                  <div><p className="text-2xl font-black text-slate-800">{alarm.time}</p><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{alarm.subject}: {alarm.topic}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditForm(alarm)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteAlarm(alarm.id)} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerTools;
