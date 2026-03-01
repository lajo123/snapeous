import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function GainedLostChart({ timeline = [] }) {
  if (timeline.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-gray-400">Aucun historique disponible</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={timeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b6560' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6b6560' }} />
        <Tooltip
          contentStyle={{ borderRadius: '0.75rem', border: '1px solid #EDE4D3', fontSize: '0.875rem' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-[#6b6560]">{value}</span>}
        />
        <Bar dataKey="gained" name="Gagnes" fill="#059669" radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="lost" name="Perdus" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
