import { Upload, CreditCard, TrendingUp, Award, AlertTriangle, X, CheckCircle, Zap, DollarSign } from 'lucide-react';
import { useState } from 'react';

// Types
interface MonthlyData {
  month: string;
  spend: number;
  utilization: number;
  rewards: number;
}

interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CardData {
  id: string;
  name: string;
  limit: number;
  annualFee: number;
  currentUtilization: number;
  lastMonthSpend: number;
  rewardsEarned: number;
  healthScore: number;
  monthlyData: MonthlyData[];
  categorySpend: CategorySpend[];
  insights: string[];
}

// Mock Data
const mockCards: CardData[] = [
  {
    id: 'card-1',
    name: 'HDFC Regalia',
    limit: 200000,
    annualFee: 2500,
    currentUtilization: 24.5,
    lastMonthSpend: 49000,
    rewardsEarned: 980,
    healthScore: 85,
    monthlyData: [
      { month: 'Aug', spend: 45000, utilization: 22.5, rewards: 900 },
      { month: 'Sep', spend: 52000, utilization: 26.0, rewards: 1040 },
      { month: 'Oct', spend: 48000, utilization: 24.0, rewards: 960 },
      { month: 'Nov', spend: 51000, utilization: 25.5, rewards: 1020 },
      { month: 'Dec', spend: 55000, utilization: 27.5, rewards: 1100 },
      { month: 'Jan', spend: 49000, utilization: 24.5, rewards: 980 },
    ],
    categorySpend: [
      { category: 'Dining', amount: 15000, percentage: 30.6, color: '#4F46E5' },
      { category: 'Shopping', amount: 12000, percentage: 24.5, color: '#7C3AED' },
      { category: 'Travel', amount: 10000, percentage: 20.4, color: '#EC4899' },
      { category: 'Groceries', amount: 8000, percentage: 16.3, color: '#F59E0B' },
      { category: 'Others', amount: 4000, percentage: 8.2, color: '#10B981' },
    ],
    insights: [
      'Stable usage pattern - low variance over 6 months',
      'Excellent rewards rate of 2% across all categories',
      'Annual fee recovered within 3 months',
      'Safe utilization buffer maintained consistently',
    ]
  },
  {
    id: 'card-2',
    name: 'SBI SimplyCLICK',
    limit: 150000,
    annualFee: 499,
    currentUtilization: 67.3,
    lastMonthSpend: 101000,
    rewardsEarned: 5050,
    healthScore: 62,
    monthlyData: [
      { month: 'Aug', spend: 85000, utilization: 56.7, rewards: 4250 },
      { month: 'Sep', spend: 92000, utilization: 61.3, rewards: 4600 },
      { month: 'Oct', spend: 125000, utilization: 83.3, rewards: 6250 },
      { month: 'Nov', spend: 78000, utilization: 52.0, rewards: 3900 },
      { month: 'Dec', spend: 95000, utilization: 63.3, rewards: 4750 },
      { month: 'Jan', spend: 101000, utilization: 67.3, rewards: 5050 },
    ],
    categorySpend: [
      { category: 'Online Shopping', amount: 45000, percentage: 44.6, color: '#4F46E5' },
      { category: 'Bills', amount: 25000, percentage: 24.8, color: '#7C3AED' },
      { category: 'Groceries', amount: 18000, percentage: 17.8, color: '#EC4899' },
      { category: 'Dining', amount: 8000, percentage: 7.9, color: '#F59E0B' },
      { category: 'Others', amount: 5000, percentage: 5.0, color: '#10B981' },
    ],
    insights: [
      'High utilization in Oct (83%) - consider spreading spend',
      'Excellent 5% rewards on online shopping',
      'Utilization trend showing upward pattern - monitor closely',
      'Annual fee recovered in first month',
    ]
  }
];

function App() {
  const [step, setStep] = useState<'welcome' | 'upload' | 'processing' | 'dashboard'>('welcome');
  const [progress, setProgress] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [showRecommender, setShowRecommender] = useState(false);
  const [merchantType, setMerchantType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [priority, setPriority] = useState<'rewards' | 'safety' | 'balance'>('balance');
  const [recommendation, setRecommendation] = useState<{
    card: CardData;
    reasoning: string[];
    alternatives: Array<{ card: CardData; reason: string }>;
  } | null>(null);

  const handleUpload = () => {
    setStep('processing');
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('dashboard'), 500);
      }
    }, 300);
  };

  const getRecommendation = () => {
    if (!merchantType || !amount) {
      alert('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    
    const availableCards = mockCards.filter(card => {
      const newUtilization = ((card.limit * card.currentUtilization / 100) + amountNum) / card.limit * 100;
      return newUtilization < 80;
    });

    if (availableCards.length === 0) {
      alert('This amount would push all cards above safe utilization limits!');
      return;
    }

    let recommendedCard: CardData;
    let reasoning: string[] = [];
    let alternatives: Array<{ card: CardData; reason: string }> = [];

    const categoryMatch = availableCards.map(card => {
      const categorySpend = card.categorySpend.find(c => 
        c.category.toLowerCase().includes(merchantType.toLowerCase())
      );
      return {
        card,
        categoryAmount: categorySpend?.amount || 0,
        categoryPercentage: categorySpend?.percentage || 0
      };
    });

    if (priority === 'rewards') {
      const sorted = categoryMatch.sort((a, b) => b.categoryAmount - a.categoryAmount);
      recommendedCard = sorted[0].card;
      
      const topCategory = sorted[0].card.categorySpend.find(c => 
        c.category.toLowerCase().includes(merchantType.toLowerCase())
      );
      
      reasoning = [
        `Highest historical ${merchantType} spending (${topCategory?.percentage.toFixed(1)}% of total)`,
        `Current utilization at safe ${recommendedCard.currentUtilization}%`,
        `Health score of ${recommendedCard.healthScore} indicates stable usage`
      ];

      if (sorted.length > 1) {
        alternatives.push({
          card: sorted[1].card,
          reason: `Also good for ${merchantType}, currently at ${sorted[1].card.currentUtilization}% utilization`
        });
      }

    } else if (priority === 'safety') {
      const sorted = availableCards.sort((a, b) => a.currentUtilization - b.currentUtilization);
      recommendedCard = sorted[0];
      
      const newUtil = ((recommendedCard.limit * recommendedCard.currentUtilization / 100) + amountNum) / recommendedCard.limit * 100;
      
      reasoning = [
        `Lowest current utilization at ${recommendedCard.currentUtilization}%`,
        `After this purchase, utilization will be ${newUtil.toFixed(1)}% (safe)`,
        `Plenty of buffer remaining on this card`
      ];

      if (sorted.length > 1) {
        alternatives.push({
          card: sorted[1].card,
          reason: `Second-safest option at ${sorted[1].card.currentUtilization}% utilization`
        });
      }

    } else {
      const scored = availableCards.map(card => {
        const categorySpend = card.categorySpend.find(c => 
          c.category.toLowerCase().includes(merchantType.toLowerCase())
        );
        const categoryScore = categorySpend?.percentage || 0;
        const safetyScore = 100 - card.currentUtilization;
        const healthScore = card.healthScore;
        
        return {
          card,
          score: (categoryScore * 0.4) + (safetyScore * 0.3) + (healthScore * 0.3)
        };
      });

      const sorted = scored.sort((a, b) => b.score - a.score);
      recommendedCard = sorted[0].card;
      
      reasoning = [
        `Best balance of rewards potential and safe utilization`,
        `Moderate ${merchantType} usage (good category fit)`,
        `Current utilization at ${recommendedCard.currentUtilization}% (healthy)`,
        `Overall health score: ${recommendedCard.healthScore}`
      ];

      if (sorted.length > 1) {
        alternatives.push({
          card: sorted[1].card,
          reason: 'Also well-balanced for this purchase'
        });
      }
    }

    setRecommendation({ card: recommendedCard, reasoning, alternatives });
  };

  // Welcome Screen
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-4">
              <CreditCard className="w-12 h-12 text-indigo-600" />
              <h1 className="text-4xl font-bold text-gray-800">CardSense</h1>
            </div>
            <p className="text-gray-600 text-xl">
              Know how to use your credit cards — every single time.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl">📊</div>
              <div>
                <h3 className="font-semibold text-gray-800">Understand Your Usage Patterns</h3>
                <p className="text-gray-600 text-sm">See which cards create value and which don't</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-gray-800">Smart Recommendations</h3>
                <p className="text-gray-600 text-sm">Know which card to use for every payment</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-800">Privacy First</h3>
                <p className="text-gray-600 text-sm">Your data stays with you, processed locally</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setStep('upload')}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started →
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            You'll need credit card statements from the last 12+ months
          </p>
        </div>
      </div>
    );
  }

  // Upload Screen
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <button 
              onClick={() => setStep('welcome')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              ← Back
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Your Statements</h2>
            <p className="text-gray-600">PDF or CSV files • Minimum 12 months</p>
          </div>

          <div 
            onClick={handleUpload}
            className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer"
          >
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Supported: PDF, CSV (Demo Mode)
            </p>
            <span className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium">
              Choose Files
            </span>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 How to get your statements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Log into your bank's website/app</li>
              <li>• Go to Credit Card → Statements</li>
              <li>• Download last 12-36 months as PDF or CSV</li>
              <li>• Upload all files here</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Processing Screen
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Your Statements...</h2>
          <p className="text-gray-600 mb-6">Analyzing your data</p>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="mt-8 space-y-2 text-left max-w-md mx-auto">
            <div className={`flex items-center gap-2 ${progress > 30 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="w-5 h-5 bg-current rounded-full flex items-center justify-center">
                {progress > 30 && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">Parsing statements...</span>
            </div>
            <div className={`flex items-center gap-2 ${progress > 60 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="w-5 h-5 bg-current rounded-full flex items-center justify-center">
                {progress > 60 && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">Analyzing patterns...</span>
            </div>
            <div className={`flex items-center gap-2 ${progress > 90 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="w-5 h-5 bg-current rounded-full flex items-center justify-center">
                {progress > 90 && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">Generating insights...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed Card Modal
  const card = selectedCard;
  if (card) {
    const avgUtilization = card.monthlyData.reduce((sum, m) => sum + m.utilization, 0) / card.monthlyData.length;
    const totalRewards = card.monthlyData.reduce((sum, m) => sum + m.rewards, 0);
    const totalSpend = card.monthlyData.reduce((sum, m) => sum + m.spend, 0);
    const effectiveRate = (totalRewards / totalSpend) * 100;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-50 rounded-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
          
          <div className="bg-white p-6 rounded-t-2xl border-b border-gray-200 sticky top-0 z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{card.name}</h2>
                <p className="text-sm text-gray-500">Detailed Analysis</p>
              </div>
              <button 
                onClick={() => setSelectedCard(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-600">Avg Utilization</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{avgUtilization.toFixed(1)}%</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Total Rewards</span>
                </div>
                <p className="text-2xl font-bold text-green-600">₹{totalRewards}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-600">Effective Rate</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{effectiveRate.toFixed(2)}%</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    card.healthScore > 75 ? 'bg-green-100' : 
                    card.healthScore > 50 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      card.healthScore > 75 ? 'text-green-600' : 
                      card.healthScore > 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {card.healthScore}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">Health Score</span>
                </div>
                <p className="text-sm text-gray-700">
                  {card.healthScore > 75 ? 'Excellent' : card.healthScore > 50 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Spending</h3>
              <div className="space-y-3">
                {card.categorySpend.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat.category}</span>
                      <span className="font-medium text-gray-900">₹{(cat.amount / 1000).toFixed(1)}K ({cat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                Key Insights
              </h3>
              <div className="space-y-3">
                {card.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Month</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Spend</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Utilization</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rewards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.monthlyData.map((month, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{month.month}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">₹{(month.spend / 1000).toFixed(0)}K</td>
                        <td className="py-3 px-4 text-sm text-right">
                          <span className={`font-medium ${
                            month.utilization > 70 ? 'text-red-600' : 
                            month.utilization > 50 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {month.utilization.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-green-600 font-medium">₹{month.rewards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Card Intelligence</h1>
            <p className="text-gray-600">Based on 6 months of detailed analysis (Demo)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Total Cards</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{mockCards.length}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Avg Health Score</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">74</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Data Period</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">6m</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Cards</h2>
            
            {mockCards.map((card) => (
              <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{card.name}</h3>
                    <p className="text-sm text-gray-500">Limit: ₹{(card.limit / 1000).toFixed(0)}K • Fee: ₹{card.annualFee}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      card.healthScore > 75 ? 'text-green-600' : 
                      card.healthScore > 50 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {card.healthScore}
                    </div>
                    <p className="text-xs text-gray-500">Health Score</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Utilization</p>
                    <p className="text-lg font-semibold text-gray-900">{card.currentUtilization}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Month Spend</p>
                    <p className="text-lg font-semibold text-gray-900">₹{(card.lastMonthSpend / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rewards Earned</p>
                    <p className="text-lg font-semibold text-green-600">₹{card.rewardsEarned}</p>
                  </div>
                </div>

                {card.healthScore < 70 && (
                  <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">High utilization detected - consider reducing usage or increasing limit</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedCard(card)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  View Detailed Analysis →
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('welcome')}
            className="mt-8 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Start Over
          </button>

          <button
            onClick={() => setShowRecommender(true)}
            className="mt-4 w-full max-w-md mx-auto block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              Which Card Should I Use?
            </div>
          </button>
        </div>
      </div>

      {/* Recommender Modal */}
      {showRecommender && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Which Card Should I Use?</h2>
              <button 
                onClick={() => {
                  setShowRecommender(false);
                  setRecommendation(null);
                  setMerchantType('');
                  setAmount('');
                  setPriority('balance');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {!recommendation ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What are you buying?
                  </label>
                  <select
                    value={merchantType}
                    onChange={(e) => setMerchantType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    <option value="dining">Dining & Restaurants</option>
                    <option value="shopping">Shopping & Retail</option>
                    <option value="travel">Travel & Hotels</option>
                    <option value="groceries">Groceries</option>
                    <option value="online">Online Shopping</option>
                    <option value="bills">Bills & Utilities</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What's your priority?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPriority('rewards')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        priority === 'rewards'
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Award className={`w-6 h-6 mx-auto mb-2 ${
                        priority === 'rewards' ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        priority === 'rewards' ? 'text-indigo-900' : 'text-gray-600'
                      }`}>
                        Max Rewards
                      </p>
                    </button>

                    <button
                      onClick={() => setPriority('safety')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        priority === 'safety'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CheckCircle className={`w-6 h-6 mx-auto mb-2 ${
                        priority === 'safety' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        priority === 'safety' ? 'text-green-900' : 'text-gray-600'
                      }`}>
                        Safety First
                      </p>
                    </button>

                    <button
                      onClick={() => setPriority('balance')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        priority === 'balance'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${
                        priority === 'balance' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        priority === 'balance' ? 'text-purple-900' : 'text-gray-600'
                      }`}>
                        Balanced
                      </p>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {priority === 'rewards' && 'Maximize rewards based on your spending history'}
                    {priority === 'safety' && 'Keep utilization low and maintain healthy limits'}
                    {priority === 'balance' && 'Best of both worlds - good rewards with safe utilization'}
                  </p>
                </div>

                <button
                  onClick={getRecommendation}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Recommendation →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">We recommend</p>
                      <h3 className="text-2xl font-bold text-gray-900">{recommendation.card.name}</h3>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Utilization</p>
                        <p className="text-lg font-bold text-gray-900">{recommendation.card.currentUtilization}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Health Score</p>
                        <p className="text-lg font-bold text-green-600">{recommendation.card.healthScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Available Limit</p>
                        <p className="text-lg font-bold text-gray-900">₹{((recommendation.card.limit * (100 - recommendation.card.currentUtilization) / 100) / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Why this card?</p>
                    {recommendation.reasoning.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {recommendation.alternatives.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Alternative Options:</p>
                    {recommendation.alternatives.map((alt, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg mb-2">
                        <p className="font-medium text-gray-900">{alt.card.name}</p>
                        <p className="text-sm text-gray-600">{alt.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRecommendation(null);
                      setMerchantType('');
                      setAmount('');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setShowRecommender(false);
                      setRecommendation(null);
                      setMerchantType('');
                      setAmount('');
                      setPriority('balance');
                    }}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
