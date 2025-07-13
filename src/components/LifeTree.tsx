import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface LifeTreeProps {
  streakDays?: number;
  totalPrograms?: number;
  completedMilestones?: number;
  className?: string;
}

export default function LifeTree({ 
  streakDays = 0, 
  totalPrograms = 1, 
  completedMilestones = 0,
  className = ""
}: LifeTreeProps) {
  // Calculate tree growth based on progress
  const maxDays = 90;
  const growthPercentage = Math.min((streakDays / maxDays) * 100, 100);
  
  // Tree stages based on progress
  const getTreeStage = () => {
    if (streakDays < 7) return 'seedling';
    if (streakDays < 21) return 'sapling';
    if (streakDays < 45) return 'young';
    if (streakDays < 75) return 'mature';
    return 'flourishing';
  };

  const stage = getTreeStage();
  
  // Dynamic colors based on growth
  const getTrunkColor = () => {
    const brown = Math.min(60 + (growthPercentage * 0.3), 80);
    return `hsl(30, 50%, ${brown}%)`;
  };

  const getLeafColor = (opacity: number = 1) => {
    const green = Math.min(120 + (growthPercentage * 0.5), 140);
    const saturation = Math.min(60 + (growthPercentage * 0.4), 90);
    const lightness = Math.min(35 + (growthPercentage * 0.2), 45);
    return `hsla(${green}, ${saturation}%, ${lightness}%, ${opacity})`;
  };

  // Generate branch paths with proper connections
  const generateBranches = () => {
    const branches: JSX.Element[] = [];
    const centerX = 200;
    const centerY = 280;
    
    if (stage === 'seedling') return branches;
    
    // Main branches
    const branchCount = Math.min(Math.floor(streakDays / 10) + 2, 8);
    for (let i = 0; i < branchCount; i++) {
      const angle = (i * 60) - 30; // Spread branches
      const length = 30 + (growthPercentage * 0.5);
      const endX = centerX + Math.cos(angle * Math.PI / 180) * length;
      const endY = centerY - Math.abs(Math.sin(angle * Math.PI / 180)) * length;
      
      branches.push(
        <path
          key={`branch-${i}`}
          d={`M ${centerX} ${centerY} Q ${centerX + (endX - centerX) * 0.7} ${centerY - 10} ${endX} ${endY}`}
          stroke={getTrunkColor()}
          strokeWidth={Math.max(3 - (i * 0.3), 1)}
          fill="none"
          className="transition-all duration-1000"
        />
      );
    }
    
    return branches;
  };

  // Generate leaves with proper attachment
  const generateLeaves = () => {
    const leaves: JSX.Element[] = [];
    if (stage === 'seedling' || stage === 'sapling') return leaves;
    
    const leafCount = Math.min(Math.floor(streakDays / 5) + 3, 20);
    const centerX = 200;
    const centerY = 280;
    
    for (let i = 0; i < leafCount; i++) {
      const angle = (i * 30) + Math.random() * 20;
      const distance = 25 + Math.random() * 40 + (growthPercentage * 0.3);
      const x = centerX + Math.cos(angle * Math.PI / 180) * distance;
      const y = centerY - Math.abs(Math.sin(angle * Math.PI / 180)) * distance - 10;
      
      const size = 8 + Math.random() * 6 + (growthPercentage * 0.1);
      
      leaves.push(
        <ellipse
          key={`leaf-${i}`}
          cx={x}
          cy={y}
          rx={size}
          ry={size * 0.7}
          fill={getLeafColor(0.8 + Math.random() * 0.2)}
          className="transition-all duration-1000 animate-pulse"
          style={{
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      );
    }
    
    return leaves;
  };

  // Generate flowers/fruits for advanced stages
  const generateFlowers = () => {
    if (stage !== 'mature' && stage !== 'flourishing') return [];
    
    const flowers = [];
    const flowerCount = Math.min(Math.floor(completedMilestones) + 1, 6);
    const centerX = 200;
    const centerY = 280;
    
    for (let i = 0; i < flowerCount; i++) {
      const angle = i * 60;
      const distance = 35 + Math.random() * 25;
      const x = centerX + Math.cos(angle * Math.PI / 180) * distance;
      const y = centerY - Math.abs(Math.sin(angle * Math.PI / 180)) * distance - 15;
      
      flowers.push(
        <g key={`flower-${i}`} className="animate-bounce" style={{ animationDelay: `${i * 0.5}s` }}>
          <circle cx={x} cy={y} r="3" fill="#f59e0b" />
          <circle cx={x-2} cy={y-1} r="2" fill="#fbbf24" />
          <circle cx={x+2} cy={y-1} r="2" fill="#fbbf24" />
          <circle cx={x} cy={y-3} r="2" fill="#fbbf24" />
          <circle cx={x} cy={y+1} r="2" fill="#fbbf24" />
        </g>
      );
    }
    
    return flowers;
  };

  const getStageMessage = () => {
    switch (stage) {
      case 'seedling': return 'Your journey begins! 🌱';
      case 'sapling': return 'Growing stronger every day! 🌿';
      case 'young': return 'Branches of resilience forming! 🌳';
      case 'mature': return 'Blooming with confidence! 🌸';
      case 'flourishing': return 'A magnificent tree of recovery! 🌺';
      default: return 'Keep nurturing your growth! 🌱';
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 border-emerald-200 shadow-lg ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-emerald-800 flex items-center justify-center gap-2">
          <span>Your Life Tree</span>
          <span className="text-2xl">🌳</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative mb-4">
          <svg width="400" height="350" viewBox="0 0 400 350" className="mx-auto">
            {/* Sky gradient background */}
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#f0f9ff" />
              </linearGradient>
              <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            
            {/* Background */}
            <rect width="400" height="350" fill="url(#skyGradient)" />
            
            {/* Ground */}
            <ellipse cx="200" cy="330" rx="150" ry="20" fill="url(#groundGradient)" opacity="0.6" />
            
            {/* Trunk with proper proportions */}
            <rect 
              x="190" 
              y={280 - (growthPercentage * 0.8)} 
              width="20" 
              height={50 + (growthPercentage * 0.8)}
              fill={getTrunkColor()}
              rx="2"
              className="transition-all duration-1000"
            />
            
            {/* Roots (subtle) */}
            <path 
              d="M 190 330 Q 180 335 170 340 M 210 330 Q 220 335 230 340 M 200 330 Q 200 340 200 345"
              stroke={getTrunkColor()}
              strokeWidth="2"
              fill="none"
              opacity="0.4"
            />
            
            {/* Branches */}
            {generateBranches()}
            
            {/* Main foliage crown */}
            {stage !== 'seedling' && (
              <circle
                cx="200"
                cy={250 - (growthPercentage * 0.3)}
                r={20 + (growthPercentage * 0.4)}
                fill={getLeafColor(0.9)}
                className="transition-all duration-1000"
              />
            )}
            
            {/* Additional leaf clusters */}
            {generateLeaves()}
            
            {/* Flowers/fruits for mature trees */}
            {generateFlowers()}
            
            {/* Birds or butterflies for flourishing trees */}
            {stage === 'flourishing' && (
              <g className="animate-pulse">
                <text x="150" y="100" fontSize="16" className="animate-bounce">🦋</text>
                <text x="280" y="120" fontSize="14" className="animate-bounce" style={{ animationDelay: '1s' }}>🐦</text>
              </g>
            )}
            
            {/* Progress indicator */}
            <text x="200" y="30" textAnchor="middle" className="text-sm font-bold fill-emerald-700">
              Day {streakDays} of {maxDays}
            </text>
          </svg>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-emerald-100 rounded-full h-3 mb-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${growthPercentage}%` }}
          />
        </div>
        
        {/* Stage message */}
        <p className="text-center text-emerald-700 font-semibold mb-3">
          {getStageMessage()}
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="bg-white/60 rounded-lg p-2">
            <div className="font-bold text-emerald-800">{streakDays}</div>
            <div className="text-emerald-600 text-xs">Days Strong</div>
          </div>
          <div className="bg-white/60 rounded-lg p-2">
            <div className="font-bold text-emerald-800">{totalPrograms}</div>
            <div className="text-emerald-600 text-xs">Programs</div>
          </div>
          <div className="bg-white/60 rounded-lg p-2">
            <div className="font-bold text-emerald-800">{completedMilestones}</div>
            <div className="text-emerald-600 text-xs">Milestones</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}