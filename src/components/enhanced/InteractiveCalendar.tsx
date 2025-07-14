import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import LoadingSpinner from '../LoadingSpinner';

// Types for calendar functionality
interface CalendarDay {
  date: string;
  checkins: Array<{
    programId: string;
    programName: string;
    addictionType: string;
    color: string;
    icon: string;
    mood?: number;
    energy?: number;
    craving?: number;
    sleep?: number;
    stress?: number;
    productivity?: number;
    triggerNotes?: string;
    gratitudeNotes?: string;
    recoveryActions?: string[];
  }>;
  triggers: Array<{
    type: string;
    intensity: number;
    situation: string;
    copingStrategy: string;
    outcome: string;
    notes: string;
  }>;
  achievements: Array<{
    key: string;
    points: number;
  }>;
  challenges: Array<{
    title: string;
    type: string;
    difficulty: number;
    status: string;
    points: number;
  }>;
  dayType: 'normal' | 'streak' | 'relapse' | 'milestone';
  overallMood?: number;
  streakDays: Record<string, {
    programName: string;
    addictionType: string;
    color: string;
    icon: string;
    streakDay: number;
  }>;
}

interface CalendarData {
  month: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
  };
  programs: Array<{
    id: string;
    name: string;
    addictionType: string;
    color: string;
    icon: string;
    currentStreak: number;
    totalDays: number;
  }>;
  calendarData: CalendarDay[];
  monthlyStats: {
    totalCheckins: number;
    totalTriggers: number;
    totalAchievements: number;
    completedChallenges: number;
    averageMood: number;
    streakDays: number;
    milestoneDays: number;
  };
}

interface TriggerModalData {
  triggerDate: string;
  triggerType: string;
  intensityLevel: number;
  situationDescription: string;
  copingStrategyUsed: string;
  outcome: string;
  notes: string;
}

const InteractiveCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Fetch calendar data for current month
  const fetchCalendarData = async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const response = await api.get<CalendarData>(`/calendar/month/${year}/${month}`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchCalendarData(year, month);
  }, [currentDate]);

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Get day data by date
  const getDayData = (date: string): CalendarDay | undefined => {
    return calendarData?.calendarData.find(day => day.date === date);
  };

  // Handle day click
  const handleDayClick = async (date: string) => {
    setSelectedDate(date);
    try {
      const response = await api.get(`/calendar/day/${date}`);
      setSelectedDay(response.data);
    } catch (error) {
      console.error('Failed to fetch day data:', error);
    }
  };

  // Get day style based on data
  const getDayStyle = (dayData: CalendarDay | undefined, dateStr: string) => {
    if (!dayData) return 'bg-gray-50 dark:bg-gray-800 text-gray-400';

    let baseStyle = 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600';
    
    // Day type styling
    if (dayData.dayType === 'milestone') {
      baseStyle = 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 text-yellow-900 dark:text-yellow-100';
    } else if (dayData.dayType === 'streak') {
      baseStyle = 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 text-green-900 dark:text-green-100';
    } else if (dayData.dayType === 'relapse') {
      baseStyle = 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 text-red-900 dark:text-red-100';
    }

    return baseStyle;
  };

  // Get mood color
  const getMoodColor = (mood?: number): string => {
    if (!mood) return 'gray';
    if (mood >= 8) return 'green';
    if (mood >= 6) return 'yellow';
    if (mood >= 4) return 'orange';
    return 'red';
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    if (!calendarData) return [];

    const year = calendarData.month.year;
    const month = calendarData.month.month;
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startWeek = new Date(firstDay);
    startWeek.setDate(startWeek.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startWeek);

    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const dayNum = current.getDate();
      const isCurrentMonth = current.getMonth() === month - 1;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const dayData = getDayData(dateStr);

      days.push({
        date: dateStr,
        dayNum,
        isCurrentMonth,
        isToday,
        dayData
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  if (isLoading && !calendarData) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const calendarDays = generateCalendarGrid();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recovery Calendar
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your daily progress, mood, and triggers
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
            {monthName}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Monthly Stats */}
      {calendarData?.monthlyStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {calendarData.monthlyStats.totalCheckins}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Check-ins</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {calendarData.monthlyStats.streakDays}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Streak Days</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {calendarData.monthlyStats.milestoneDays}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Milestones</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {calendarData.monthlyStats.totalAchievements}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Achievements</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {calendarData.monthlyStats.completedChallenges}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Challenges</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {calendarData.monthlyStats.totalTriggers}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Triggers</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {calendarData.monthlyStats.averageMood.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Mood</div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="card">
        {/* Week headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-medium text-gray-600 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={`
                aspect-square p-2 rounded-lg cursor-pointer transition-colors border
                ${getDayStyle(day.dayData, day.date)}
                ${day.isCurrentMonth ? 'border-gray-200 dark:border-gray-600' : 'border-transparent'}
                ${day.isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                ${!day.isCurrentMonth ? 'opacity-50' : ''}
              `}
              onClick={() => day.isCurrentMonth && handleDayClick(day.date)}
            >
              <div className="text-sm font-medium mb-1">{day.dayNum}</div>
              
              {/* Day indicators */}
              <div className="space-y-1">
                {/* Mood indicator */}
                {day.dayData?.overallMood && (
                  <div className={`w-full h-1 rounded bg-${getMoodColor(day.dayData.overallMood)}-400`} />
                )}
                
                {/* Streak indicators */}
                {Object.values(day.dayData?.streakDays || {}).map((streak, index) => (
                  <div
                    key={index}
                    className="w-full h-1 rounded"
                    style={{ backgroundColor: streak.color }}
                  />
                ))}

                {/* Event indicators */}
                <div className="flex justify-center space-x-1">
                  {day.dayData?.achievements && day.dayData.achievements.length > 0 && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Achievement" />
                  )}
                  {day.dayData?.triggers && day.dayData.triggers.length > 0 && (
                    <div className="w-2 h-2 bg-red-400 rounded-full" title="Trigger" />
                  )}
                  {day.dayData?.challenges.some(c => c.status === 'completed') && (
                    <div className="w-2 h-2 bg-green-400 rounded-full" title="Challenge Completed" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => {
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setShowMoodModal(true);
          }}
          className="btn-primary"
        >
          📊 Log Today's Mood
        </button>
        <button
          onClick={() => {
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setShowTriggerModal(true);
          }}
          className="btn-secondary"
        >
          ⚠️ Log Trigger
        </button>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          dayData={selectedDay}
          onClose={() => setSelectedDay(null)}
          onMoodUpdate={() => {
            setSelectedDay(null);
            // Refresh calendar data
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            fetchCalendarData(year, month);
          }}
        />
      )}

      {/* Mood Modal */}
      {showMoodModal && (
        <MoodModal
          date={selectedDate}
          programs={calendarData?.programs || []}
          onClose={() => setShowMoodModal(false)}
          onSave={() => {
            setShowMoodModal(false);
            // Refresh calendar data
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            fetchCalendarData(year, month);
          }}
        />
      )}

      {/* Trigger Modal */}
      {showTriggerModal && (
        <TriggerModal
          date={selectedDate}
          onClose={() => setShowTriggerModal(false)}
          onSave={() => {
            setShowTriggerModal(false);
            // Refresh calendar data
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            fetchCalendarData(year, month);
          }}
        />
      )}
    </div>
  );
};

