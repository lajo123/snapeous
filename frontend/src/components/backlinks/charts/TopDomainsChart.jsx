import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function TopDomainsChart({ domains = [] }) {
  const { t } = useTranslation('backlinks');
  if (domains.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">{t('charts.noData')}</div>;

  const data = domains.slice(0, 10).map(d => ({
    domain: d.domain?.length > 25 ? d.domain.slice(0, 22) + '...' : d.domain,
    count: d.count,
    avg_dr: d.avg_dr,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b6560' }} />
        <YAxis
          type="category"
          dataKey="domain"
          width={150}
          tick={{ fontSize: 11, fill: '#6b6560' }}
        />
        <Tooltip
          formatter={(value, name) => [value, name === 'count' ? t('charts.backlinks') : name]}
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #E8DCCB', fontSize: '0.875rem' }}
        />
        <Bar dataKey="count" fill="#C9785D" radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
