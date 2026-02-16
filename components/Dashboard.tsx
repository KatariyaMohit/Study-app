
import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { SyllabusItem, StudySession, UserProfile } from '../types';
import { TrendingUp, Clock, CheckCircle2, Trophy, Target, CalendarDays, BookOpen, Hash, Edit2, Save, X, Trash2, Check } from 'lucide-react';

interface Props {
  syllabus: SyllabusItem[];
  sessions: StudySession[];
  setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  user: UserProfile;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pb-2 border-b border-slate-50">
          {new Date(data.fullDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <div className="space-y-2.5">
          {data.details.length === 0 ? (
             <p className="text-xs font-bold text-slate-300 italic py-1">No sessions recorded</p>
          ) : (
            data.details.map((d: any, i: number) => (
              <div key={i} className="flex flex-col border-l-2 border-indigo-500 pl-2">
                <p className="text-[11px] font-black text-slate-800 leading-tight truncate max-w-[150px]">{d.topic}</p>
                <div className="flex justify-between items-center mt-1 gap-4">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter truncate">{d.subject}</span>
                  <span className="text-[9px] font-black text-slate-400 whitespace-nowrap">{d.count}x • {d.mins}m</span>
                </div>
              </div>
            ))
          )}
        </div>
        {data.minutes > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
             <span className="text-[9px] font-bold text-slate-400 uppercase">Daily Total</span>
             <span className="text-xs font-black text-indigo-600">{data.minutes}m</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<Props> = ({ syllabus, sessions, setSessions, user }) => {
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  }), []);

  const [selectedDate, setSelectedDate] = useState<string>(last7Days[6]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Local edit states
  const [editTopic, setEditTopic] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editMins, setEditMins] = useState(0);

  const completedCount = syllabus.filter(i => i.isCompleted).length;
  const totalCount = syllabus.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const chartData = useMemo(() => last7Days.map(date => {
    const daySessions = sessions.filter(s => s.date.startsWith(date));
    const minutes = daySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    
    const grouped = daySessions.reduce((acc, s) => {
      const subjectKey = (s.subject || 'General').trim().toLowerCase();
      const topicKey = (s.topic || 'General Focus').trim().toLowerCase();
      const key = `${subjectKey}:${topicKey}`;
      
      if (!acc[key]) {
        acc[key] = { 
          subject: s.subject || 'General', 
          topic: s.topic || 'General Focus', 
          count: 0, 
          mins: 0 
        };
      }
      acc[key].count++;
      acc[key].mins += s.durationMinutes;
      return acc;
    }, {} as Record<string, any>);

    return {
      date: date.slice(5),
      fullDate: date,
      minutes,
      details: Object.values(grouped)
    };
  }), [sessions, last7Days]);

  const totalFocusHours = (sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60).toFixed(1);
  const dailySessions = sessions.filter(s => s.date.startsWith(selectedDate));

  const startEditing = (e: React.MouseEvent, session: StudySession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTopic(session.topic || '');
    setEditSubject(session.subject || '');
    setEditMins(session.durationMinutes);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { 
      ...s, 
      topic: editTopic.trim(), 
      subject: editSubject.trim(), 
      durationMinutes: Number(editMins) || 0 
    } : s));
    setEditingId(null);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Hi, {user.name.split(' ')[0]}! 👋</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Overall Progress</span>
            <h2 className="text-3xl font-black">{progressPercent}%</h2>
            <div className="flex items-center gap-2 mt-4 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/10">
              <Target className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">{completedCount} / {totalCount} Topics Done</span>
            </div>
          </div>
          
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" className="stroke-white/10 fill-none" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40"
                className="stroke-white fill-none transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * progressPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white/40" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Focus Time</p>
            <p className="text-lg font-bold text-slate-800">{totalFocusHours}h</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Topics Done</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-bold text-slate-800">{completedCount}<span className="text-slate-400 text-xs font-semibold">/{totalCount}</span></p>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRENDS CHART BOX - REMOVED YELLOW BORDERS, ADDED SYMMETRY */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm outline-none">
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="font-bold text-slate-800 text-sm">Study Trends</h3>
          <div className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase tracking-widest">Select a day</span>
          </div>
        </div>
        
        <div className="h-48 w-full outline-none" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              // Fix for errors on lines 215-216: Cast data to any because MouseHandlerDataParam is missing activePayload property in library typings
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload.length > 0) {
                  setSelectedDate(data.activePayload[0].payload.fullDate);
                }
              }}
              margin={{ top: 0, right: 15, left: 15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 900}}
                dy={5}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis hide />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{fill: '#f8fafc', radius: 8}}
                trigger="click"
              />
              <Bar 
                dataKey="minutes" 
                radius={[8, 8, 8, 8]} 
                barSize={20}
                className="cursor-pointer outline-none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fullDate === selectedDate ? '#4f46e5' : '#e2e8f0'} 
                    className="transition-all duration-300 outline-none"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest">
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
              </h4>
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {dailySessions.reduce((acc, s) => acc + s.durationMinutes, 0)}m focus
            </span>
          </div>

          {dailySessions.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-6 h-6 text-slate-200 mx-auto mb-2" />
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No study tracked for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailySessions.map((session) => (
                <div key={session.id} className={`bg-white p-4 rounded-2xl border transition-all ${editingId === session.id ? 'border-indigo-500 shadow-lg ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
                  {editingId === session.id ? (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Topic</label>
                        <input 
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                            <input 
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Minutes</label>
                            <input 
                              type="number"
                              className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={editMins}
                              onChange={(e) => setEditMins(Number(e.target.value))}
                            />
                         </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button 
                          onClick={(e) => saveEdit(e, session.id)}
                          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Save className="w-3.5 h-3.5" /> Save changes
                        </button>
                        <button 
                          onClick={(e) => cancelEditing(e)}
                          className="bg-slate-100 text-slate-400 px-4 rounded-xl active:scale-95 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                          <Hash className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-700 truncate max-w-[140px] leading-tight">{session.topic || 'General Focus'}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded tracking-widest">
                              {session.subject || 'General'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-right shrink-0 mr-1">
                          <p className="text-xs font-black text-slate-800 leading-none mb-0.5">{session.durationMinutes}m</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">session</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => startEditing(e, session)}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {confirmDeleteId === session.id ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                              className="p-2 bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-100 transition-all animate-in zoom-in-90 active:scale-90"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(session.id); setTimeout(() => setConfirmDeleteId(null), 3000); }}
                              className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
