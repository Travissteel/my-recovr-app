import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ModernLifeTreeProps {
  streakDays?: number;
  totalPrograms?: number;
  completedMilestones?: number;
  className?: string;
}

export default function ModernLifeTree({ 
  streakDays = 0, 
  totalPrograms = 1, 
  completedMilestones = 0,
  className = ""
}: ModernLifeTreeProps) {
  const maxDays = 90;
  const growthPercentage = Math.min((streakDays / maxDays) * 100, 100);
  
  const getTreeStage = () => {
    if (streakDays < 7) return 'seedling';
    if (streakDays < 21) return 'sapling';
    if (streakDays < 45) return 'young';
    if (streakDays < 75) return 'mature';
    return 'flourishing';
  };

  const stage = getTreeStage();

  const getStageMessage = () => {
    switch (stage) {
      case 'seedling': return { text: 'New beginnings bloom here', emoji: '🌱', color: 'text-emerald-600' };
      case 'sapling': return { text: 'Growing stronger each day', emoji: '🌿', color: 'text-green-600' };
      case 'young': return { text: 'Resilience taking root', emoji: '🌳', color: 'text-emerald-700' };
      case 'mature': return { text: 'Blossoming with confidence', emoji: '🌸', color: 'text-pink-600' };
      case 'flourishing': return { text: 'A magnificent recovery journey', emoji: '🌺', color: 'text-purple-600' };
      default: return { text: 'Keep nurturing your growth', emoji: '🌱', color: 'text-emerald-600' };
    }
  };

  const message = getStageMessage();

  return (
    <Card className={`
      relative overflow-hidden
      bg-gradient-to-br from-white/90 via-emerald-50/50 to-green-100/30
      backdrop-blur-sm border-0
      shadow-[0_8px_32px_rgba(31,38,135,0.15)]
      hover:shadow-[0_12px_40px_rgba(31,38,135,0.25)]
      transition-all duration-500 ease-out
      before:absolute before:inset-0 
      before:bg-gradient-to-br before:from-emerald-400/10 before:to-green-600/5
      before:backdrop-blur-sm
      ${className}
    `}>
      {/* Ambient light effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-radial from-emerald-300/20 to-transparent rounded-full blur-xl"></div>
      
      <CardHeader className="pb-4 relative z-10">
        <CardTitle className="text-center flex items-center justify-center gap-3">
          <span className="text-2xl">{message.emoji}</span>
          <span className="bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent font-bold">
            Your Life Tree
          </span>
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 relative z-10">
        {/* Enhanced Tree Visualization */}
        <div className="relative mb-6 group">
          <svg 
            width="100%" 
            height="280" 
            viewBox="0 0 400 280" 
            className="mx-auto drop-shadow-sm"
            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
          >
            {/* Definitions for gradients and effects */}
            <defs>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#f0f9ff" />
                <stop offset="100%" stopColor="#fefefe" />
              </linearGradient>
              
              <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="50%" stopColor="#a16207" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              
              <radialGradient id="leafGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="70%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#15803d" />
              </radialGradient>
              
              <filter id="leafShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feMorphology operator="dilate" radius="1"/>
                <feGaussianBlur stdDeviation="2"/>
                <feOffset dx="2" dy="2"/>
                <feFlood floodColor="#000000" floodOpacity="0.1"/>
                <feComposite operator="over"/>
              </filter>
            </defs>
            
            {/* Sky background with subtle texture */}
            <rect width="400" height="280" fill="url(#skyGrad)" />
            
            {/* Ground with depth */}
            <ellipse cx="200" cy="265" rx="120" ry="15" fill="#16a34a" opacity="0.3" />
            <ellipse cx="200" cy="268" rx="80" ry="8" fill="#22c55e" opacity="0.4" />
            
            {/* Enhanced trunk with gradient and texture */}
            <rect 
              x="190" 
              y={240 - (growthPercentage * 0.8)} 
              width="20" 
              height={40 + (growthPercentage * 0.8)}
              fill="url(#trunkGrad)"
              rx="3"
              filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.2))"
            />
            
            {/* Roots with organic curves */}
            <path 
              d="M 190 270 Q 170 275 150 280 M 210 270 Q 230 275 250 280 M 200 270 Q 200 280 200 285"
              stroke="url(#trunkGrad)"
              strokeWidth="3"
              fill="none"
              opacity="0.6"
            />
            
            {/* Dynamic foliage based on growth */}
            {stage !== 'seedling' && (
              <>
                {/* Main crown */}
                <circle
                  cx="200"
                  cy={220 - (growthPercentage * 0.4)}
                  r={25 + (growthPercentage * 0.3)}
                  fill="url(#leafGrad)"
                  filter="url(#leafShadow)"
                  className="animate-pulse"
                  style={{ animationDuration: '4s' }}
                />
                
                {/* Secondary foliage clusters */}
                {stage !== 'sapling' && (
                  <>
                    <ellipse
                      cx={180 - (growthPercentage * 0.1)}
                      cy={210 - (growthPercentage * 0.2)}
                      rx={15 + (growthPercentage * 0.15)}
                      ry={12 + (growthPercentage * 0.1)}
                      fill="#22c55e"
                      opacity="0.8"
                      className="animate-pulse"
                      style={{ animationDelay: '1s', animationDuration: '5s' }}
                    />
                    <ellipse
                      cx={220 + (growthPercentage * 0.1)}
                      cy={210 - (growthPercentage * 0.2)}
                      rx={15 + (growthPercentage * 0.15)}
                      ry={12 + (growthPercentage * 0.1)}
                      fill="#22c55e"
                      opacity="0.8"
                      className="animate-pulse"
                      style={{ animationDelay: '2s', animationDuration: '4.5s' }}
                    />
                  </>
                )}
                
                {/* Milestone flowers */}
                {completedMilestones > 0 && Array.from({ length: Math.min(completedMilestones, 5) }).map((_, i) => {
                  const angle = (i * 72) - 36; // Pentagon distribution
                  const distance = 35 + (i * 5);
                  const x = 200 + Math.cos(angle * Math.PI / 180) * distance;
                  const y = 210 - Math.abs(Math.sin(angle * Math.PI / 180)) * distance;
                  
                  return (
                    <g key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '2s' }}>
                      <circle cx={x} cy={y} r="4" fill="#fbbf24" opacity="0.9" />
                      <circle cx={x-2} cy={y-2} r="2" fill="#f59e0b" />
                      <circle cx={x+2} cy={y-2} r="2" fill="#f59e0b" />
                      <circle cx={x} cy={y-4} r="2" fill="#f59e0b" />
                      <circle cx={x} cy={y+2} r="2" fill="#f59e0b" />
                    </g>
                  );
                })}
                
                {/* Floating particles for flourishing stage */}
                {stage === 'flourishing' && (
                  <g className="animate-pulse" style={{ animationDuration: '3s' }}>
                    <circle cx="160" cy="180" r="2" fill="#fbbf24" opacity="0.7" className="animate-bounce" />
                    <circle cx="240" cy="170" r="1.5" fill="#f59e0b" opacity="0.6" className="animate-bounce" style={{ animationDelay: '1s' }} />
                    <circle cx="180" cy="160" r="1" fill="#22c55e" opacity="0.5" className="animate-bounce" style={{ animationDelay: '2s' }} />
                  </g>
                )}
              </>
            )}
            
            {/* Progress indicator with enhanced styling */}
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold fill-emerald-800" style={{ fontFamily: 'Inter, sans-serif' }}>
              Day {streakDays} of {maxDays}
            </text>
          </svg>
        </div>
        
        {/* Enhanced progress bar with glassmorphism */}
        <div className="relative mb-6">
          <div className="w-full h-4 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 rounded-full relative overflow-hidden transition-all duration-1000 ease-out"
              style={{ width: `${growthPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-white/40"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-600 font-medium">0 days</span>
            <span className="text-emerald-800 font-bold">{growthPercentage.toFixed(0)}%</span>
            <span className="text-emerald-600 font-medium">90 days</span>
          </div>
        </div>
        
        {/* Enhanced stage message */}
        <div className="text-center mb-6">
          <p className={`text-lg font-semibold ${message.color} mb-2`}>
            {message.text}
          </p>
          <p className="text-sm text-gray-600">
            {streakDays === 0 ? "Your journey awaits" : 
             streakDays < 7 ? "Every step counts" :
             streakDays < 30 ? "Building strong foundations" :
             streakDays < 60 ? "Incredible transformation happening" :
             "You're an inspiration to others"}
          </p>
        </div>
        
        {/* Enhanced stats with neumorphism */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Days Strong', value: streakDays, color: 'emerald', icon: '💪' },
            { label: 'Programs', value: totalPrograms, color: 'blue', icon: '🎯' },
            { label: 'Milestones', value: completedMilestones, color: 'purple', icon: '🏆' }
          ].map((stat) => (
            <div 
              key={stat.label}
              className="
                bg-white/40 backdrop-blur-sm 
                rounded-xl p-3 text-center 
                border border-white/50
                shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.1)]
                hover:bg-white/50 transition-all duration-300
                transform hover:scale-105
              "
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className={`font-bold text-lg text-${stat.color}-700`}>{stat.value}</div>
              <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Milestone indicators */}
        <div className="flex justify-center mt-6 gap-2">
          {[7, 30, 60, 90].map((milestone) => {
            const achieved = streakDays >= milestone;
            return (
              <div
                key={milestone}
                className={`
                  relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300 transform hover:scale-110
                  ${achieved 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-gray-200/50 backdrop-blur-sm text-gray-400 border border-gray-300/50'
                  }
                `}
                title={`${milestone} days milestone`}
              >
                {achieved && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                )}
                <span className="relative z-10">
                  {milestone === 7 ? '🌱' : 
                   milestone === 30 ? '🌿' : 
                   milestone === 60 ? '🌳' : '🏆'}
                </span>
                {achieved && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}