import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface CrisisButtonProps {
  onCrisisActivated?: (crisisType: string) => void;
  className?: string;
}

export default function CrisisButton({ onCrisisActivated, className = "" }: CrisisButtonProps) {
  const [showResources, setShowResources] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');

  const crisisResources = [
    {
      title: 'National Suicide Prevention Lifeline',
      contact: '988',
      description: '24/7 crisis support',
      icon: '☎️',
      urgent: true
    },
    {
      title: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      description: 'Text-based crisis support',
      icon: '💬',
      urgent: true
    },
    {
      title: 'SAMHSA National Helpline',
      contact: '1-800-662-4357',
      description: 'Substance abuse and mental health services',
      icon: '🏥',
      urgent: false
    },
    {
      title: 'Local Emergency Services',
      contact: '911',
      description: 'For immediate emergency assistance',
      icon: '🚨',
      urgent: true
    }
  ];

  const breathingExercise = {
    inhale: { duration: 4, instruction: 'Breathe in slowly...', color: 'from-blue-400 to-blue-600' },
    hold: { duration: 4, instruction: 'Hold your breath...', color: 'from-purple-400 to-purple-600' },
    exhale: { duration: 6, instruction: 'Breathe out slowly...', color: 'from-green-400 to-green-600' },
    rest: { duration: 2, instruction: 'Rest and prepare...', color: 'from-gray-400 to-gray-600' }
  };

  const startBreathingExercise = () => {
    setShowBreathing(true);
    setBreathingCount(0);
    setBreathingPhase('inhale');
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    const phases: Array<keyof typeof breathingExercise> = ['inhale', 'hold', 'exhale', 'rest'];
    let currentPhaseIndex = 0;
    let cycleCount = 0;

    const nextPhase = () => {
      if (cycleCount >= 5) { // 5 complete cycles
        setShowBreathing(false);
        setBreathingCount(0);
        return;
      }

      setBreathingPhase(phases[currentPhaseIndex]);
      const currentPhase = breathingExercise[phases[currentPhaseIndex]];
      
      setTimeout(() => {
        currentPhaseIndex++;
        if (currentPhaseIndex >= phases.length) {
          currentPhaseIndex = 0;
          cycleCount++;
          setBreathingCount(cycleCount);
        }
        if (cycleCount < 5) {
          nextPhase();
        } else {
          setShowBreathing(false);
          setBreathingCount(0);
        }
      }, currentPhase.duration * 1000);
    };

    nextPhase();
  };

  const handleCrisisClick = () => {
    setShowResources(true);
    if (onCrisisActivated) {
      onCrisisActivated('emergency');
    }
  };

  // Breathing Exercise Modal
  if (showBreathing) {
    const currentPhase = breathingExercise[breathingPhase];
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Breathing Exercise</h2>
            
            {/* Breathing Circle */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <div 
                className={`w-full h-full rounded-full bg-gradient-to-br ${currentPhase.color} animate-pulse transition-all duration-1000`}
                style={{
                  transform: breathingPhase === 'inhale' ? 'scale(1.2)' : 
                            breathingPhase === 'hold' ? 'scale(1.2)' : 
                            'scale(1.0)',
                  transition: `transform ${currentPhase.duration}s ease-in-out`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {breathingPhase === 'inhale' ? '🫁' : 
                   breathingPhase === 'hold' ? '⏸️' : 
                   breathingPhase === 'exhale' ? '💨' : '😌'}
                </span>
              </div>
            </div>
            
            <p className="text-lg font-medium text-gray-700 mb-4">
              {currentPhase.instruction}
            </p>
            
            <div className="text-sm text-gray-600 mb-6">
              Cycle {breathingCount + 1} of 5
            </div>
            
            <Button 
              onClick={() => setShowBreathing(false)}
              variant="outline"
              className="mt-4"
            >
              Stop Exercise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Crisis Resources Modal
  if (showResources) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-600">Crisis Support Resources</h2>
              <Button 
                onClick={() => setShowResources(false)}
                variant="outline"
                size="sm"
              >
                ✕ Close
              </Button>
            </div>
            
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-2">
                🚨 If you're in immediate danger, call emergency services (911) now.
              </p>
              <p className="text-red-700 text-sm">
                You are not alone. Help is available 24/7.
              </p>
            </div>

            <div className="grid gap-4 mb-6">
              {crisisResources.map((resource, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    resource.urgent 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{resource.icon}</span>
                    <h3 className={`font-semibold ${
                      resource.urgent ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {resource.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{resource.description}</p>
                  <div className={`font-bold text-lg ${
                    resource.urgent ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {resource.contact}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <span>🧘</span>
                Immediate Coping Strategies
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>• Take slow, deep breaths</p>
                <p>• Ground yourself: name 5 things you can see, 4 you can touch, 3 you can hear</p>
                <p>• Remind yourself: "This feeling will pass"</p>
                <p>• Reach out to a trusted friend or family member</p>
              </div>
              
              <Button 
                onClick={startBreathingExercise}
                className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                🫁 Start Breathing Exercise
              </Button>
            </div>

            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                Remember: Seeking help is a sign of strength, not weakness.
              </p>
              <Button 
                onClick={() => setShowResources(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                I'm Safe for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Crisis Button
  return (
    <Card className={`bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🆘</span>
        </div>
        
        <h3 className="text-lg font-semibold text-red-700 mb-2">
          Need Immediate Help?
        </h3>
        
        <p className="text-red-600 text-sm mb-4">
          Crisis support is available 24/7. You're not alone.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleCrisisClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            🚨 Get Help Now
          </Button>
          
          <Button 
            onClick={startBreathingExercise}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
          >
            🫁 Breathing Exercise
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          All conversations are confidential
        </p>
      </CardContent>
    </Card>
  );
}