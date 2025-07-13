import LifeTree from './components/LifeTree';
import StreakCounter from './components/StreakCounter';
import DailyTasks from './components/DailyTasks';
import CrisisButton from './components/CrisisButton';

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
  }
];

function ComponentTest() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🌟 RecovR Enhanced Components Test
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Testing the improved features that compete with Quittr
          </p>
          <p className="text-sm text-gray-500">
            Life Tree • Streak Tracking • Daily Tasks • Crisis Support
          </p>
        </div>

        {/* Life Tree Showcase */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <span>🌳</span> Enhanced Life Tree Visualization
          </h2>
          <p className="text-gray-600 mb-4">
            Dynamic SVG tree that grows with recovery progress. Much better than the broken circles!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <LifeTree streakDays={3} totalPrograms={1} completedMilestones={0} />
            <LifeTree streakDays={25} totalPrograms={2} completedMilestones={3} />
            <LifeTree streakDays={68} totalPrograms={2} completedMilestones={9} />
          </div>
        </div>

        {/* Streak Counter Showcase */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <span>🔥</span> Multi-Addiction Streak Counter
          </h2>
          <p className="text-gray-600 mb-4">
            Beautiful cards with progress tracking, milestones, and motivational messages.
          </p>
          <StreakCounter 
            programs={mockPrograms}
            onCreateProgram={() => console.log('Create new program')}
          />
        </div>

        {/* Daily Tasks Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span>✅</span> Gamified Daily Tasks
            </h2>
            <p className="text-gray-600 mb-4">
              XP system with categorized wellness tasks to boost engagement.
            </p>
            <DailyTasks 
              totalXP={125}
              onCompleteTask={(taskId) => console.log('Task completed:', taskId)}
            />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <span>🆘</span> Crisis Support
            </h2>
            <p className="text-gray-600 mb-4">
              24/7 crisis intervention with breathing exercises and emergency resources.
            </p>
            <CrisisButton 
              onCrisisActivated={(type) => console.log('Crisis:', type)}
            />
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            🎯 RecovR vs Quittr Feature Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-emerald-700 mb-4">✅ RecovR Advantages</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Multi-addiction support (vs single focus)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Better pricing ($24.99/year vs $19.99-$49.99)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Advanced Life Tree visualization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Comprehensive daily task system
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Integrated crisis intervention
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  Community support features
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-700 mb-4">📈 Key Metrics</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">90</div>
                  <div className="text-sm text-blue-700">Day Programs</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">10+</div>
                  <div className="text-sm text-purple-700">Addiction Types</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-emerald-600">24/7</div>
                  <div className="text-sm text-emerald-700">Crisis Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-600">
            🚀 RecovR - More features, better support, affordable pricing
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your comprehensive recovery companion
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComponentTest;