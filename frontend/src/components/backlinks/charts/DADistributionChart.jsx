import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

const COLORS = ['#9ca3af', '#C9B899', '#3d6690', '#e09070', '#C9785D'];

export default function DADistributionChart({ distribution = {} }) {
  const { t } = useTranslation('backlinks');
  const data = [
    { range: '0-20', count: distribution['0-20'] || 0 },
    { range: '20-40', count: distribution['20-40'] || 0 },
    { range: '40-60', count: distribution['40-60'] || 0 },
    { range: '60-80', count: distribution['60-80'] || 0 },
    { range: '80-100', count: distribution['80-100'] || 0 },
  ];

  const hasData = data.some(d => d.count > 0);
  if (!hasData) return <div className="h-64 flex items-center justify-center text-sm text-ink-300">{t('charts.noData')}</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b6560' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} />
        <Tooltip
          formatter={(value) => [`${value} ${t('charts.links')}`, t('charts.backlinks')]}
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #E8DCCB', fontSize: '0.875rem' }}
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
