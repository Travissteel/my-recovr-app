import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  category: 'mindfulness' | 'physical' | 'social' | 'learning' | 'creative' | 'spiritual';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  icon: string;
  completed: boolean;
}

interface ModernDailyTasksProps {
  totalXP?: number;
  onCompleteTask?: (taskId: string) => void;
  className?: string;
}

export default function ModernDailyTasks({ 
  totalXP = 0, 
  onCompleteTask,
  className = ""
}: ModernDailyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Morning Mindfulness',
      description: 'Start your day with 5 minutes of deep breathing or meditation',
      category: 'mindfulness',
      difficulty: 'easy',
      xpReward: 10,
      icon: '🧘',
      completed: true
    },
    {
      id: '2',
      title: 'Physical Movement',
      description: 'Take a 15-minute walk, do stretches, or any physical activity',
      category: 'physical',
      difficulty: 'easy',
      xpReward: 15,
      icon: '🚶',
      completed: true
    },
    {
      id: '3',
      title: 'Connect with Someone',
      description: 'Reach out to a friend, family member, or support person',
      category: 'social',
      difficulty: 'medium',
      xpReward: 20,
      icon: '💬',
      completed: false
    },
    {
      id: '4',
      title: 'Learn Something New',
      description: 'Read an article, watch an educational video, or practice a skill',
      category: 'learning',
      difficulty: 'medium',
      xpReward: 20,
      icon: '📚',
      completed: false
    },
    {
      id: '5',
      title: 'Creative Expression',
      description: 'Spend 20 minutes on art, music, writing, or any creative activity',
      category: 'creative',
      difficulty: 'hard',
      xpReward: 25,
      icon: '🎨',
      completed: false
    },
    {
      id: '6',
      title: 'Gratitude Practice',
      description: 'Write down 3 things you are grateful for today',
      category: 'spiritual',
      difficulty: 'easy',
      xpReward: 10,
      icon: '🙏',
      completed: false
    }
  ]);

  const completedTasks = tasks.filter(task => task.completed).length;
  const earnedXP = tasks.filter(task => task.completed).reduce((sum, task) => sum + task.xpReward, 0);
  const totalPossibleXP = tasks.reduce((sum, task) => sum + task.xpReward, 0);
  const progressPercentage = (completedTasks / tasks.length) * 100;

  const getCategoryConfig = (category: string) => {
    const configs = {
      mindfulness: { 
        bgGradient: 'from-purple-50/90 via-violet-50/50 to-purple-100/30',
        borderColor: 'border-purple-200/50',
        iconBg: 'bg-purple-100/80',
        textColor: 'text-purple-700',
        buttonGradient: 'from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
      },
      physical: { 
        bgGradient: 'from-orange-50/90 via-amber-50/50 to-orange-100/30',
        borderColor: 'border-orange-200/50',
        iconBg: 'bg-orange-100/80',
        textColor: 'text-orange-700',
        buttonGradient: 'from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
      },
      social: { 
        bgGradient: 'from-blue-50/90 via-cyan-50/50 to-blue-100/30',
        borderColor: 'border-blue-200/50',
        iconBg: 'bg-blue-100/80',
        textColor: 'text-blue-700',
        buttonGradient: 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
      },
      learning: { 
        bgGradient: 'from-emerald-50/90 via-green-50/50 to-emerald-100/30',
        borderColor: 'border-emerald-200/50',
        iconBg: 'bg-emerald-100/80',
        textColor: 'text-emerald-700',
        buttonGradient: 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
      },
      creative: { 
        bgGradient: 'from-pink-50/90 via-rose-50/50 to-pink-100/30',
        borderColor: 'border-pink-200/50',
        iconBg: 'bg-pink-100/80',
        textColor: 'text-pink-700',
        buttonGradient: 'from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'
      },
      spiritual: { 
        bgGradient: 'from-indigo-50/90 via-blue-50/50 to-indigo-100/30',
        borderColor: 'border-indigo-200/50',
        iconBg: 'bg-indigo-100/80',
        textColor: 'text-indigo-700',
        buttonGradient: 'from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700'
      }
    };
    return configs[category as keyof typeof configs] || configs.mindfulness;
  };

  const getDifficultyConfig = (difficulty: string) => {
    const configs = {
      easy: { bg: 'bg-green-100/80', text: 'text-green-700', label: 'Easy' },
      medium: { bg: 'bg-yellow-100/80', text: 'text-yellow-700', label: 'Medium' },
      hard: { bg: 'bg-red-100/80', text: 'text-red-700', label: 'Hard' }
    };
    return configs[difficulty as keyof typeof configs] || configs.easy;
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    onCompleteTask?.(taskId);
  };

  return (
    <Card className={`
      relative overflow-hidden
      bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-100/30
      backdrop-blur-sm border-0
      shadow-[0_8px_32px_rgba(31,38,135,0.15)]
      hover:shadow-[0_12px_40px_rgba(31,38,135,0.25)]
      transition-all duration-500 ease-out
      before:absolute before:inset-0 
      before:bg-gradient-to-br before:from-white/20 before:to-transparent
      before:backdrop-blur-sm
      ${className}
    `}>
      {/* Ambient lighting effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-purple-300/20 to-transparent rounded-full blur-xl"></div>
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <span className="bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent font-bold text-xl">
              Daily Wellness Tasks
            </span>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          </CardTitle>
          
          <div className="text-right">
            <div className="text-sm text-gray-600 font-medium">Daily XP</div>
            <div className="font-bold text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {earnedXP} / {totalPossibleXP}
            </div>
          </div>
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">
              {completedTasks} of {tasks.length} completed
            </span>
            <span className="font-bold text-purple-600">
              {progressPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/30 backdrop-blur-sm rounded-full border border-white/40 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 via-violet-500 to-purple-600 rounded-full relative overflow-hidden transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-white/50"></div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 relative z-10">
        <div className="space-y-4">
          {tasks.map((task) => {
            const categoryConfig = getCategoryConfig(task.category);
            const difficultyConfig = getDifficultyConfig(task.difficulty);
            
            return (
              <div
                key={task.id}
                className={`
                  relative p-4 rounded-xl border transition-all duration-300
                  ${task.completed 
                    ? 'bg-gradient-to-r from-green-50/90 to-emerald-50/70 border-green-200/60 opacity-80' 
                    : `bg-gradient-to-r ${categoryConfig.bgGradient} ${categoryConfig.borderColor} hover:shadow-lg transform hover:scale-[1.01]`
                  }
                  backdrop-blur-sm
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Enhanced Icon Container */}
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${task.completed ? 'bg-green-100/80' : categoryConfig.iconBg}
                      border border-white/60 backdrop-blur-sm
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.1)]
                      transition-all duration-300
                      ${!task.completed && 'hover:scale-110'}
                    `}>
                      <span className="text-xl filter drop-shadow-sm">
                        {task.completed ? '✅' : task.icon}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className={`
                          font-semibold text-lg
                          ${task.completed 
                            ? 'text-green-700 line-through' 
                            : categoryConfig.textColor
                          }
                        `}>
                          {task.title}
                        </h4>
                        
                        {/* Enhanced Difficulty Badge */}
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-bold
                          ${difficultyConfig.bg} ${difficultyConfig.text}
                          border border-white/60 backdrop-blur-sm
                          shadow-sm
                        `}>
                          {difficultyConfig.label}
                        </span>
                      </div>
                      
                      <p className={`text-sm ${task.completed ? 'text-green-600' : 'text-gray-700'} leading-relaxed`}>
                        {task.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* XP Display */}
                    <div className="text-right">
                      <div className={`font-bold text-lg ${task.completed ? 'text-green-600' : 'text-purple-600'}`}>
                        +{task.xpReward} XP
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {task.completed ? (
                      <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                        <span>Done!</span>
                        <span className="text-lg">🎉</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className={`
                          bg-gradient-to-r ${categoryConfig.buttonGradient}
                          text-white text-sm font-semibold px-6 py-2 rounded-lg
                          shadow-lg hover:shadow-xl
                          transition-all duration-300 transform hover:scale-105
                          border border-white/20
                        `}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Enhanced Total XP Display */}
        <div className={`
          bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center 
          border border-white/60 mt-6
          shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.1)]
          hover:bg-white/70 transition-all duration-300
        `}>
          <div className="text-sm text-gray-600 mb-2 font-medium">Total Recovery XP</div>
          <div className="font-bold text-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 bg-clip-text text-transparent mb-2">
            {totalXP + earnedXP}
          </div>
          <div className="text-xs text-gray-500">Keep building your recovery journey! 🚀</div>
          
          {/* Progress Ring Indicator */}
          <div className="flex justify-center mt-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-gray-200"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="text-purple-500"
                  strokeDasharray={`${progressPercentage * 1.76} 176`}
                  style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}