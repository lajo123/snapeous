import { Link2, Activity, Globe, Shield } from 'lucide-react';

export default function BacklinkKPICards({ stats }) {
  if (!stats) return null;

  const cards = [
    {
      label: 'Volume Global',
      icon: Link2,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      primary: stats.total_backlinks,
      primaryLabel: 'liens',
      secondary: `${stats.unique_domains} domaines uniques`,
    },
    {
      label: 'Sante des Liens',
      icon: Activity,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      primary: `${stats.active_percentage}%`,
      primaryLabel: 'actifs',
      healthBar: {
        ok: stats.http_200_count,
        redirect: stats.http_301_count,
        lost: stats.http_404_count,
        total: stats.total_backlinks,
      },
    },
    {
      label: 'Indexation',
      icon: Globe,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      primary: `${stats.indexed_percentage}%`,
      primaryLabel: 'indexes',
      secondary: `${stats.indexed_count} indexes / ${stats.not_checked_count} non verifies`,
    },
    {
      label: "Profil d'Autorite",
      icon: Shield,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      primary: stats.avg_domain_rank != null ? Math.round(stats.avg_domain_rank) : '-',
      primaryLabel: 'DA moyen',
      dofollowBar: {
        dofollow: stats.dofollow_percentage,
        nofollow: 100 - stats.dofollow_percentage,
      },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#6b6560] uppercase tracking-wide">{card.label}</span>
            <div className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tracking-tight text-gray-900">{card.primary}</span>
            <span className="text-sm text-[#6b6560]">{card.primaryLabel}</span>
          </div>

          {card.secondary && (
            <p className="text-xs text-[#6b6560] mt-1">{card.secondary}</p>
          )}

          {card.healthBar && card.healthBar.total > 0 && (
            <div className="mt-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(card.healthBar.ok / card.healthBar.total) * 100}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${(card.healthBar.redirect / card.healthBar.total) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(card.healthBar.lost / card.healthBar.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-[#6b6560]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{card.healthBar.ok} OK
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#6b6560]">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />{card.healthBar.redirect} Redir.
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#6b6560]">
                  <span className="w-2 h-2 rounded-full bg-red-500" />{card.healthBar.lost} Perdus
                </span>
              </div>
            </div>
          )}

          {card.dofollowBar && (
            <div className="mt-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div className="bg-emerald-500" style={{ width: `${card.dofollowBar.dofollow}%` }} />
                <div className="bg-gray-400" style={{ width: `${card.dofollowBar.nofollow}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-[#6b6560]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{Math.round(card.dofollowBar.dofollow)}% Dofollow
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#6b6560]">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />{Math.round(card.dofollowBar.nofollow)}% Nofollow
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
