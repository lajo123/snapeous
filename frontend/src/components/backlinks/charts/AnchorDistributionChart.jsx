import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';

const COLORS = ['#C9785D', '#e09070', '#edb097', '#1E3A5F', '#3d6690', '#5c84af', '#B09E7E', '#C9B899', '#9a5641', '#7d4636', '#6b7280'];

export default function AnchorDistributionChart({ anchors = [] }) {
  const { t } = useTranslation('backlinks');

  // Top 10 + "Others" bucket
  const top10 = anchors.slice(0, 10);
  const rest = anchors.slice(10);
  const othersCount = rest.reduce((sum, a) => sum + a.count, 0);

  const data = top10.map(a => ({
    name: a.text?.length > 20 ? a.text.slice(0, 17) + '...' : a.text,
    value: a.count,
  }));

  if (othersCount > 0) {
    data.push({ name: t('charts.others'), value: othersCount });
  }

  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">{t('charts.noData')}</div>;

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
          formatter={(value, name) => [`${value} ${t('charts.links')}`, name]}
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #E8DCCB', fontSize: '0.875rem' }}
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
