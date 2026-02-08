import { Upload, CreditCard, TrendingUp, Award, AlertTriangle, X, CheckCircle, Zap, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { parseCreditCardStatement } from './utils/pdfParser';
import { analyzeStatement, CardAnalysis } from './utils/cardAnalyzer';

// Types
interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

function App() {
  const [step, setStep] = useState<'welcome' | 'upload' | 'processing' | 'dashboard'>('welcome');
  const [progress, setProgress] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardAnalysis | null>(null);
  const [showRecommender, setShowRecommender] = useState(false);
  const [merchantType, setMerchantType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [priority, setPriority] = useState<'rewards' | 'safety' | 'balance'>('balance');
  const [recommendation, setRecommendation] = useState<{
    card: CardAnalysis;
    reasoning: string[];
    alternatives: Array<{ card: CardAnalysis; reason: string }>;
  } | null>(null);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<{
    card1: UploadedFile | null;
    card2: UploadedFile | null;
    card3: UploadedFile | null;
  }>({
    card1: null,
    card2: null,
    card3: null,
  });

  // Analyzed cards
  const [analyzedCards, setAnalyzedCards] = useState<CardAnalysis[]>([]);

  const handleFileSelect = (cardSlot: 'card1' | 'card2' | 'card3', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const uploadedFile: UploadedFile = {
        file,
        name: file.name,
        size: file.size,
        type: file.type
      };
      setUploadedFiles(prev => ({ ...prev, [cardSlot]: uploadedFile }));
    } else {
      alert('Please upload a valid PDF file');
    }
  };

  const removeFile = (cardSlot: 'card1' | 'card2' | 'card3') => {
    setUploadedFiles(prev => ({ ...prev, [cardSlot]: null }));
  };

  const handleAnalyze = async () => {
    const filesToAnalyze = Object.values(uploadedFiles).filter(f => f !== null) as UploadedFile[];
    
    if (filesToAnalyze.length === 0) {
      alert('Please upload at least one card statement');
      return;
    }
    
    setStep('processing');
    setProgress(10);
    
    try {
      const analyzed: CardAnalysis[] = [];
      const progressPerFile = 80 / filesToAnalyze.length;
      
      for (let i = 0; i < filesToAnalyze.length; i++) {
        const uploadedFile = filesToAnalyze[i];
        
        // Parse PDF
        const statement = await parseCreditCardStatement(uploadedFile.file);
        
        // Analyze statement
        const analysis = analyzeStatement(statement, `card-${i + 1}`);
        analyzed.push(analysis);
        
        // Update progress
        setProgress(10 + ((i + 1) * progressPerFile));
      }
      
      // Set analyzed cards
      setAnalyzedCards(analyzed);
      setProgress(100);
      
      setTimeout(() => {
        setStep('dashboard');
      }, 500);
      
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Error analyzing PDFs: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your PDF format.`);
      setStep('upload');
      setProgress(0);
    }
  };

  const getRecommendation = () => {
    if (!merchantType || !amount) {
      alert('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    
    const availableCards = analyzedCards.filter((card: CardAnalysis) => {
      const newUtilization = ((card.limit * card.currentUtilization / 100) + amountNum) / card.limit * 100;
      return newUtilization < 80;
    });

    if (availableCards.length === 0) {
      alert('This amount would push all cards above safe utilization limits!');
      return;
    }

    let recommendedCard: CardAnalysis;
    let reasoning: string[] = [];
    let alternatives: Array<{ card: CardAnalysis; reason: string }> = [];

    const categoryMatch = availableCards.map((card: CardAnalysis) => {
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
      const scored = availableCards.map((card: CardAnalysis) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                <p className="text-gray-600 text-sm">Upload PDFs and see which cards create value</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-gray-800">Smart Recommendations</h3>
                <p className="text-gray-600 text-sm">AI-powered advice on which card to use</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-800">Privacy First</h3>
                <p className="text-gray-600 text-sm">All processing happens in your browser</p>
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
            Upload credit card statements (PDF) from the last 12+ months
          </p>
        </div>
      </div>
    );
  }

  // Upload Screen
  if (step === 'upload') {
    const uploadedCount = Object.values(uploadedFiles).filter(f => f !== null).length;
    const canAnalyze = uploadedCount > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <button 
              onClick={() => setStep('welcome')}
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
            >
              ← Back
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Your Card Statements</h2>
              <p className="text-gray-600">Upload PDF statements for up to 3 cards • 12+ months recommended</p>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  uploadedCount >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {uploadedCount >= 1 ? '✓' : '1'}
                </div>
                <div className={`h-1 w-16 ${uploadedCount >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  uploadedCount >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {uploadedCount >= 2 ? '✓' : '2'}
                </div>
                <div className={`h-1 w-16 ${uploadedCount >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  uploadedCount >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {uploadedCount >= 3 ? '✓' : '3'}
                </div>
              </div>
              <p className="text-center text-sm text-gray-600">
                {uploadedCount === 0 && 'Upload at least 1 card to begin analysis'}
                {uploadedCount === 1 && '1 card uploaded • Add more for better insights'}
                {uploadedCount === 2 && '2 cards uploaded • Great! Add one more?'}
                {uploadedCount === 3 && 'All 3 card slots filled • Ready to analyze!'}
              </p>
            </div>

            {/* Card Upload Slots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(['card1', 'card2', 'card3'] as const).map((slot, index) => (
                <div key={slot} className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileSelect(slot, e)}
                    className="hidden"
                    id={`file-${slot}`}
                  />
                  <label
                    htmlFor={uploadedFiles[slot] ? undefined : `file-${slot}`}
                    className={`block border-2 border-dashed rounded-xl p-6 transition-all ${
                      uploadedFiles[slot] 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-5 h-5 ${
                          index === 0 ? 'text-indigo-600' :
                          index === 1 ? 'text-purple-600' : 'text-green-600'
                        }`} />
                        <span className="font-semibold text-gray-700">Card {index + 1}</span>
                      </div>
                      {uploadedFiles[slot] && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile(slot);
                          }}
                          className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>

                    {!uploadedFiles[slot] ? (
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Click to upload PDF</p>
                        <span className={`inline-block text-white px-4 py-2 rounded-lg text-xs font-medium ${
                          index === 0 ? 'bg-indigo-600' :
                          index === 1 ? 'bg-purple-600' : 'bg-green-600'
                        }`}>
                          Choose File
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-800 mb-1 truncate">{uploadedFiles[slot].name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadedFiles[slot].size)}</p>
                        <div className="mt-2 flex items-center justify-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Ready</span>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all shadow-lg ${
                canAnalyze
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canAnalyze ? `Analyze ${uploadedCount} Card${uploadedCount > 1 ? 's' : ''} →` : 'Upload at least 1 card to continue'}
            </button>

            {/* Instructions */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-xl">📋</span>
                How to get your statements:
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Log into your bank's website/app</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Go to Credit Card → Statements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Download last 12-36 months as PDF</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Upload each card's statement in a separate slot above</span>
                </li>
              </ul>
            </div>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyzing Your Statements...</h2>
          <p className="text-gray-600 mb-6">Extracting transactions and calculating metrics</p>
          
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
              <span className="text-sm">Parsing PDF statements...</span>
            </div>
            <div className={`flex items-center gap-2 ${progress > 60 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="w-5 h-5 bg-current rounded-full flex items-center justify-center">
                {progress > 60 && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">Categorizing transactions...</span>
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
    const avgUtilization = card.monthlyData.reduce((sum: number, m) => sum + m.utilization, 0) / card.monthlyData.length;
    const totalRewards = card.monthlyData.reduce((sum: number, m) => sum + m.rewards, 0);
    const totalSpend = card.monthlyData.reduce((sum: number, m) => sum + m.spend, 0);
    const effectiveRate = totalSpend > 0 ? (totalRewards / totalSpend) * 100 : 0;

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
                      <span className="font-medium text-gray-900">₹{(cat.amount / 1000).toFixed(1)}K ({cat.percentage.toFixed(1)}%)</span>
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
                {card.insights.map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
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
            <p className="text-gray-600">
              Analysis from {analyzedCards.length} card{analyzedCards.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Total Cards</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{analyzedCards.length}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Avg Health Score</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {analyzedCards.length > 0 
                  ? Math.round(analyzedCards.reduce((sum: number, c: CardAnalysis) => sum + c.healthScore, 0) / analyzedCards.length)
                  : 0
                }
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Total Spend</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ₹{(analyzedCards.reduce((sum: number, c: CardAnalysis) => sum + c.lastMonthSpend, 0) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Cards</h2>
            
            {analyzedCards.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                <p className="text-gray-500 text-lg mb-4">No cards analyzed yet</p>
                <button
                  onClick={() => {
                    setStep('upload');
                    setUploadedFiles({ card1: null, card2: null, card3: null });
                  }}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Upload Statements
                </button>
              </div>
            ) : (
              analyzedCards.map((card: CardAnalysis) => (
                <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{card.name}</h3>
                      <p className="text-sm text-gray-500">Limit: ₹{(card.limit / 1000).toFixed(0)}K</p>
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
              ))
            )}
          </div>

          <button
            onClick={() => {
              setStep('welcome');
              setUploadedFiles({ card1: null, card2: null, card3: null });
              setAnalyzedCards([]);
            }}
            className="mt-8 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Start Over
          </button>

          {analyzedCards.length > 0 && (
            <button
              onClick={() => setShowRecommender(true)}
              className="mt-4 w-full max-w-md mx-auto block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Which Card Should I Use?
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Recommender Modal */}
      {showRecommender && analyzedCards.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
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
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <strong>How it works:</strong> Based on your actual spending patterns, 
                    we recommend the best card for this specific purchase.
                  </p>
                </div>

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
                      <option value="dining">🍽️ Dining & Restaurants</option>
                      <option value="shopping">🛍️ Shopping & Retail</option>
                      <option value="travel">✈️ Travel & Hotels</option>
                      <option value="groceries">🛒 Groceries</option>
                      <option value="online">💻 Online Shopping</option>
                      <option value="bills">💡 Bills & Utilities</option>
                      <option value="others">📦 Others</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 We analyze your actual spending history in each category
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-gray-400 font-semibold">₹</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount (e.g., 5000)"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      We'll check your current limits and utilization
                    </p>
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
                      {priority === 'rewards' && 'Card with highest historical spend in this category'}
                      {priority === 'safety' && 'Card with lowest current utilization'}
                      {priority === 'balance' && 'Best combination of rewards history and safe utilization'}
                    </p>
                  </div>

                  <button
                    onClick={getRecommendation}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Get Recommendation →
                  </button>
                </div>
              </>
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
                    {recommendation.reasoning.map((reason: string, idx: number) => (
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
                    {recommendation.alternatives.map((alt, idx: number) => (
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
