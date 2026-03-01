import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#059669', '#10b981', '#34d399', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6b7280', '#9ca3af'];

export default function AnchorDistributionChart({ anchors = [] }) {
  // Top 10 + "Autres" bucket
  const top10 = anchors.slice(0, 10);
  const rest = anchors.slice(10);
  const othersCount = rest.reduce((sum, a) => sum + a.count, 0);

  const data = top10.map(a => ({
    name: a.text?.length > 20 ? a.text.slice(0, 17) + '...' : a.text,
    value: a.count,
  }));

  if (othersCount > 0) {
    data.push({ name: 'Autres', value: othersCount });
  }

  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">Aucune donnee</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
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
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-[#6b6560]">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
