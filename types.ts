
export interface SyllabusItem {
  id: string;
  title: string;
  isCompleted: boolean;
  subject: string;
}

export interface StudySession {
  id: string;
  date: string; // ISO string
  durationMinutes: number;
  subject: string;
  topic?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  subject?: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  days: number[]; // 0-6 (Sun-Sat)
}

export interface ResourceFile {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'image' | 'other';
  url: string;
  lastOpened: string;
}

export interface UserProfile {
  name: string;
  avatar: string;
  isLoggedIn: boolean;
  email?: string;
}

export interface Alarm {
  id: string;
  time: string; // "HH:mm"
  topic?: string;
  subject?: string;
  isEnabled: boolean;
  volume?: number; // 0 to 1
  soundType: 'prebuilt' | 'custom';
  soundId?: string; 
  customSoundData?: string; // base64 audio
  customSoundName?: string;
  repeatType: 'once' | 'daily' | 'custom';
  repeatDays?: number[]; // 0-6
}

export type AppTab = 'dashboard' | 'syllabus' | 'timer' | 'schedule' | 'vault' | 'profile';
export type TimerMode = 'pomodoro' | 'stopwatch' | 'alarms';
