import { Card, CardContent } from '../ui/card';
import { useState } from 'react';

interface ModernCrisisButtonProps {
  onCrisisActivated?: (type: 'emergency' | 'breathing' | 'support') => void;
  className?: string;
}

export default function ModernCrisisButton({ 
  onCrisisActivated,
  className = ""
}: ModernCrisisButtonProps) {
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [isBreathing, setIsBreathing] = useState(false);

  const startBreathingExercise = () => {
    setShowBreathingExercise(true);
    setIsBreathing(true);
    onCrisisActivated?.('breathing');
    
    // Breathing cycle: 4 seconds inhale, 4 seconds hold, 6 seconds exhale
    const breathingCycle = () => {
      setBreathingPhase('inhale');
      setTimeout(() => setBreathingPhase('hold'), 4000);
      setTimeout(() => setBreathingPhase('exhale'), 8000);
      setTimeout(() => {
        if (isBreathing) breathingCycle();
      }, 14000);
    };
    
    breathingCycle();
  };

  const stopBreathingExercise = () => {
    setShowBreathingExercise(false);
    setIsBreathing(false);
  };

  const handleEmergencyHelp = () => {
    onCrisisActivated?.('emergency');
    // In a real app, this would open emergency resources
  };

  if (showBreathingExercise) {
    return (
      <Card className={`
        relative overflow-hidden
        bg-gradient-to-br from-blue-50/95 via-cyan-50/80 to-blue-100/60
        backdrop-blur-lg border-0
        shadow-[0_12px_40px_rgba(59,130,246,0.25)]
        transition-all duration-500 ease-out
        before:absolute before:inset-0 
        before:bg-gradient-to-br before:from-blue-200/20 before:to-transparent
        before:backdrop-blur-sm
        ${className}
      `}>
        {/* Ambient breathing aura */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
          w-40 h-40 bg-gradient-radial from-blue-300/30 to-transparent rounded-full blur-2xl
          transition-all duration-4000 ease-in-out
          ${breathingPhase === 'inhale' ? 'scale-150 opacity-70' : 
            breathingPhase === 'hold' ? 'scale-125 opacity-60' : 
            'scale-100 opacity-40'}
        `}></div>
        
        <CardContent className="p-8 text-center relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-blue-800 mb-2">Guided Breathing</h3>
            <p className="text-blue-600 text-sm">Follow the circle to regulate your breathing</p>
          </div>
          
          {/* Enhanced Breathing Circle */}
          <div className="relative mb-8 flex justify-center">
            <div className={`
              w-32 h-32 rounded-full border-4 border-blue-400/60
              bg-gradient-to-br from-blue-100/80 to-cyan-100/60
              backdrop-blur-sm shadow-2xl
              flex items-center justify-center
              transition-all duration-1000 ease-in-out
              ${breathingPhase === 'inhale' ? 'scale-125 border-blue-500' : 
                breathingPhase === 'hold' ? 'scale-110 border-purple-500' : 
                'scale-90 border-green-500'}
            `}>
              <div className={`
                w-16 h-16 rounded-full
                bg-gradient-to-br from-white/90 to-blue-100/70
                shadow-lg transition-all duration-1000 ease-in-out
                flex items-center justify-center text-2xl
                ${breathingPhase === 'inhale' ? 'scale-125 bg-blue-200/80' : 
                  breathingPhase === 'hold' ? 'scale-110 bg-purple-200/80' : 
                  'scale-90 bg-green-200/80'}
              `}>
                {breathingPhase === 'inhale' ? '↗️' : 
                 breathingPhase === 'hold' ? '⏸️' : '↘️'}
              </div>
            </div>
          </div>
          
          {/* Breathing Instructions */}
          <div className="mb-8">
            <div className={`
              text-xl font-bold mb-2 transition-colors duration-500
              ${breathingPhase === 'inhale' ? 'text-blue-700' : 
                breathingPhase === 'hold' ? 'text-purple-700' : 
                'text-green-700'}
            `}>
              {breathingPhase === 'inhale' ? 'Breathe In' : 
               breathingPhase === 'hold' ? 'Hold' : 
               'Breathe Out'}
            </div>
            <div className="text-sm text-gray-600">
              {breathingPhase === 'inhale' ? 'Slowly fill your lungs (4 seconds)' : 
               breathingPhase === 'hold' ? 'Hold your breath gently (4 seconds)' : 
               'Slowly release your breath (6 seconds)'}
            </div>
          </div>
          
          {/* Controls */}
          <div className="space-y-3">
            <button
              onClick={stopBreathingExercise}
              className={`
                w-full bg-gradient-to-r from-gray-500 to-slate-600
                hover:from-gray-600 hover:to-slate-700
                text-white font-semibold py-3 rounded-xl
                shadow-lg hover:shadow-xl
                transition-all duration-300 transform hover:scale-105
                border border-gray-400/50
              `}
            >
              End Exercise
            </button>
            
            <p className="text-xs text-gray-500">
              Continue for 2-5 minutes for best results
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`
      relative overflow-hidden group
      bg-gradient-to-br from-red-50/95 via-orange-50/80 to-red-100/60
      backdrop-blur-lg border-0
      shadow-[0_12px_40px_rgba(239,68,68,0.25)]
      hover:shadow-[0_16px_48px_rgba(239,68,68,0.35)]
      transition-all duration-500 ease-out
      before:absolute before:inset-0 
      before:bg-gradient-to-br before:from-red-200/20 before:to-transparent
      before:backdrop-blur-sm
      ${className}
    `}>
      {/* Emergency pulsing aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-radial from-red-300/30 to-transparent rounded-full blur-2xl animate-pulse"></div>
      
      <CardContent className="p-6 text-center relative z-10">
        {/* Enhanced Emergency Icon */}
        <div className={`
          w-20 h-20 rounded-full mx-auto mb-6
          bg-gradient-to-br from-red-100/90 to-orange-100/70
          backdrop-blur-sm border-2 border-red-200/60
          shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(239,68,68,0.2)]
          flex items-center justify-center
          group-hover:scale-110 transition-all duration-300
          hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_12px_32px_rgba(239,68,68,0.3)]
        `}>
          <span className="text-4xl filter drop-shadow-lg animate-pulse">🆘</span>
        </div>
        
        <h3 className="text-xl font-bold text-red-800 mb-3">Need Immediate Help?</h3>
        <p className="text-red-700 text-sm mb-6 leading-relaxed">
          Crisis support is available 24/7. You're not alone in this journey.
        </p>
        
        {/* Enhanced Action Buttons */}
        <div className="space-y-4">
          {/* Emergency Help Button */}
          <button
            onClick={handleEmergencyHelp}
            className={`
              w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600
              hover:from-red-700 hover:via-red-600 hover:to-red-700
              text-white font-bold py-4 text-lg rounded-xl
              shadow-[0_8px_24px_rgba(239,68,68,0.4)]
              hover:shadow-[0_12px_32px_rgba(239,68,68,0.5)]
              transition-all duration-300 transform hover:scale-105
              border border-red-400/50
              relative overflow-hidden
              before:absolute before:inset-0 
              before:bg-gradient-to-r before:from-white/20 before:to-transparent
              before:backdrop-blur-sm
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-2xl">🚨</span>
              Get Help Now
            </span>
          </button>
          
          {/* Breathing Exercise Button */}
          <button
            onClick={startBreathingExercise}
            className={`
              w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600
              hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700
              text-white font-semibold py-3 rounded-xl
              shadow-[0_6px_20px_rgba(59,130,246,0.3)]
              hover:shadow-[0_8px_28px_rgba(59,130,246,0.4)]
              transition-all duration-300 transform hover:scale-105
              border border-blue-400/50
              relative overflow-hidden
              before:absolute before:inset-0 
              before:bg-gradient-to-r before:from-white/20 before:to-transparent
              before:backdrop-blur-sm
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-xl">🫁</span>
              Breathing Exercise
            </span>
          </button>
          
          {/* Support Resources Button */}
          <button
            onClick={() => onCrisisActivated?.('support')}
            className={`
              w-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600
              hover:from-purple-600 hover:via-violet-600 hover:to-purple-700
              text-white font-semibold py-3 rounded-xl
              shadow-[0_6px_20px_rgba(147,51,234,0.3)]
              hover:shadow-[0_8px_28px_rgba(147,51,234,0.4)]
              transition-all duration-300 transform hover:scale-105
              border border-purple-400/50
              relative overflow-hidden
              before:absolute before:inset-0 
              before:bg-gradient-to-r before:from-white/20 before:to-transparent
              before:backdrop-blur-sm
            `}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-xl">💜</span>
              Support Resources
            </span>
          </button>
        </div>
        
        {/* Reassurance Message */}
        <div className={`
          mt-6 p-4 rounded-xl
          bg-white/60 backdrop-blur-sm border border-white/60
          shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_8px_rgba(0,0,0,0.1)]
        `}>
          <p className="text-xs text-gray-600 font-medium mb-1">
            🔒 All conversations are confidential
          </p>
          <p className="text-xs text-gray-500">
            Professional counselors available 24/7
          </p>
        </div>
        
        {/* Quick Access Numbers */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className={`
            p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/50
            hover:bg-white/50 transition-colors duration-200
          `}>
            <div className="font-semibold text-gray-800">Crisis Line</div>
            <div className="text-gray-600">988</div>
          </div>
          <div className={`
            p-2 rounded-lg bg-white/40 backdrop-blur-sm border border-white/50
            hover:bg-white/50 transition-colors duration-200
          `}>
            <div className="font-semibold text-gray-800">Emergency</div>
            <div className="text-gray-600">911</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}