// Day Detail Modal Component
const DayDetailModal: React.FC<{
  dayData: any;
  onClose: () => void;
  onMoodUpdate: () => void;
}> = ({ dayData, onClose, onMoodUpdate }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {new Date(dayData.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Day Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dayData.checkins?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Check-ins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dayData.summary?.averageMood?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Mood</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {dayData.triggers?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Triggers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {dayData.achievements?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Achievements</div>
          </div>
        </div>

        {/* Detailed sections would go here */}
        <div className="space-y-6">
          {/* Check-ins */}
          {dayData.checkins && dayData.checkins.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Check-ins</h4>
              <div className="space-y-2">
                {dayData.checkins.map((checkin: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{checkin.program_name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Mood: {checkin.mood_rating}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggers */}
          {dayData.triggers && dayData.triggers.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Triggers</h4>
              <div className="space-y-2">
                {dayData.triggers.map((trigger: any, index: number) => (
                  <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-red-800 dark:text-red-200">
                        {trigger.trigger_type}
                      </span>
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Intensity: {trigger.intensity_level}/10
                      </span>
                    </div>
                    {trigger.situation_description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {trigger.situation_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mood Modal Component
const MoodModal: React.FC<{
  date: string;
  programs: Array<any>;
  onClose: () => void;
  onSave: () => void;
}> = ({ date, programs, onClose, onSave }) => {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [moodRating, setMoodRating] = useState(5);
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    try {
      await api.put(`/calendar/mood/${date}`, {
        programId: selectedProgram,
        moodRating,
        notes
      });
      onSave();
    } catch (error) {
      console.error('Failed to save mood:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Log Mood for {new Date(date).toLocaleDateString()}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mood Rating: {moodRating}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={moodRating}
              onChange={(e) => setMoodRating(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={!selectedProgram}>
            Save Mood
          </button>
        </div>
      </div>
    </div>
  );
};

// Trigger Modal Component
const TriggerModal: React.FC<{
  date: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ date, onClose, onSave }) => {
  const [triggerData, setTriggerData] = useState<TriggerModalData>({
    triggerDate: date,
    triggerType: '',
    intensityLevel: 5,
    situationDescription: '',
    copingStrategyUsed: '',
    outcome: '',
    notes: ''
  });

  const triggerTypes = [
    'Stress', 'Boredom', 'Social Pressure', 'Emotional', 'Routine Disruption',
    'Anxiety', 'Depression', 'Anger', 'Loneliness', 'HALT (Hungry/Angry/Lonely/Tired)'
  ];

  const outcomes = ['avoided', 'relapse', 'redirected', 'sought_help'];

  const handleSave = async () => {
    try {
      await api.post('/calendar/trigger', triggerData);
      onSave();
    } catch (error) {
      console.error('Failed to save trigger:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Log Trigger for {new Date(date).toLocaleDateString()}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trigger Type *
            </label>
            <select
              value={triggerData.triggerType}
              onChange={(e) => setTriggerData({...triggerData, triggerType: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="">Select trigger type</option>
              {triggerTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Intensity Level: {triggerData.intensityLevel}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={triggerData.intensityLevel}
              onChange={(e) => setTriggerData({...triggerData, intensityLevel: Number(e.target.value)})}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Situation Description
            </label>
            <textarea
              value={triggerData.situationDescription}
              onChange={(e) => setTriggerData({...triggerData, situationDescription: e.target.value})}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="What was happening when you felt triggered?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Coping Strategy Used
            </label>
            <input
              type="text"
              value={triggerData.copingStrategyUsed}
              onChange={(e) => setTriggerData({...triggerData, copingStrategyUsed: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="What did you do to cope?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Outcome
            </label>
            <select
              value={triggerData.outcome}
              onChange={(e) => setTriggerData({...triggerData, outcome: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="">Select outcome</option>
              {outcomes.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {outcome.charAt(0).toUpperCase() + outcome.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={triggerData.notes}
              onChange={(e) => setTriggerData({...triggerData, notes: e.target.value})}
              rows={2}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="Any additional thoughts or reflections?"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary flex-1" 
            disabled={!triggerData.triggerType || !triggerData.intensityLevel}
          >
            Save Trigger
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCalendar;