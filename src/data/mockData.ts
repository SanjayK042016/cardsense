export interface MonthlyData {
  month: string;
  spend: number;
  utilization: number;
  rewards: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface CardData {
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

export const mockCardsDetailed: CardData[] = [
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
      { category: 'Dining', amount: 15000, percentage: 30.6 },
      { category: 'Shopping', amount: 12000, percentage: 24.5 },
      { category: 'Travel', amount: 10000, percentage: 20.4 },
      { category: 'Groceries', amount: 8000, percentage: 16.3 },
      { category: 'Others', amount: 4000, percentage: 8.2 },
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
      { category: 'Online Shopping', amount: 45000, percentage: 44.6 },
      { category: 'Bills & Utilities', amount: 25000, percentage: 24.8 },
      { category: 'Groceries', amount: 18000, percentage: 17.8 },
      { category: 'Dining', amount: 8000, percentage: 7.9 },
      { category: 'Others', amount: 5000, percentage: 5.0 },
    ],
    insights: [
      'High utilization in Oct (83%) - consider spreading spend',
      'Excellent 5% rewards on online shopping',
      'Utilization trend showing upward pattern - monitor closely',
      'Annual fee recovered in first month',
    ]
  }
];
