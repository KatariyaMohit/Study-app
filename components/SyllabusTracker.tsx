
// Import useMemo from react
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Check, Search, CheckSquare } from 'lucide-react';
import { SyllabusItem } from '../types';

interface Props {
  syllabus: SyllabusItem[];
  setSyllabus: React.Dispatch<React.SetStateAction<SyllabusItem[]>>;
}

const SyllabusTracker: React.FC<Props> = ({ syllabus, setSyllabus }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [search, setSearch] = useState('');

  // Generate unique subjects list case-insensitively
  const subjectsList = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    syllabus.forEach(s => {
      const normalized = s.subject.trim().toLowerCase();
      // Keep the most "capitalized" or first version found for display
      if (!uniqueMap.has(normalized)) {
        uniqueMap.set(normalized, s.subject.trim());
      }
    });
    return ['All', ...Array.from(uniqueMap.values())].sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [syllabus]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim()) return;
    const newItem: SyllabusItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      subject: newSubject.trim(),
      isCompleted: false,
    };
    setSyllabus([newItem, ...syllabus]);
    setNewTitle('');
    setNewSubject('');
  };

  const toggleItem = (id: string) => {
    setSyllabus(syllabus.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const deleteItem = (id: string) => {
    setSyllabus(syllabus.filter(item => item.id !== id));
  };

  const filtered = syllabus.filter(item => {
    // Compare subject case-insensitively
    const matchesSubject = filterSubject === 'All' || 
      item.subject.trim().toLowerCase() === filterSubject.trim().toLowerCase();
    
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Grouping items by subject for visual progress bars - also case-insensitive grouping
  const groupedBySubject = filtered.reduce((acc, item) => {
    const normalizedSubj = item.subject.trim().toLowerCase();
    // Find if we already have a key for this normalized subject
    const existingKey = Object.keys(acc).find(k => k.toLowerCase() === normalizedSubj);
    const key = existingKey || item.subject.trim();
    
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, SyllabusItem[]>);

  const sortedSubjects = Object.keys(groupedBySubject).sort();

  const getSubjectProgress = (items: SyllabusItem[]) => {
    const completed = items.filter(i => i.isCompleted).length;
    return items.length > 0 ? (completed / items.length) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Add Topic</h2>
        <form onSubmit={addItem} className="space-y-3">
          <input 
            type="text" 
            placeholder="Topic name (e.g., Organic Chemistry)" 
            className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Subject" 
              className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border-none text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <button 
              type="submit" 
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide px-1">
        {subjectsList.map(subj => (
          <button 
            key={subj}
            onClick={() => setFilterSubject(subj)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterSubject.toLowerCase() === subj.toLowerCase() 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search topics..." 
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-100 text-sm font-semibold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-8 pb-4">
        {sortedSubjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="text-slate-300 w-8 h-8" />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No topics found</p>
          </div>
        ) : (
          sortedSubjects.map(subjectName => {
            const items = groupedBySubject[subjectName];
            const progress = getSubjectProgress(items);
            
            return (
              <div key={subjectName} className="space-y-3 px-1">
                {/* Subject Header & Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600">{subjectName}</h3>
                    <span className="text-[10px] font-black text-slate-300">{Math.round(progress)}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>

                {/* Items in this Subject */}
                <div className="space-y-3">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${
                        item.isCompleted ? 'bg-slate-50/50 border-slate-100 opacity-70' : 'bg-white border-slate-100 shadow-sm'
                      }`}
                    >
                      <button 
                        onClick={() => toggleItem(item.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          item.isCompleted ? 'bg-indigo-600 text-white scale-100' : 'border-2 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {item.isCompleted && <Check className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold transition-colors truncate ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {item.title}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteItem(item.id)}
                        className="text-slate-200 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SyllabusTracker;
