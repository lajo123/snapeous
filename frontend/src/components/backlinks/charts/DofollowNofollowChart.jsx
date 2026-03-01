import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#059669', '#9ca3af'];

export default function DofollowNofollowChart({ dofollow = 0, nofollow = 0 }) {
  const data = [
    { name: 'Dofollow', value: dofollow },
    { name: 'Nofollow', value: nofollow },
  ].filter(d => d.value > 0);

  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">Aucune donnee</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} liens`, name]}
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #EDE4D3', fontSize: '0.875rem' }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-[#6b6560]">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
