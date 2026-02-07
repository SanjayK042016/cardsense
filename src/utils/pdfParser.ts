import { ParsedStatement, Transaction } from './pdfParser';

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyData {
  month: string;
  spend: number;
  utilization: number;
  rewards: number;
}

export interface CardAnalysis {
  id: string;
  name: string;
  limit: number;
  annualFee: number;
  currentUtilization: number;
  lastMonthSpend: number;
  rewardsEarned: number;
  healthScore: number;
  categorySpend: CategorySpend[];
  monthlyData: MonthlyData[];
  insights: string[];
}

export function analyzeStatement(statement: ParsedStatement, cardId: string): CardAnalysis {
  const { transactions, totalSpend, creditLimit } = statement;
  
  // Calculate category spending
  const categoryTotals: Record<string, number> = {};
  transactions.forEach(t => {
    const category = t.category || 'Others';
    categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
  });
  
  const categorySpend: CategorySpend[] = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalSpend) * 100,
      color: getCategoryColor(category)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  // Calculate utilization
  const effectiveLimit = creditLimit || 100000;
  const currentUtilization = (totalSpend / effectiveLimit) * 100;
  
  // Calculate health score
  const healthScore = calculateHealthScore(currentUtilization, transactions);
  
  // Generate insights
  const insights = generateInsights(categorySpend, currentUtilization, transactions);
  
  // Calculate rewards (1% for now)
  const rewardsEarned = Math.floor(totalSpend * 0.01);
  
  // Generate mock monthly data (we only have current month from PDF)
  const monthlyData: MonthlyData[] = [
    { month: 'Jan', spend: totalSpend, utilization: currentUtilization, rewards: rewardsEarned }
  ];
  
  return {
    id: cardId,
    name: statement.cardName,
    limit: effectiveLimit,
    annualFee: 0, // Can't extract from statement easily
    currentUtilization: parseFloat(currentUtilization.toFixed(1)),
    lastMonthSpend: totalSpend,
    rewardsEarned,
    healthScore,
    categorySpend,
    monthlyData,
    insights
  };
}

function calculateHealthScore(utilization: number, transactions: Transaction[]): number {
  let score = 100;
  
  // Penalize high utilization
  if (utilization > 80) score -= 30;
  else if (utilization > 60) score -= 20;
  else if (utilization > 40) score -= 10;
  
  // Penalize irregular spending
  if (transactions.length > 0) {
    const avgTransaction = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
    const largeTransactions = transactions.filter(t => t.amount > avgTransaction * 3).length;
    if (largeTransactions > 5) score -= 10;
  }
  
  // Reward consistent usage
  if (transactions.length > 20 && transactions.length < 100) score += 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateInsights(
  categorySpend: CategorySpend[], 
  utilization: number, 
  transactions: Transaction[]
): string[] {
  const insights: string[] = [];
  
  if (utilization > 70) {
    insights.push(`High utilization at ${utilization.toFixed(1)}% - consider paying down balance`);
  } else if (utilization < 30) {
    insights.push(`Healthy utilization at ${utilization.toFixed(1)}% - plenty of credit buffer`);
  }
  
  if (categorySpend.length > 0) {
    const topCategory = categorySpend[0];
    insights.push(`Highest spending in ${topCategory.category} (${topCategory.percentage.toFixed(1)}%)`);
  }
  
  if (transactions.length > 50) {
    insights.push(`Very active card with ${transactions.length} transactions`);
  } else if (transactions.length < 10) {
    insights.push(`Low usage with ${transactions.length} transactions`);
  }
  
  const avgTransaction = transactions.length > 0 
    ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
    : 0;
  if (avgTransaction > 5000) {
    insights.push(`High-value transactions averaging ₹${avgTransaction.toFixed(0)}`);
  }
  
  return insights.slice(0, 4);
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Dining': '#4F46E5',
    'Shopping': '#7C3AED',
    'Travel': '#EC4899',
    'Groceries': '#F59E0B',
    'Bills': '#10B981',
    'Online Shopping': '#3B82F6',
    'Others': '#6B7280'
  };
  return colors[category] || '#6B7280';
}
