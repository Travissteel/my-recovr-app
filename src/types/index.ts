export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  createdAt: string;
  profilePictureUrl?: string;
  bio?: string;
  privacySettings?: {
    profileVisibility: 'private' | 'public';
    progressSharing: boolean;
  };
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  stats?: {
    activePrograms: number;
    totalCheckins: number;
    longestCurrentStreak: number;
  };
}

export interface AddictionType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface RecoveryProgram {
  id: string;
  userId: string;
  addictionTypeId: string;
  programName: string;
  startDate: string;
  targetDurationDays?: number;
  currentStreak: number;
  longestStreak: number;
  lastRelapseDate?: string;
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  notes?: string;
  milestones: string[];
  createdAt: string;
  updatedAt: string;
  addictionType?: string;
  addictionColor?: string;
}

export interface DailyCheckin {
  id: string;
  userId: string;
  programId: string;
  checkinDate: string;
  moodRating: number;
  cravingsIntensity: number;
  stressLevel: number;
  sleepQuality: number;
  exerciseMinutes: number;
  meditationMinutes: number;
  journalEntry?: string;
  triggers: string[];
  copingStrategiesUsed: string[];
  supportSystemUsed: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface LoginData {
  email: string;
  password: string;
}