import { Upload, CreditCard, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

// Mock data for demo
const mockCards = [
  {
    id: 'card-1',
    name: 'HDFC Regalia',
    limit: 200000,
    annualFee: 2500,
    currentUtilization: 24.5,
    lastMonthSpend: 49000,
    rewardsEarned: 980,
    healthScore: 85
  },
  {
    id: 'card-2',
    name: 'SBI SimplyCLICK',
    limit: 150000,
    annualFee: 499,
    currentUtilization: 67.3,
    lastMonthSpend: 101000,
    rewardsEarned: 5050,
    healthScore: 62
  }
];

function App() {
  const [step, setStep] = useState<'welcome' | 'upload' | 'processing' | 'dashboard'>('welcome');
  const [progress, setProgress] = useState(0);

  // Simulate processing
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

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Card Intelligence</h1>
          <p className="text-gray-600">Based on 12 months of data (Demo)</p>
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
            <p className="text-3xl font-bold text-gray-900">12m</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Cards</h2>
          
          {mockCards.map((card) => (
            <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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

              <div className="grid grid-cols-3 gap-4">
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
                <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">High utilization detected - consider reducing usage or increasing limit</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep('welcome')}
          className="mt-8 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Start Over
        </button>
      </div>
    </div>
  );
}

export default App;
