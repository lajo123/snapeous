import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#9ca3af', '#f59e0b', '#3b82f6', '#10b981', '#059669'];

export default function DADistributionChart({ distribution = {} }) {
  const data = [
    { range: '0-20', count: distribution['0-20'] || 0 },
    { range: '20-40', count: distribution['20-40'] || 0 },
    { range: '40-60', count: distribution['40-60'] || 0 },
    { range: '60-80', count: distribution['60-80'] || 0 },
    { range: '80-100', count: distribution['80-100'] || 0 },
  ];

  const hasData = data.some(d => d.count > 0);
  if (!hasData) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">Aucune donnee</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b6560' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} />
        <Tooltip
          formatter={(value) => [`${value} liens`, 'Backlinks']}
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #EDE4D3', fontSize: '0.875rem' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
