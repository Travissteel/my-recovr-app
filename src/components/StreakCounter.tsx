// import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';

interface Program {
  id: string;
  programName: string;
  currentStreak: number;
  longestStreak: number;
  startDate: string;
  status: string;
  addictionType: string;
  addictionColor?: string;
  targetDurationDays?: number;
}

interface StreakCounterProps {
  programs: Program[];
  onCreateProgram?: () => void;
  className?: string;
}

export default function StreakCounter({ 
  programs = [], 
  onCreateProgram,
  className = ""
}: StreakCounterProps) {
  
  const getIconForAddiction = (addictionType: string): string => {
    const iconMap: { [key: string]: string } = {
      'Alcohol': '🍷',
      'Nicotine': '🚭',
      'Substance': '💊',
      'Gambling': '🎲',
      'Gaming': '🎮',
      'Social Media': '📱',
      'Food': '🍽️',
      'Shopping': '🛒',
      'Sex': '❤️',
      'Work': '💼',
      'pornography': '🚫',
      'social_media': '📱',
      'alcohol': '🍷',
      'drugs': '💊',
      'food': '🍽️',
      'gaming': '🎮',
      'shopping': '🛒',
      'gambling': '🎲',
      'smoking': '🚭',
      'internet': '📶'
    };
    return iconMap[addictionType] || '🎯';
  };

  const getColorScheme = (index: number) => {
    const colorSchemes = [
      { 
        card: 'from-emerald-50 to-green-50 border-emerald-200',
        text: 'text-emerald-700',
        accent: 'text-emerald-600',
        progress: 'from-emerald-400 to-emerald-600',
        icon: 'bg-emerald-100'
      },
      { 
        card: 'from-blue-50 to-indigo-50 border-blue-200',
        text: 'text-blue-700',
        accent: 'text-blue-600',
        progress: 'from-blue-400 to-blue-600',
        icon: 'bg-blue-100'
      },
      { 
        card: 'from-purple-50 to-violet-50 border-purple-200',
        text: 'text-purple-700',
        accent: 'text-purple-600',
        progress: 'from-purple-400 to-purple-600',
        icon: 'bg-purple-100'
      },
      { 
        card: 'from-orange-50 to-amber-50 border-orange-200',
        text: 'text-orange-700',
        accent: 'text-orange-600',
        progress: 'from-orange-400 to-orange-600',
        icon: 'bg-orange-100'
      },
      { 
        card: 'from-pink-50 to-rose-50 border-pink-200',
        text: 'text-pink-700',
        accent: 'text-pink-600',
        progress: 'from-pink-400 to-pink-600',
        icon: 'bg-pink-100'
      },
      { 
        card: 'from-teal-50 to-cyan-50 border-teal-200',
        text: 'text-teal-700',
        accent: 'text-teal-600',
        progress: 'from-teal-400 to-teal-600',
        icon: 'bg-teal-100'
      }
    ];
    return colorSchemes[index % colorSchemes.length];
  };

  const calculateProgress = (currentStreak: number, targetDays: number = 90): number => {
    return Math.min((currentStreak / targetDays) * 100, 100);
  };

  const getDaysRemaining = (currentStreak: number, targetDays: number = 90): number => {
    return Math.max(targetDays - currentStreak, 0);
  };

  const getMotivationalMessage = (streak: number): string => {
    if (streak === 0) return "Every journey begins with a single step! 🌱";
    if (streak < 7) return "Building momentum! Keep going! 💪";
    if (streak < 30) return "Forming new habits! You're amazing! ⭐";
    if (streak < 60) return "Incredible progress! Stay strong! 🔥";
    if (streak < 90) return "Almost there! You're unstoppable! 🚀";
    return "Goal achieved! You're a champion! 🏆";
  };

  if (!programs || programs.length === 0) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 ${className}`}>
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎯</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Your Recovery Journey</h3>
          <p className="text-gray-600 mb-6">
            Begin tracking your progress and build healthy habits that last.
          </p>
          <Button 
            onClick={onCreateProgram}
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            🌱 Start Your First Program
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {programs.map((program, index) => {
        const colors = getColorScheme(index);
        const progress = calculateProgress(program.currentStreak, program.targetDurationDays);
        const daysRemaining = getDaysRemaining(program.currentStreak, program.targetDurationDays);
        
        return (
          <Card 
            key={program.id} 
            className={`bg-gradient-to-br ${colors.card} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 ${colors.icon} rounded-full flex items-center justify-center`}>
                  <span className="text-2xl">
                    {getIconForAddiction(program.addictionType)}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${colors.accent}`}>
                    {program.currentStreak}
                  </div>
                  <div className="text-xs text-gray-600">day{program.currentStreak !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="mb-4">
                <h3 className={`font-semibold ${colors.text} mb-1 capitalize`}>
                  {program.addictionType.replace('_', ' ')} Recovery
                </h3>
                <p className="text-sm text-gray-600">
                  {getMotivationalMessage(program.currentStreak)}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className={`font-semibold ${colors.text}`}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`bg-gradient-to-r ${colors.progress} h-full rounded-full transition-all duration-1000 ease-out relative`}
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div className="bg-white/60 rounded-lg p-3">
                  <div className={`font-bold ${colors.accent} text-lg`}>
                    {program.longestStreak}
                  </div>
                  <div className="text-gray-600 text-xs">Best Streak</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className={`font-bold ${colors.accent} text-lg`}>
                    {daysRemaining}
                  </div>
                  <div className="text-gray-600 text-xs">Days Left</div>
                </div>
              </div>

              {/* Achievement badges for milestones */}
              <div className="mt-4 flex justify-center gap-1">
                {[7, 30, 60, 90].map((milestone) => (
                  <div
                    key={milestone}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      program.currentStreak >= milestone
                        ? `bg-gradient-to-br ${colors.progress} text-white shadow-md`
                        : 'bg-gray-200 text-gray-400'
                    }`}
                    title={`${milestone} days milestone`}
                  >
                    {milestone === 7 ? '🌱' : 
                     milestone === 30 ? '🌿' : 
                     milestone === 60 ? '🌳' : '🏆'}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add New Program Card */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-dashed border-2 border-gray-300 hover:border-emerald-400 transition-all duration-300 hover:shadow-lg">
        <CardContent className="p-8 text-center h-full flex flex-col justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-emerald-100 transition-colors">
            <span className="text-3xl">➕</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Add Another Program</h3>
          <p className="text-sm text-gray-600 mb-4">
            Track multiple addictions simultaneously
          </p>
          <Button 
            onClick={onCreateProgram}
            variant="outline"
            className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200"
          >
            ➕ Start New Journey
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}