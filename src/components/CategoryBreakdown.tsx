import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CategorySpend } from '../data/mockData';

interface CategoryBreakdownProps {
  data: CategorySpend[];
  cardName: string;
}

const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'];

export default function CategoryBreakdown({ data, cardName }: CategoryBreakdownProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Spending by Category - {cardName}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => `₹${(value / 1000).toFixed(1)}K`}
          />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((cat, idx) => (
          <div key={cat.category} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            ></div>
            <span className="text-gray-700">{cat.category}: {cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
