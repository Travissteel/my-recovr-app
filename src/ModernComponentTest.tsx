import ModernLifeTree from './components/enhanced/ModernLifeTree';
import ModernStreakCounter from './components/enhanced/ModernStreakCounter';
import ModernDailyTasks from './components/enhanced/ModernDailyTasks';
import ModernCrisisButton from './components/enhanced/ModernCrisisButton';

// Mock data for testing
const mockPrograms = [
  {
    id: '1',
    programName: 'Pornography Recovery',
    currentStreak: 15,
    longestStreak: 32,
    startDate: '2024-12-01',
    status: 'active',
    addictionType: 'pornography',
    targetDurationDays: 90
  },
  {
    id: '2',
    programName: 'Social Media Detox',
    currentStreak: 7,
    longestStreak: 21,
    startDate: '2024-12-15',
    status: 'active',
    addictionType: 'social_media',
    targetDurationDays: 90
  },
  {
    id: '3',
    programName: 'Substance Recovery',
    currentStreak: 45,
    longestStreak: 67,
    startDate: '2024-11-01',
    status: 'active',
    addictionType: 'substance',
    targetDurationDays: 90
  }
];

function ModernComponentTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 py-8">
      <div className="container mx-auto px-4 space-y-12 max-w-7xl">
        {/* Enhanced Header */}
        <div className="text-center mb-16 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-96 h-96 bg-gradient-radial from-purple-200 to-transparent rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-900 bg-clip-text text-transparent mb-6">
              ✨ RecovR Modern UI/UX
            </h1>
            <p className="text-2xl text-gray-700 mb-4 font-medium">
              Premium glassmorphism design with micro-interactions
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Enhanced visual hierarchy • Depth perception • Tactile feedback
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {[
                { text: 'Glassmorphism Effects', icon: '💎' },
                { text: 'Micro-interactions', icon: '⚡' },
                { text: 'Premium Animations', icon: '🎭' },
                { text: 'Accessibility Ready', icon: '♿' }
              ].map((badge, index) => (
                <div 
                  key={index}
                  className="px-4 py-2 bg-white/40 backdrop-blur-sm border border-white/60 rounded-full text-gray-700 font-medium shadow-lg"
                >
                  <span className="mr-2">{badge.icon}</span>
                  {badge.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modern Life Tree Showcase */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <span className="text-5xl">🌳</span> 
              Enhanced Life Tree Visualization
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Premium SVG animations with depth, lighting, and particle effects
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 backdrop-blur-sm border border-emerald-200/60 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-emerald-700 font-semibold text-sm">Advanced Glassmorphism</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h3 className="text-center font-semibold text-gray-700">Seedling Stage</h3>
              <ModernLifeTree streakDays={3} totalPrograms={1} completedMilestones={0} />
            </div>
            <div className="space-y-3">
              <h3 className="text-center font-semibold text-gray-700">Growing Stage</h3>
              <ModernLifeTree streakDays={25} totalPrograms={2} completedMilestones={3} />
            </div>
            <div className="space-y-3">
              <h3 className="text-center font-semibold text-gray-700">Flourishing Stage</h3>
              <ModernLifeTree streakDays={68} totalPrograms={2} completedMilestones={9} />
            </div>
          </div>
        </section>

        {/* Modern Streak Counter Showcase */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <span className="text-5xl">🔥</span> 
              Multi-Addiction Progress Cards
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Neumorphism design with dynamic gradients and hover transformations
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm border border-blue-200/60 rounded-full">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-blue-700 font-semibold text-sm">Interactive Micro-animations</span>
            </div>
          </div>
          
          <ModernStreakCounter 
            programs={mockPrograms}
            onCreateProgram={() => console.log('Create new modern program')}
          />
        </section>

        {/* Modern Daily Tasks & Crisis Support */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
                <span className="text-5xl">✅</span> 
                Enhanced Daily Wellness
              </h2>
              <p className="text-xl text-gray-600 mb-2">
                Gamified task system with state-aware animations and progress rings
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100/80 backdrop-blur-sm border border-purple-200/60 rounded-full">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                <span className="text-purple-700 font-semibold text-sm">Smart Visual Feedback</span>
              </div>
            </div>
            
            <ModernDailyTasks 
              totalXP={450}
              onCompleteTask={(taskId) => console.log('Modern task completed:', taskId)}
            />
          </div>
          
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
                <span className="text-5xl">🆘</span> 
                Crisis Intervention
              </h2>
              <p className="text-xl text-gray-600 mb-2">
                24/7 support with guided breathing and emergency resources
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100/80 backdrop-blur-sm border border-red-200/60 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-700 font-semibold text-sm">Immediate Response</span>
              </div>
            </div>
            
            <ModernCrisisButton 
              onCrisisActivated={(type) => console.log('Modern crisis activated:', type)}
            />
          </div>
        </section>

        {/* Design System Showcase */}
        <section className="bg-white/60 backdrop-blur-lg rounded-2xl p-8 border border-white/80 shadow-[0_8px_32px_rgba(31,38,135,0.15)]">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            🎨 Modern Design System Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Glassmorphism',
                description: 'Translucent surfaces with backdrop blur effects',
                icon: '💎',
                gradient: 'from-blue-500/20 to-purple-500/20'
              },
              {
                title: 'Neumorphism',
                description: 'Soft inset/outset shadows for tactile depth',
                icon: '🎭',
                gradient: 'from-gray-200/40 to-slate-300/40'
              },
              {
                title: 'Micro-interactions',
                description: 'Responsive hover states and transformations',
                icon: '⚡',
                gradient: 'from-emerald-500/20 to-green-500/20'
              },
              {
                title: 'Dynamic Gradients',
                description: 'Context-aware color schemes and progressions',
                icon: '🌈',
                gradient: 'from-pink-500/20 to-orange-500/20'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`
                  p-6 rounded-xl text-center
                  bg-gradient-to-br ${feature.gradient}
                  backdrop-blur-sm border border-white/60
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_16px_rgba(0,0,0,0.1)]
                  hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_24px_rgba(0,0,0,0.15)]
                  transition-all duration-300 transform hover:scale-105
                  hover:bg-white/20
                `}
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="bg-gradient-to-r from-slate-900/95 to-gray-900/95 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl text-white">
          <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🛠️ Technical Implementation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Visual Effects</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  CSS backdrop-filter blur effects
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Multi-layer gradient overlays
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Inset/outset shadow combinations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Dynamic SVG animations
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Interactions</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Hover state transformations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Spring physics animations
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  State-aware visual feedback
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Touch-responsive scaling
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-emerald-400">Performance</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Hardware-accelerated CSS
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Optimized re-renders
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Efficient animation timing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Mobile-first responsive
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-12 border-t border-gray-200/60">
          <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-4">
            🚀 RecovR - Premium UI/UX Complete
          </h3>
          <p className="text-xl text-gray-600 mb-6">
            Modern design system with glassmorphism, neumorphism, and micro-interactions
          </p>
          <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Production Ready
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Premium Aesthetics
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Engaging Interactions
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
              Accessibility Focused
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModernComponentTest;