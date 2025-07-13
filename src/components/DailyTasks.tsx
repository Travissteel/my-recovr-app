import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  category: 'mindfulness' | 'physical' | 'social' | 'learning' | 'creative';
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DailyTasksProps {
  tasks?: DailyTask[];
  onCompleteTask?: (taskId: string) => void;
  totalXP?: number;
  className?: string;
}

export default function DailyTasks({ 
  tasks = [], 
  onCompleteTask,
  totalXP = 0,
  className = ""
}: DailyTasksProps) {
  
  const [localTasks, setLocalTasks] = useState<DailyTask[]>(tasks.length > 0 ? tasks : [
    {
      id: '1',
      title: 'Morning Mindfulness',
      description: 'Start your day with 5 minutes of deep breathing',
      xpReward: 10,
      completed: false,
      category: 'mindfulness',
      icon: '🧘',
      difficulty: 'easy'
    },
    {
      id: '2',
      title: 'Take a Walk',
      description: 'Get some fresh air and move your body for 15 minutes',
      xpReward: 15,
      completed: false,
      category: 'physical',
      icon: '🚶',
      difficulty: 'easy'
    },
    {
      id: '3',
      title: 'Connect with Someone',
      description: 'Reach out to a friend, family member, or support person',
      xpReward: 20,
      completed: false,
      category: 'social',
      icon: '💬',
      difficulty: 'medium'
    },
    {
      id: '4',
      title: 'Learn Something New',
      description: 'Read an article, watch a video, or practice a skill for 10 minutes',
      xpReward: 15,
      completed: false,
      category: 'learning',
      icon: '📚',
      difficulty: 'medium'
    },
    {
      id: '5',
      title: 'Evening Reflection',
      description: 'Write down 3 things you\'re grateful for today',
      xpReward: 10,
      completed: false,
      category: 'mindfulness',
      icon: '📝',
      difficulty: 'easy'
    },
    {
      id: '6',
      title: 'Creative Expression',
      description: 'Spend 20 minutes on art, music, writing, or any creative activity',
      xpReward: 25,
      completed: false,
      category: 'creative',
      icon: '🎨',
      difficulty: 'hard'
    }
  ]);

  const handleCompleteTask = (taskId: string) => {
    setLocalTasks(prev => 
      prev.map(task => 
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
    if (onCompleteTask) {
      onCompleteTask(taskId);
    }
  };

  const getCategoryColor = (category: DailyTask['category']) => {
    const colors = {
      mindfulness: { bg: 'from-purple-50 to-indigo-50', border: 'border-purple-200', text: 'text-purple-700', accent: 'bg-purple-100' },
      physical: { bg: 'from-orange-50 to-red-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-100' },
      social: { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-100' },
      learning: { bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'bg-emerald-100' },
      creative: { bg: 'from-pink-50 to-rose-50', border: 'border-pink-200', text: 'text-pink-700', accent: 'bg-pink-100' }
    };
    return colors[category];
  };

  const getDifficultyInfo = (difficulty: DailyTask['difficulty']) => {
    const info = {
      easy: { label: 'Easy', color: 'text-green-600', bg: 'bg-green-100' },
      medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      hard: { label: 'Hard', color: 'text-red-600', bg: 'bg-red-100' }
    };
    return info[difficulty];
  };

  const completedTasks = localTasks.filter(task => task.completed);
  const totalPossibleXP = localTasks.reduce((sum, task) => sum + task.xpReward, 0);
  const earnedXP = completedTasks.reduce((sum, task) => sum + task.xpReward, 0);
  const progressPercentage = (completedTasks.length / localTasks.length) * 100;

  return (
    <Card className={`bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <span className="text-2xl">✅</span>
            Daily Wellness Tasks
          </CardTitle>
          <div className="text-right">
            <div className="text-sm text-gray-600">Daily XP</div>
            <div className="font-bold text-lg text-purple-600">
              {earnedXP} / {totalPossibleXP}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {completedTasks.length} of {localTasks.length} completed
            </span>
            <span className="font-medium text-purple-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-400 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {localTasks.map((task) => {
          const categoryColors = getCategoryColor(task.category);
          const difficultyInfo = getDifficultyInfo(task.difficulty);
          
          return (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                task.completed 
                  ? 'bg-green-50 border-green-200 opacity-80' 
                  : `bg-gradient-to-r ${categoryColors.bg} ${categoryColors.border} hover:shadow-md`
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    task.completed ? 'bg-green-100' : categoryColors.accent
                  }`}>
                    <span className="text-xl">
                      {task.completed ? '✅' : task.icon}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${
                        task.completed ? 'text-green-700 line-through' : categoryColors.text
                      }`}>
                        {task.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.bg} ${difficultyInfo.color}`}>
                        {difficultyInfo.label}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      task.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {task.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-bold ${
                      task.completed ? 'text-green-600' : 'text-purple-600'
                    }`}>
                      +{task.xpReward} XP
                    </div>
                  </div>
                  
                  {!task.completed && (
                    <Button
                      onClick={() => handleCompleteTask(task.id)}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                    >
                      Complete
                    </Button>
                  )}
                  
                  {task.completed && (
                    <div className="text-green-600 font-semibold text-sm">
                      Done! 🎉
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Completion Celebration */}
        {completedTasks.length === localTasks.length && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="font-bold text-yellow-800 mb-1">All Tasks Completed!</h3>
            <p className="text-yellow-700 text-sm">
              Amazing work! You've earned {earnedXP} XP today. Keep building those healthy habits!
            </p>
          </div>
        )}
        
        {/* Next Level Preview */}
        <div className="bg-white/60 rounded-lg p-3 text-center border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total XP</div>
          <div className="font-bold text-2xl text-purple-600">{totalXP + earnedXP}</div>
          <div className="text-xs text-gray-500">Keep building your recovery!</div>
        </div>
      </CardContent>
    </Card>
  );
}