import React, { useState, useEffect } from 'react';
import { FinancialOverview, FinancialProjections, FinancialGoals } from '../../services/financialService';
import { financialService } from '../../services/financialService';
import LoadingSpinner from '../LoadingSpinner';

interface FinancialDashboardProps {
  className?: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ className = '' }) => {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [goals, setGoals] = useState<FinancialGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'projections' | 'goals'>('overview');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [projections, setProjections] = useState<FinancialProjections | null>(null);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showLogSavingsModal, setShowLogSavingsModal] = useState(false);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const [overviewData, goalsData] = await Promise.all([
          financialService.getFinancialOverview(),
          financialService.getFinancialGoals()
        ]);
        setOverview(overviewData);
        setGoals(goalsData);
        
        // Set first program as default for projections
        if (overviewData.programs.length > 0) {
          setSelectedProgram(overviewData.programs[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch financial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  useEffect(() => {
    const fetchProjections = async () => {
      if (selectedProgram && selectedTab === 'projections') {
        try {
          const projectionsData = await financialService.getProjections(selectedProgram);
          setProjections(projectionsData);
        } catch (error) {
          console.error('Failed to fetch projections:', error);
        }
      }
    };

    fetchProjections();
  }, [selectedProgram, selectedTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!overview || !goals) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Failed to load financial data</p>
      </div>
    );
  }

  const { summary, programs, achievements, insights, motivationalGoals } = overview;
  const savingsTier = financialService.getSavingsTier(summary.totalSaved);
  const savingsRate = financialService.calculateSavingsRate(summary.totalSaved, 
    programs.reduce((sum, p) => sum + p.totalDays, 0));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Financial Recovery
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Track your savings and financial motivation
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {financialService.formatCurrency(summary.totalSaved)}
            </div>
            <div className={`text-sm font-medium text-${savingsTier.color}-600 dark:text-${savingsTier.color}-400`}>
              {savingsTier.tier}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.totalPrograms}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Programs Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {financialService.formatCurrency(summary.averageDailySavings)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Daily Average</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {financialService.formatCurrency(savingsRate.weekly)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Weekly Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {achievements.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Achievements</div>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {savingsTier.nextTier && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Progress to {financialService.getSavingsTier(savingsTier.nextTier).tier}
              </span>
              <span className="font-medium">
                {financialService.formatCurrency(savingsTier.nextTier - summary.totalSaved)} remaining
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div 
                className={`bg-gradient-to-r from-${savingsTier.color}-400 to-${savingsTier.color}-600 h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((summary.totalSaved / savingsTier.nextTier) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={() => setShowAddCostModal(true)}
          className="btn-primary"
        >
          💰 Update Daily Costs
        </button>
        <button
          onClick={() => setShowLogSavingsModal(true)}
          className="btn-secondary"
        >
          📝 Log Savings
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: '💰' },
          { key: 'projections', label: 'Projections', icon: '📈' },
          { key: 'goals', label: 'Goals', icon: '🎯' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors ${
              selectedTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <OverviewTab 
          overview={overview}
          onUpdateCosts={() => setShowAddCostModal(true)}
        />
      )}

      {selectedTab === 'projections' && (
        <ProjectionsTab 
          programs={programs}
          selectedProgram={selectedProgram}
          onProgramChange={setSelectedProgram}
          projections={projections}
        />
      )}

      {selectedTab === 'goals' && (
        <GoalsTab goals={goals} />
      )}

      {/* Modals */}
      {showAddCostModal && (
        <UpdateCostModal
          programs={programs}
          onClose={() => setShowAddCostModal(false)}
          onSave={() => {
            setShowAddCostModal(false);
            // Refresh data
            window.location.reload();
          }}
        />
      )}

      {showLogSavingsModal && (
        <LogSavingsModal
          programs={programs}
          onClose={() => setShowLogSavingsModal(false)}
          onSave={() => {
            setShowLogSavingsModal(false);
            // Refresh data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  overview: FinancialOverview;
  onUpdateCosts: () => void;
}> = ({ overview, onUpdateCosts }) => {
  const { programs, recentLogs, insights, motivationalGoals, monthlyBreakdown } = overview;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Program Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Program Savings
        </h3>
        <div className="space-y-4">
          {programs.map((program) => (
            <div key={program.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{program.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {program.addictionType}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {financialService.formatCurrency(program.dailyCost)}/day • {program.totalDays} days
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {financialService.formatCurrency(program.totalSaved)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Saved
                  </div>
                </div>
              </div>
              
              {/* Projection Preview */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {financialService.formatCurrency(program.projections.oneMonth)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">1 Month</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {financialService.formatCurrency(program.projections.threeMonths)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">3 Months</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {financialService.formatCurrency(program.projections.oneYear)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">1 Year</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {programs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No programs with cost tracking yet
              </p>
              <button onClick={onUpdateCosts} className="btn-primary">
                Add Daily Costs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Insights */}
      <div className="space-y-6">
        {/* Recent Logs */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {log.programName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(log.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600 dark:text-green-400">
                    +{financialService.formatCurrency(log.amount)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {log.calculationMethod}
                  </div>
                </div>
              </div>
            ))}
            
            {recentLogs.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No savings logged yet
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Financial Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 {insight}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Goals */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Motivational Goals
          </h3>
          <div className="space-y-3">
            {motivationalGoals.map((goal, index) => (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {goal.title}
                  </span>
                  {goal.progress && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(goal.progress)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {goal.description}
                </p>
                {goal.progress && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Projections Tab Component
const ProjectionsTab: React.FC<{
  programs: FinancialOverview['programs'];
  selectedProgram: string;
  onProgramChange: (programId: string) => void;
  projections: FinancialProjections | null;
}> = ({ programs, selectedProgram, onProgramChange, projections }) => {
  const [timeframe, setTimeframe] = useState('1_year');

  return (
    <div className="space-y-6">
      {/* Program Selector */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => onProgramChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.addictionType} - {financialService.formatCurrency(program.dailyCost)}/day
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
              <option value="1_year">1 Year</option>
              <option value="5_years">5 Years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projections Display */}
      {projections && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Savings Projection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Savings Projection
            </h3>
            <div className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {financialService.formatCurrency(projections.projections.totalProjected)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total by {new Date(projections.projections.projectionDate).toLocaleDateString()}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {financialService.formatCurrency(projections.projections.currentSaved)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Already Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {financialService.formatCurrency(projections.projections.projectedAdditional)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Future Savings</div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Alternatives */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What You Could Buy
            </h3>
            <div className="space-y-3">
              {projections.purchaseAlternatives.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {item.item}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {financialService.formatCurrency(item.cost)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Motivational Messages */}
      {projections && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Motivation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projections.motivationalMessages.map((message, index) => (
              <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <p className="text-center text-gray-800 dark:text-gray-200 font-medium">
                  "{message}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Goals Tab Component
const GoalsTab: React.FC<{ goals: FinancialGoals }> = ({ goals }) => {
  return (
    <div className="space-y-6">
      {/* Current Progress */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Milestone Progress
        </h3>
        
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {financialService.formatCurrency(goals.currentSavings)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Current Savings</div>
        </div>

        {goals.milestones.next && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Progress to {goals.milestones.next.title}
              </span>
              <span className="font-medium">
                {Math.round(goals.milestones.progressToNext)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 mb-4">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${goals.milestones.progressToNext}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {goals.milestones.next.description}
            </p>
          </div>
        )}
      </div>

      {/* Completed Milestones */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Completed Milestones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.milestones.completed.map((milestone, index) => (
            <div key={index} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    {milestone.title}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {milestone.description}
                  </div>
                </div>
                <div className="text-2xl">✅</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Challenges */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Savings Challenges
        </h3>
        <div className="space-y-4">
          {goals.challenges.map((challenge, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {challenge.title}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  challenge.difficulty === 'easy' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {challenge.difficulty}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {challenge.description}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Reward: {challenge.reward}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Financial Insights
        </h3>
        <div className="space-y-3">
          {goals.insights.map((insight, index) => (
            <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 {insight}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Update Cost Modal
const UpdateCostModal: React.FC<{
  programs: FinancialOverview['programs'];
  onClose: () => void;
  onSave: () => void;
}> = ({ programs, onClose, onSave }) => {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [dailyCost, setDailyCost] = useState('');

  const handleSave = async () => {
    try {
      await financialService.updateDailyCost(selectedProgram, {
        dailyCost: parseFloat(dailyCost)
      });
      onSave();
    } catch (error) {
      console.error('Failed to update daily cost:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Update Daily Cost
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.addictionType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={dailyCost}
              onChange={(e) => setDailyCost(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary flex-1" 
            disabled={!selectedProgram || !dailyCost}
          >
            Update Cost
          </button>
        </div>
      </div>
    </div>
  );
};

// Log Savings Modal
const LogSavingsModal: React.FC<{
  programs: FinancialOverview['programs'];
  onClose: () => void;
  onSave: () => void;
}> = ({ programs, onClose, onSave }) => {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    try {
      await financialService.logSavings({
        programId: selectedProgram,
        amount: parseFloat(amount),
        calculationMethod: 'manual',
        notes
      });
      onSave();
    } catch (error) {
      console.error('Failed to log savings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Log Manual Savings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Program
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.addictionType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount Saved ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              placeholder="Why did you save this money?"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary flex-1" 
            disabled={!selectedProgram || !amount}
          >
            Log Savings
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;