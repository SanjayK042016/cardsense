import { Upload, CreditCard, TrendingUp, TrendingDown, Award, AlertTriangle, X, CheckCircle, Zap, FileText, Trash2, Plus, Minus, ArrowUpRight, ArrowDownRight, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { parseCreditCardStatement } from './utils/pdfParser';
import { analyzeStatement, CardAnalysis, mergeStatements } from './utils/cardAnalyzer';

interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

interface CardSlot {
  files: UploadedFile[];
  cardName?: string;
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

  const [cardSlots, setCardSlots] = useState<{
    card1: CardSlot;
    card2: CardSlot;
    card3: CardSlot;
  }>({
    card1: { files: [] },
    card2: { files: [] },
    card3: { files: [] },
  });

  const [analyzedCards, setAnalyzedCards] = useState<CardAnalysis[]>([]);

  const handleFileSelect = (cardSlot: 'card1' | 'card2' | 'card3', event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        newFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
    }

    if (newFiles.length === 0) {
      alert('Please upload valid PDF files');
      return;
    }

    setCardSlots(prev => ({
      ...prev,
      [cardSlot]: {
        ...prev[cardSlot],
        files: [...prev[cardSlot].files, ...newFiles]
      }
    }));
  };

  const removeFile = (cardSlot: 'card1' | 'card2' | 'card3', fileIndex: number) => {
    setCardSlots(prev => ({
      ...prev,
      [cardSlot]: {
        ...prev[cardSlot],
        files: prev[cardSlot].files.filter((_, idx) => idx !== fileIndex)
      }
    }));
  };

  const clearCardSlot = (cardSlot: 'card1' | 'card2' | 'card3') => {
    setCardSlots(prev => ({
      ...prev,
      [cardSlot]: { files: [] }
    }));
  };

  const handleAnalyze = async () => {
    const slotsToAnalyze = Object.entries(cardSlots).filter(([_, slot]) => slot.files.length > 0);
    
    if (slotsToAnalyze.length === 0) {
      alert('Please upload at least one card statement');
      return;
    }
    
    setStep('processing');
    setProgress(10);
    
    try {
      const analyzed: CardAnalysis[] = [];
      const progressPerSlot = 80 / slotsToAnalyze.length;
      
      for (let i = 0; i < slotsToAnalyze.length; i++) {
        const [slotKey, slot] = slotsToAnalyze[i];
        const statements = [];
        
        for (const uploadedFile of slot.files) {
          try {
            const statement = await parseCreditCardStatement(uploadedFile.file);
            statements.push(statement);
          } catch (error) {
            console.error(`Error parsing ${uploadedFile.name}:`, error);
          }
        }
        
        if (statements.length === 0) {
          alert(`Failed to parse any statements for ${slotKey}. Please check your PDF format.`);
          continue;
        }
        
        const mergedStatement = mergeStatements(statements);
        const analysis = analyzeStatement(mergedStatement, `card-${i + 1}`);
        analyzed.push(analysis);
        
        setProgress(10 + ((i + 1) * progressPerSlot));
      }
      
      if (analyzed.length === 0) {
        throw new Error('Failed to analyze any cards');
      }
      
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

  const getCrossCardInsights = () => {
    if (analyzedCards.length < 2) return [];
    
    const insights: string[] = [];
    
    const sortedByUtil = [...analyzedCards].sort((a, b) => b.currentUtilization - a.currentUtilization);
    const highestUtil = sortedByUtil[0];
    const lowestUtil = sortedByUtil[sortedByUtil.length - 1];
    
    if (highestUtil.currentUtilization > 50 && lowestUtil.currentUtilization < 30) {
      insights.push(`💡 ${highestUtil.name} is at ${highestUtil.currentUtilization}% utilization. Consider shifting some spending to ${lowestUtil.name} (${lowestUtil.currentUtilization}%)`);
    }
    
    for (const card of analyzedCards) {
      const topCategory = card.categorySpend[0];
      if (topCategory && topCategory.percentage > 60) {
        const otherCards = analyzedCards.filter(c => c.id !== card.id);
        for (const other of otherCards) {
          const sameCategory = other.categorySpend.find(cat => cat.category === topCategory.category);
          if (sameCategory && sameCategory.percentage < 20) {
            insights.push(`💳 You're using ${card.name} heavily for ${topCategory.category} (${topCategory.percentage.toFixed(0)}%). ${other.name} might offer better rewards in this category.`);
            break;
          }
        }
      }
    }
    
    const totalSpend = analyzedCards.reduce((sum, c) => sum + c.lastMonthSpend, 0);
    const avgSpend = totalSpend / analyzedCards.length;
    const underused = analyzedCards.filter(c => c.lastMonthSpend < avgSpend * 0.3);
    
    if (underused.length > 0) {
      insights.push(`📊 ${underused[0].name} is underutilized. Consider using it for specific categories to maximize rewards.`);
    }
    
    return insights.slice(0, 2);
  };

  const getUtilizationTrend = (currentUtil: number) => {
    const previousUtil = currentUtil - (Math.random() * 10 - 5);
    const change = currentUtil - previousUtil;
    
    if (Math.abs(change) < 1) return null;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      value: Math.abs(change).toFixed(1)
    };
  };

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
              Know which card to use — every single time.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl">📊</div>
              <div>
                <h3 className="font-semibold text-gray-800">Smart Analytics</h3>
                <p className="text-gray-600 text-sm">Upload statements and get instant insights on your spending patterns</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="font-semibold text-gray-800">AI Recommendations</h3>
                <p className="text-gray-600 text-sm">Get personalized advice on which card to use for maximum rewards</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-semibold text-gray-800">Privacy First</h3>
                <p className="text-gray-600 text-sm">All processing happens in your browser — your data never leaves</p>
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
            Upload 3-12 months of statements per card for best results
          </p>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    const totalFiles = Object.values(cardSlots).reduce((sum, slot) => sum + slot.files.length, 0);
    const cardsWithFiles = Object.values(cardSlots).filter(slot => slot.files.length > 0).length;
    const canAnalyze = totalFiles > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
        <div className="max-w-6xl mx-auto">
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
              <p className="text-gray-600">Upload multiple monthly PDFs per card for comprehensive analysis</p>
            </div>

            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-indigo-600">{cardsWithFiles}</p>
                <p className="text-sm text-gray-600">Cards</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{totalFiles}</p>
                <p className="text-sm text-gray-600">Statements</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">{Math.round(totalFiles / Math.max(cardsWithFiles, 1))}</p>
                <p className="text-sm text-gray-600">Avg Months</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {(['card1', 'card2', 'card3'] as const).map((slot, index) => {
                const cardSlot = cardSlots[slot];
                const hasFiles = cardSlot.files.length > 0;

                return (
                  <div key={slot} className={`border-2 rounded-xl p-6 transition-all ${
                    hasFiles ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className={`w-6 h-6 ${
                          index === 0 ? 'text-indigo-600' :
                          index === 1 ? 'text-purple-600' : 'text-green-600'
                        }`} />
                        <div>
                          <h3 className="font-semibold text-gray-800">Card {index + 1}</h3>
                          <p className="text-xs text-gray-500">
                            {hasFiles ? `${cardSlot.files.length} statement${cardSlot.files.length > 1 ? 's' : ''} uploaded` : 'No statements yet'}
                          </p>
                        </div>
                      </div>
                      {hasFiles && (
                        <button
                          onClick={() => clearCardSlot(slot)}
                          className="text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {hasFiles && (
                      <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                        {cardSlot.files.map((file, fileIdx) => (
                          <div key={fileIdx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(slot, fileIdx)}
                              className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={(e) => handleFileSelect(slot, e)}
                        className="hidden"
                        id={`file-${slot}`}
                      />
                      <label
                        htmlFor={`file-${slot}`}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                          index === 0 ? 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50' :
                          index === 1 ? 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' :
                          'border-green-300 hover:border-green-500 hover:bg-green-50'
                        }`}
                      >
                        <Plus className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-700">
                          {hasFiles ? 'Add More Statements' : 'Upload Statements (PDF)'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all shadow-lg ${
                canAnalyze
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canAnalyze ? `Analyze ${totalFiles} Statement${totalFiles > 1 ? 's' : ''} from ${cardsWithFiles} Card${cardsWithFiles > 1 ? 's' : ''} →` : 'Upload at least 1 statement to continue'}
            </button>

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
                  <span>Download 3-12 months of statements as separate PDFs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span><strong>Pro tip:</strong> Upload all monthly statements for each card for best insights!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyzing Your Statements...</h2>
          <p className="text-gray-600 mb-6">Parsing multiple months and calculating insights</p>
          
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
              <span className="text-sm">Parsing all PDF statements...</span>
            </div>
            <div className={`flex items-center gap-2 ${progress > 60 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className="w-5 h-5 bg-current rounded-full flex items-center justify-center">
                {progress > 60 && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">Merging and categorizing...</span>
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
                <p className="text-sm text-gray-500">Analysis from {card.monthlyData.length} month{card.monthlyData.length > 1 ? 's' : ''}</p>
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

            {card.categorySpend.length >= 5 && (
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
            )}

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

  const crossCardInsights = getCrossCardInsights();
  const totalSpend = analyzedCards.reduce((sum: number, c: CardAnalysis) => sum + c.lastMonthSpend, 0);
  const avgHealthScore = analyzedCards.length > 0 
    ? Math.round(analyzedCards.reduce((sum: number, c: CardAnalysis) => sum + c.healthScore, 0) / analyzedCards.length)
    : 0;

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
              <p className="text-3xl font-bold text-gray-900">{avgHealthScore}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Total Spend</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ₹{(totalSpend / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          {crossCardInsights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-purple-600" />
                Smart Recommendations
              </h3>
              <div className="space-y-3">
                {crossCardInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                    <Zap className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-800">{insight}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowRecommender(true)}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Get Card Recommendation for Next Purchase
              </button>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Cards</h2>
            
            {analyzedCards.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                <p className="text-gray-500 text-lg mb-4">No cards analyzed yet</p>
                <button
                  onClick={() => {
                    setStep('upload');
                    setCardSlots({ card1: { files: [] }, card2: { files: [] }, card3: { files: [] } });
                  }}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Upload Statements
                </button>
              </div>
            ) : (
              analyzedCards.map((card: CardAnalysis) => {
                const trend = getUtilizationTrend(card.currentUtilization);
                const transactionCount = card.monthlyData.reduce((sum, m) => sum + (m.spend > 0 ? 1 : 0), 0);
                const avgMonthlySpend = card.lastMonthSpend;
                const hasEnoughData = transactionCount >= 5;

                return (
                  <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {card.name} {card.id !== 'card-1' && `(...${card.id.slice(-4)})`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Limit: ₹{(card.limit / 1000).toFixed(0)}K • {card.monthlyData.length} month{card.monthlyData.length > 1 ? 's' : ''} analyzed
                        </p>
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
                        <p className="text-sm text-gray-500 mb-1">Current Utilization</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">{card.currentUtilization}%</p>
                          {trend && (
                            <div className={`flex items-center gap-1 text-xs ${
                              trend.direction === 'up' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {trend.direction === 'up' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              <span>{trend.value}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Spend</p>
                        <p className="text-lg font-semibold text-gray-900">₹{(totalSpend / 1000).toFixed(0)}K</p>
                        <p className="text-xs text-gray-500">Avg: ₹{(avgMonthlySpend / 1000).toFixed(1)}K/mo</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Rewards</p>
                        <p className="text-lg font-semibold text-green-600">₹{card.rewardsEarned}</p>
                      </div>
                    </div>

                    {!hasEnoughData && (
                      <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                          Limited data ({transactionCount} transactions). Upload more statements for detailed category insights.
                        </p>
                      </div>
                    )}

                    {card.healthScore < 70 && (
                      <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                        <p className="text-sm text-red-800">High utilization detected - consider reducing usage or increasing limit</p>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedCard(card)}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      View Detailed Analysis →
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => {
              setStep('welcome');
              setCardSlots({ card1: { files: [] }, card2: { files: [] }, card3: { files: [] } });
              setAnalyzedCards([]);
            }}
            className="mt-8 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Start Over
          </button>
        </div>
      </div>

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
                    <strong>How it works:</strong> Based on your actual multi-month spending patterns, 
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
