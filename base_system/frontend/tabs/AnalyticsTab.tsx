import React, { useState, useMemo, useEffect } from 'react';
import { getTransactions } from '../services/storageService.ts';
import { Transaction } from '../types.ts';
import { CATEGORY_COLORS } from '../constants.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Load transactions on mount and when tab becomes active
    setTransactions(getTransactions());
  }, []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  // Filter transactions for the selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  // Calculate Summary
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [monthlyTransactions]);

  // Prepare data for Pie Chart (Expenses by Category)
  const pieData = useMemo(() => {
    const expenses = monthlyTransactions.filter(t => t.type === 'expense');
    const grouped: Record<string, number> = {};
    expenses.forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by amount descending
  }, [monthlyTransactions]);

  // Prepare data for Bar Chart (Last 6 months trend)
  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const monthStr = `${d.getMonth() + 1}月`;
      
      let income = 0;
      let expense = 0;
      
      transactions.forEach(t => {
        if (!t.date) return;
        const tDate = new Date(t.date);
        if (tDate.getFullYear() === d.getFullYear() && tDate.getMonth() === d.getMonth()) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });
      
      data.push({ name: monthStr, 収入: income, 支出: expense });
    }
    return data;
  }, [transactions, currentYear, currentMonth]);

  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <button onClick={handlePrevMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {currentYear}年 {currentMonth + 1}月
        </h2>
        <button onClick={handleNextMonth} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">収入</p>
          <p className="text-sm sm:text-lg font-bold text-green-600">{formatCurrency(summary.income)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">支出</p>
          <p className="text-sm sm:text-lg font-bold text-red-600">{formatCurrency(summary.expense)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-1">収支</p>
          <p className={`text-sm sm:text-lg font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Category Pie Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-4 text-gray-800">
          <PieChartIcon size={18} className="mr-2 text-purple-500" />
          <h3 className="font-semibold">支出内訳</h3>
        </div>
        
        {pieData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            データがありません
          </div>
        )}
      </div>

      {/* Trend Bar Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center mb-4 text-gray-800">
          <BarChart3 size={18} className="mr-2 text-blue-500" />
          <h3 className="font-semibold">推移 (過去6ヶ月)</h3>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `¥${val/1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: '#f8fafc'}} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="支出" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="収入" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
