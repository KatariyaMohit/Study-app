
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
  
  // Alarm Form State
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [newAlarmTime, setNewAlarmTime] = useState('09:00');
  const [newAlarmTopic, setNewAlarmTopic] = useState('');
  const [newAlarmSubject, setNewAlarmSubject] = useState('');
  const [newAlarmVolume, setNewAlarmVolume] = useState(0.5);
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
        // Fix: Removed 'isVerification' as it is not a valid property of PreloadOptions
        await NativeAudio.preload({
          assetId: 'preview_sound',
          assetPath: assetPath,
          audioChannelNum: 1
        });
        await NativeAudio.setVolume({ assetId: 'preview_sound', volume: newAlarmVolume });
        await NativeAudio.play({ assetId: 'preview_sound' });
        // Auto-stop after 5 seconds to prevent infinite loop
        setTimeout(async () => {
          try { 
            await NativeAudio.stop({ assetId: 'preview_sound' }); 
            await NativeAudio.unload({ assetId: 'preview_sound' }); 
          } catch (e) {}
        }, 5000);
      } catch (e) {
        console.error("Native preview failed, falling back to web", e);
        webPreviewFallback(assetPath);
      }
    } else {
      webPreviewFallback(assetPath);
    }
  };

  const webPreviewFallback = (src: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
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
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleFinish();
              return 0;
            }
            return prev - 1;
          });
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
    const elapsedSeconds = mode === 'pomodoro' 
      ? (initialTime - timeLeft) 
      : stopwatchTime;

    if (elapsedSeconds >= 30) {
      const duration = Math.max(1, Math.round(elapsedSeconds / 60));
      onSessionComplete({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        durationMinutes: duration, 
        subject: currentFocus?.subject || 'General',
        topic: currentFocus?.title || 'Focused Study'
      });
    }
    reset();
  };

  const reset = () => {
    setIsActive(false);
    if (mode === 'pomodoro') setTimeLeft(initialTime);
    else setStopwatchTime(0);
  };

  const setPreset = (mins: number) => {
    const secs = mins * 60;
    setInitialTime(secs);
    setTimeLeft(secs);
    setIsActive(false);
  };

  const openAddForm = () => {
    setEditingAlarmId(null);
    setNewAlarmTime('09:00');
    setNewAlarmTopic('');
    setNewAlarmSubject('');
    setNewAlarmVolume(0.5);
    setNewSoundType('prebuilt');
    setNewSoundId('focus_melody.mp3');
    setNewCustomSoundData(undefined);
    setNewCustomSoundName(undefined);
    setNewRepeatType('once');
    setNewRepeatDays([]);
    setShowAddAlarm(true);
  };

  const openEditForm = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id);
    setNewAlarmTime(alarm.time);
    setNewAlarmTopic(alarm.topic || '');
    setNewAlarmSubject(alarm.subject || '');
    setNewAlarmVolume(alarm.volume ?? 0.5);
    setNewSoundType(alarm.soundType);
    setNewSoundId(alarm.soundId || 'focus_melody.mp3');
    setNewCustomSoundData(alarm.customSoundData);
    setNewCustomSoundName(alarm.customSoundName);
    setNewRepeatType(alarm.repeatType);
    setNewRepeatDays(alarm.repeatDays || []);
    setShowAddAlarm(true);
  };

  const saveAlarm = async () => {
    if (!newAlarmTime) return;

    // Schedule System Notification for background behavior
    if (Capacitor.isNativePlatform()) {
      const [hours, minutes] = newAlarmTime.split(':').map(Number);
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);
      if (scheduleDate <= new Date()) scheduleDate.setDate(scheduleDate.getDate() + 1);

      await LocalNotifications.schedule({
        notifications: [{
          id: parseInt(editingAlarmId || Date.now().toString().slice(-6)),
          title: `Focus Time! 📚`,
          body: `${newAlarmSubject || 'Study'}: ${newAlarmTopic || 'New Session'}`,
          schedule: { at: scheduleDate },
          channelId: 'examcrush-alarms', // Linked to the sound channel
          sound: newSoundId,
          smallIcon: 'ic_stat_icon_config_sample',
          actionTypeId: "",
          extra: null
        }]
      });
    }

    const alarmData: Alarm = {
      id: editingAlarmId || Date.now().toString(),
      time: newAlarmTime,
      topic: newAlarmTopic.trim(),
      subject: newAlarmSubject.trim(),
      volume: newAlarmVolume,
      soundType: newSoundType,
      soundId: newSoundId,
      customSoundData: newCustomSoundData,
      customSoundName: newCustomSoundName,
      repeatType: newRepeatType,
      repeatDays: newRepeatDays,
      isEnabled: true
    };
    if (editingAlarmId) setAlarms(prev => prev.map(a => a.id === editingAlarmId ? alarmData : a));
    else setAlarms(prev => [...prev, alarmData]);
    setShowAddAlarm(false);
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
                <select 
                  className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
                  value={currentFocus?.id || ''}
                  onChange={(e) => {
                    const selected = syllabus.find(s => s.id === e.target.value);
                    if (selected) setCurrentFocus(selected);
                  }}
                  disabled={isActive}
                >
                  {syllabus.length === 0 ? (
                    <option value="">No topics in syllabus yet</option>
                  ) : (
                    syllabus.map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.subject}: {topic.title}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
             </div>
          </div>

          {mode === 'pomodoro' && (
            <div className="flex gap-2 w-full justify-center">
              {PRESETS.map(p => (
                <button 
                  key={p} 
                  onClick={() => setPreset(p)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${initialTime === p * 60 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  {p}m
                </button>
              ))}
            </div>
          )}

          <div className="relative w-80 h-80 flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} className="stroke-slate-50 fill-none" strokeWidth="5" />
              {mode === 'pomodoro' && (
                <circle 
                  cx="100" cy="100" r={radius} 
                  className="stroke-indigo-600 fill-none transition-all duration-1000" 
                  strokeWidth="5" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={circumference - (circumference * ((initialTime - timeLeft) / initialTime))} 
                  strokeLinecap="round" 
                />
              )}
            </svg>
            <div className="text-center z-10 flex flex-col items-center">
              <p className="text-6xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                {mode === 'pomodoro' 
                  ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` 
                  : `${Math.floor(stopwatchTime / 60).toString().padStart(2, '0')}:${(stopwatchTime % 60).toString().padStart(2, '0')}`}
              </p>
              <p className="text-[10px] font-black text-indigo-400 uppercase mt-4 tracking-[0.2em]">
                {isActive ? 'Session in Progress' : 'Start Focus Timer'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 w-full">
            <div className="flex gap-8 items-center">
              <button onClick={reset} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => setIsActive(!isActive)} className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-transform active:scale-95">
                {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-1" />}
              </button>
              <button className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center" onClick={() => setMode('alarms')}>
                <AlarmClock className="w-5 h-5" />
              </button>
            </div>

            {((mode === 'pomodoro' && timeLeft < initialTime) || (mode === 'stopwatch' && stopwatchTime > 0)) && !isActive && (
              <button 
                onClick={handleFinish}
                className="flex items-center gap-2 bg-emerald-500 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 animate-in fade-in slide-in-from-bottom-2"
              >
                <CheckCircle className="w-4 h-4" /> Finish & Save Progress
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Your Alarms</h3>
            <button onClick={openAddForm} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"><Plus className="w-3 h-3" /> Add Alarm</button>
          </div>

          {showAddAlarm && (
            <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {editingAlarmId ? 'Edit Alarm' : 'Set New Alarm'}
                </span>
                <button onClick={() => setShowAddAlarm(false)} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                    <input type="time" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" value={newAlarmTime} onChange={(e) => setNewAlarmTime(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                    <input type="text" placeholder="Science" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" value={newAlarmSubject} onChange={(e) => setNewAlarmSubject(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic</label>
                  <input type="text" placeholder="Organic Chemistry Review" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" value={newAlarmTopic} onChange={(e) => setNewAlarmTopic(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Repeat Setting</label>
                  <div className="flex gap-2">
                    {['once', 'daily', 'custom'].map(type => (
                      <button key={type} onClick={() => setNewRepeatType(type as any)} className={`flex-1 py-2 rounded-xl text-[9px] font-bold uppercase transition-all ${newRepeatType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {newRepeatType === 'custom' && (
                    <div className="flex justify-between pt-1">
                      {DAYS.map((day, idx) => (
                        <button key={idx} onClick={() => {
                          setNewRepeatDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
                        }} className={`w-8 h-8 rounded-full text-[9px] font-black transition-all ${newRepeatDays.includes(idx) ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Alarm Song</label>
                  <div className="relative">
                    <select className="w-full bg-slate-50 appearance-none border-none rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500" value={newSoundType === 'custom' ? 'custom' : newSoundId} onChange={(e) => e.target.value === 'custom' ? fileInputRef.current?.click() : (setNewSoundType('prebuilt'), setNewSoundId(e.target.value))}>
                      {PREBUILT_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      <option value="custom">✨ {newCustomSoundName ? `Song: ${newCustomSoundName.slice(0, 15)}...` : 'Upload Custom Song'}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </div>

                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5">
                       <Volume2 className="w-3 h-3 text-slate-400" />
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</label>
                    </div>
                    {/* ENHANCED TEST SOUND BUTTON FOR ANDROID TOUCH REGISTRATION */}
                    <button 
                      onClick={(e) => { e.preventDefault(); previewAlarmSound(); }} 
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg active:scale-90 transition-all border border-indigo-200/50 shadow-sm"
                    >
                      Test Sound
                    </button>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={newAlarmVolume} onChange={(e) => setNewAlarmVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
              </div>

              <button onClick={saveAlarm} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-transform">
                {editingAlarmId ? 'Update Alarm' : 'Save Alarm'}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {alarms.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active reminders</p>
              </div>
            ) : (
              alarms.map(alarm => (
                <div key={alarm.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all ${!alarm.isEnabled && 'opacity-60 grayscale-[0.4]'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${alarm.isEnabled ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-50' : 'bg-slate-50 text-slate-300'}`}>
                      {alarm.soundType === 'custom' ? <Music className="w-5 h-5" /> : <AlarmClock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-slate-800 leading-none">{alarm.time}</p>
                        <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded tracking-widest">
                          {alarm.repeatType === 'once' ? 'Once' : alarm.repeatType === 'daily' ? 'Daily' : alarm.repeatDays?.map(d => DAYS[d]).join('')}
                        </span>
                      </div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                         {alarm.subject || 'Study'}: {alarm.topic || 'New Session'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditForm(alarm)} className="p-2.5 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, isEnabled: !a.isEnabled } : a))} className={`w-10 h-6 rounded-full relative transition-colors ${alarm.isEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${alarm.isEnabled ? 'left-5' : 'left-1'}`} />
                    </button>
                    <button onClick={() => setAlarms(alarms.filter(a => a.id !== alarm.id))} className="p-2.5 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerTools;
