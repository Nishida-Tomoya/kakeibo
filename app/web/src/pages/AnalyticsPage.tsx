import { BarChart3, PieChart as PieIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_COLORS } from '../../../shared/categories.ts';
import { api, type Summary } from '../api.ts';
import { ErrorMessage, MonthSelector, Spinner } from '../components/common.tsx';
import { thisMonth, yen } from '../utils.ts';

const tooltipYen = (value: unknown) => yen(Number(value));

export function AnalyticsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    api.summary(month).then(setSummary).catch((err) => setError(err.message));
  }, [month]);

  const trendData = summary?.trend.map((t) => ({ name: `${Number(t.month.slice(5))}月`, 収入: t.income, 支出: t.expense }));

  return (
    <div className="space-y-4">
      <MonthSelector month={month} onChange={setMonth} />
      <ErrorMessage message={error} />

      {!summary ? (
        <div className="flex justify-center py-10 text-gray-400"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['収入', summary.income, 'text-green-600'],
              ['支出', summary.expense, 'text-red-600'],
              ['収支', summary.balance, summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="card p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm font-bold sm:text-lg ${color}`}>{yen(value as number)}</p>
              </div>
            ))}
          </div>

          <section className="card p-4">
            <h3 className="mb-3 flex items-center font-semibold"><PieIcon size={18} className="mr-2 text-purple-500" />支出の内訳</h3>
            {summary.expenseByCategory.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">データがありません</p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.expenseByCategory} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {summary.expenseByCategory.map((e) => <Cell key={e.category} fill={CATEGORY_COLORS[e.category] ?? '#cbd5e1'} />)}
                      </Pie>
                      <Tooltip formatter={tooltipYen} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 divide-y divide-gray-100 text-sm">
                  {summary.expenseByCategory.map((e) => (
                    <li key={e.category} className="flex items-center justify-between py-2">
                      <span className="flex items-center">
                        <span className="mr-2 h-3 w-3 rounded-full" style={{ background: CATEGORY_COLORS[e.category] ?? '#cbd5e1' }} />
                        {e.category}
                      </span>
                      <span>
                        <span className="font-medium">{yen(e.amount)}</span>
                        <span className="ml-2 inline-block w-10 text-right text-xs text-gray-400">{Math.round((e.amount / summary.expense) * 100)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card p-4">
            <h3 className="mb-3 flex items-center font-semibold"><BarChart3 size={18} className="mr-2 text-blue-500" />推移（過去6か月）</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v: number) => `${v / 10000}万`} />
                  <Tooltip formatter={tooltipYen} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="支出" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="収入" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
