
import React, { useState } from 'react';
import { Plus, Clock, X } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ScheduleEvent } from '../types';

interface Props {
  schedule: ScheduleEvent[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ScheduleManager: React.FC<Props> = ({ schedule, setSchedule }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('11:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const addEvent = async () => {
    if (!newTitle || selectedDays.length === 0) return;
    
    const eventId = Date.now().toString();
    const event: ScheduleEvent = {
      id: eventId,
      title: newTitle,
      subject: newSubject,
      startTime: newStart,
      endTime: newEnd,
      days: selectedDays
    };

    if (Capacitor.isNativePlatform()) {
      const [hours, minutes] = newStart.split(':').map(Number);
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);
      if (scheduleDate <= new Date()) scheduleDate.setDate(scheduleDate.getDate() + 1);

      const reminderDate = new Date(scheduleDate.getTime() - 5 * 60000);
      const idBase = parseInt(eventId.slice(-6));

      try {
        // Audible 5-minute warning
        if (reminderDate > new Date()) {
          await LocalNotifications.schedule({
            notifications: [{
              id: idBase + 200,
              title: `Study Routine Starts Soon! ⏰`,
              body: `Your ${newSubject || 'Study'} session for "${newTitle}" begins in 5 mins.`,
              schedule: { at: reminderDate },
              channelId: 'examcrush-routines',
              sound: 'energy_boost.mp3', // Explicit audible sound
              smallIcon: 'ic_stat_icon_config_sample',
            }]
          });
        }

        // Main Routine Alarm
        await LocalNotifications.schedule({
          notifications: [{
            id: idBase,
            title: `Routine Start! ⏰`,
            body: `${newSubject}: ${newTitle}`,
            schedule: { at: scheduleDate },
            channelId: 'examcrush-routines',
            sound: 'energy_boost.mp3',
            smallIcon: 'ic_stat_icon_config_sample',
          }]
        });
      } catch (e) { console.error("Routine schedule error", e); }
    }

    setSchedule([...schedule, event]);
    setShowAdd(false);
    setNewTitle('');
    setNewSubject('');
    setSelectedDays([]);
  };

  const removeEvent = (id: string) => {
    setSchedule(schedule.filter(s => s.id !== id));
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Your Routine</h2>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-transform"><Plus className="w-4 h-4" /> Add Slot</button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800">New Study Session</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Topic (e.g. Algebra)" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input type="text" placeholder="Subject (e.g. Maths)" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Start</label>
              <input type="time" className="w-full bg-slate-50 p-3 rounded-xl text-sm border-none font-bold text-slate-700" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">End</label>
              <input type="time" className="w-full bg-slate-50 p-3 rounded-xl text-sm border-none font-bold text-slate-700" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block">Repeat on</label>
            <div className="flex justify-between">
              {DAYS.map((day, idx) => (
                <button key={day} onClick={() => toggleDay(idx)} className={`w-9 h-9 rounded-full text-[10px] font-bold transition-all ${selectedDays.includes(idx) ? 'bg-indigo-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-500'}`}>{day[0]}</button>
              ))}
            </div>
          </div>
          <button onClick={addEvent} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-transform">Save Routine</button>
        </div>
      )}

      <div className="space-y-4 pb-20">
        {schedule.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200"><Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No schedule planned yet</p></div>
        ) : (
          schedule.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{event.title} <span className="text-slate-400 font-medium text-xs ml-1">• {event.subject}</span></h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">{event.startTime} - {event.endTime}</span>
                  <div className="flex gap-1">{event.days.sort().map(d => (<span key={d} className="text-[10px] text-slate-300 font-bold uppercase">{DAYS[d][0]}</span>))}</div>
                </div>
              </div>
              <button onClick={() => removeEvent(event.id)} className="text-slate-200 hover:text-rose-500 p-2 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduleManager;
