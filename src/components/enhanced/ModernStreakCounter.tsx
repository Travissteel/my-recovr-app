import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Program {
  id: string;
  programName: string;
  currentStreak: number;
  longestStreak: number;
  startDate: string;
  status: string;
  addictionType: string;
  targetDurationDays: number;
}

interface ModernStreakCounterProps {
  programs?: Program[];
  onCreateProgram?: () => void;
  className?: string;
}

export default function ModernStreakCounter({ 
  programs = [], 
  onCreateProgram,
  className = ""
}: ModernStreakCounterProps) {
  const getAddictionConfig = (type: string) => {
    const configs = {
      pornography: { 
        icon: '🚫', 
        gradient: 'from-emerald-400 via-green-500 to-emerald-600',
        bgGradient: 'from-emerald-50/90 via-green-50/50 to-emerald-100/30',
        borderColor: 'border-emerald-200/50',
        textColor: 'text-emerald-700',
        shadowColor: 'shadow-emerald-500/20'
      },
      social_media: { 
        icon: '📱', 
        gradient: 'from-blue-400 via-indigo-500 to-blue-600',
        bgGradient: 'from-blue-50/90 via-indigo-50/50 to-blue-100/30',
        borderColor: 'border-blue-200/50',
        textColor: 'text-blue-700',
        shadowColor: 'shadow-blue-500/20'
      },
      substance: { 
        icon: '🚭', 
        gradient: 'from-purple-400 via-violet-500 to-purple-600',
        bgGradient: 'from-purple-50/90 via-violet-50/50 to-purple-100/30',
        borderColor: 'border-purple-200/50',
        textColor: 'text-purple-700',
        shadowColor: 'shadow-purple-500/20'
      },
      gambling: { 
        icon: '🎰', 
        gradient: 'from-orange-400 via-amber-500 to-orange-600',
        bgGradient: 'from-orange-50/90 via-amber-50/50 to-orange-100/30',
        borderColor: 'border-orange-200/50',
        textColor: 'text-orange-700',
        shadowColor: 'shadow-orange-500/20'
      }
    };
    return configs[type as keyof typeof configs] || configs.pornography;
  };

  const getMotivationalMessage = (streakDays: number) => {
    if (streakDays === 0) return "Your journey begins! 🌱";
    if (streakDays < 7) return "Building momentum! Keep going! 💪";
    if (streakDays < 30) return "Amazing progress! You're unstoppable! 🚀";
    if (streakDays < 60) return "Incredible transformation happening! ✨";
    return "You're an inspiration to others! 🏆";
  };

  const getMilestoneIcon = (streakDays: number) => {
    if (streakDays >= 90) return '🏆';
    if (streakDays >= 60) return '🌳';
    if (streakDays >= 30) return '🌿';
    if (streakDays >= 7) return '🌱';
    return '💫';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {programs.map((program) => {
        const config = getAddictionConfig(program.addictionType);
        const progressPercentage = Math.min((program.currentStreak / program.targetDurationDays) * 100, 100);
        const message = getMotivationalMessage(program.currentStreak);
        const milestoneIcon = getMilestoneIcon(program.currentStreak);
        
        return (
          <Card 
            key={program.id}
            className={`
              relative overflow-hidden group
              bg-gradient-to-br ${config.bgGradient}
              backdrop-blur-sm border-0 ${config.borderColor}
              shadow-[0_8px_32px_rgba(31,38,135,0.15)] ${config.shadowColor}
              hover:shadow-[0_12px_40px_rgba(31,38,135,0.25)]
              transition-all duration-500 ease-out
              transform hover:scale-[1.02]
              before:absolute before:inset-0 
              before:bg-gradient-to-br before:from-white/20 before:to-transparent
              before:backdrop-blur-sm
            `}
          >
            {/* Ambient lighting effect */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-radial from-white/30 to-transparent rounded-full blur-xl opacity-60"></div>
            
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  bg-white/40 backdrop-blur-sm border border-white/50
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.1)]
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  <span className="text-2xl filter drop-shadow-sm">{config.icon}</span>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${config.textColor} mb-1`}>
                    {program.currentStreak}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">days strong</div>
                </div>
              </div>
              
              <CardTitle className={`${config.textColor} text-lg font-bold mb-2`}>
                {program.programName}
              </CardTitle>
              
              <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                <span>{milestoneIcon}</span>
                {message}
              </p>
            </CardHeader>

            <CardContent className="pt-0 relative z-10">
              {/* Enhanced Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-700 font-medium">Progress to {program.targetDurationDays} days</span>
                  <span className={`font-bold ${config.textColor}`}>
                    {progressPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full h-4 bg-white/30 backdrop-blur-sm rounded-full border border-white/40 overflow-hidden shadow-inner">
                    <div 
                      className={`
                        h-full bg-gradient-to-r ${config.gradient} rounded-full 
                        relative overflow-hidden transition-all duration-1000 ease-out
                        shadow-lg
                      `}
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent"></div>
                      <div className="absolute top-0 left-0 w-full h-2 bg-white/50 rounded-full"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid with Neumorphism */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`
                  bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center
                  border border-white/50
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.1)]
                  hover:bg-white/50 transition-all duration-300
                  transform hover:scale-105
                `}>
                  <div className={`font-bold text-xl ${config.textColor} mb-1`}>
                    {program.longestStreak}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Best Streak</div>
                </div>
                
                <div className={`
                  bg-white/40 backdrop-blur-sm rounded-xl p-4 text-center
                  border border-white/50
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.1)]
                  hover:bg-white/50 transition-all duration-300
                  transform hover:scale-105
                `}>
                  <div className={`font-bold text-xl ${config.textColor} mb-1`}>
                    {program.targetDurationDays - program.currentStreak}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Days Left</div>
                </div>
              </div>

              {/* Milestone Indicators */}
              <div className="flex justify-center gap-2 mb-4">
                {[7, 30, 60, 90].map((milestone, index) => {
                  const achieved = program.currentStreak >= milestone;
                  const milestones = ['🌱', '🌿', '🌳', '🏆'];
                  
                  return (
                    <div
                      key={milestone}
                      className={`
                        relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        transition-all duration-300 transform hover:scale-110
                        ${achieved 
                          ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg ${config.shadowColor}` 
                          : 'bg-white/30 backdrop-blur-sm text-gray-400 border border-white/40'
                        }
                      `}
                      title={`${milestone} days milestone`}
                    >
                      {achieved && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                      )}
                      <span className="relative z-10 text-xs">
                        {milestones[index]}
                      </span>
                      {achieved && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Days Counter with Enhanced Typography */}
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1 font-medium">
                  Started {new Date(program.startDate).toLocaleDateString()}
                </div>
                <div className={`text-2xl font-bold ${config.textColor} tracking-tight`}>
                  Day {program.currentStreak} of {program.targetDurationDays}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Enhanced Add New Program Card */}
      <Card 
        className={`
          relative overflow-hidden group cursor-pointer
          bg-gradient-to-br from-white/80 via-gray-50/50 to-slate-100/30
          backdrop-blur-sm border-2 border-dashed border-gray-300/60
          hover:border-emerald-400/80 hover:bg-emerald-50/40
          shadow-[0_8px_32px_rgba(31,38,135,0.10)]
          hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)]
          transition-all duration-500 ease-out
          transform hover:scale-[1.02]
          ${className}
        `}
        onClick={onCreateProgram}
      >
        <CardContent className="p-8 text-center h-full flex flex-col justify-center relative z-10">
          {/* Floating icon with glassmorphism */}
          <div className={`
            w-20 h-20 rounded-full mx-auto mb-6
            bg-white/60 backdrop-blur-sm border border-white/80
            shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.1)]
            flex items-center justify-center
            group-hover:bg-emerald-100/60 group-hover:border-emerald-200/80
            transition-all duration-300 transform group-hover:scale-110
          `}>
            <span className="text-4xl filter drop-shadow-sm">➕</span>
          </div>
          
          <h3 className="font-bold text-xl text-gray-900 mb-3">Add Another Program</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Track multiple addictions simultaneously with our comprehensive recovery system
          </p>
          
          <button className={`
            inline-flex items-center justify-center rounded-xl text-sm font-semibold
            bg-gradient-to-r from-emerald-500 to-green-600
            hover:from-emerald-600 hover:to-green-700
            text-white px-6 py-3 shadow-lg
            hover:shadow-xl hover:shadow-emerald-500/25
            transition-all duration-300 transform hover:scale-105
            border border-emerald-400/50
          `}>
            <span className="mr-2">🚀</span>
            Start New Journey
          </button>
        </CardContent>
      </Card>
    </div>
  );
}