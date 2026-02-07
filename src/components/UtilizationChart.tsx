import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyData } from '../data/mockData';

interface UtilizationChartProps {
  data: MonthlyData[];
  cardName: string;
}

export default function UtilizationChart({ data, cardName }: UtilizationChartProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Utilization Trend - {cardName}
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => `${value.toFixed(1)}%`}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="utilization" 
            stroke="#4F46E5" 
            strokeWidth={2}
            name="Utilization %"
            dot={{ fill: '#4F46E5', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
        <div className="w-3 h-3 bg-red-100 border-2 border-red-500 rounded"></div>
        <span>Target: Keep below 70% utilization</span>
      </div>
    </div>
  );
}
