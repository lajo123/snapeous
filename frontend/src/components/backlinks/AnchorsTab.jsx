import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getBacklinkAnchors } from '@/lib/api';
import { cn } from '@/lib/utils';
import AnchorDistributionChart from './charts/AnchorDistributionChart';

const GENERIC_ANCHORS = ['cliquez ici', 'click here', 'lire plus', 'read more', 'voir', 'ici', 'en savoir plus', 'lien', 'link', 'site', 'page', 'article'];

function categorizeAnchor(text, projectDomain) {
  if (!text) return 'other';
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('http') || lower.includes('.com') || lower.includes('.fr') || lower.includes('.org')) return 'url';
  if (projectDomain && lower.includes(projectDomain.toLowerCase().replace('www.', ''))) return 'branded';
  if (GENERIC_ANCHORS.some(g => lower === g || lower.includes(g))) return 'generic';
  return 'other';
}

function getDiversityColor(score) {
  if (score >= 70) return 'text-brand-600 bg-brand-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

const CATEGORY_COLORS = {
  url: 'bg-blue-100 text-blue-700',
  branded: 'bg-violet-100 text-violet-700',
  generic: 'bg-cream-50 text-ink-600',
  other: 'bg-amber-100 text-amber-700',
};

const CATEGORY_KEYS = {
  url: 'anchors.catUrl',
  branded: 'anchors.catBranded',
  generic: 'anchors.catGeneric',
  other: 'anchors.catOther',
};

export default function AnchorsTab({ projectId, projectDomain }) {
  const { t } = useTranslation('backlinks');

  const { data, isLoading } = useQuery({
    queryKey: ['backlink-anchors', projectId],
    queryFn: () => getBacklinkAnchors(projectId),
    staleTime: 60000,
  });

  if (isLoading) return <div className="text-center py-12 text-ink-300">{t('links.loading')}</div>;
  if (!data || data.total_anchors === 0) return <div className="text-center py-12 text-ink-300">{t('anchors.noAnchors')}</div>;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-ink">{data.total_anchors}</p>
          <p className="text-xs text-ink-400 mt-1">{t('anchors.totalAnchors')}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-ink">{data.unique_anchors}</p>
          <p className="text-xs text-ink-400 mt-1">{t('anchors.uniqueAnchors')}</p>
        </div>
        <div className="card p-4 text-center">
          <p className={cn("text-3xl font-bold", getDiversityColor(data.diversity_score).split(' ')[0])}>
            {data.diversity_score}%
          </p>
          <p className="text-xs text-ink-400 mt-1">{t('anchors.diversityScore')}</p>
          <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium", getDiversityColor(data.diversity_score))}>
            {data.diversity_score >= 70 ? t('anchors.good') : data.diversity_score >= 40 ? t('anchors.medium') : t('anchors.weak')}
          </span>
        </div>
      </div>

      {/* Over-optimized warning */}
      {data.over_optimized.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm">
            <strong>{t('anchors.overOptimized')}</strong>{' '}
            {data.over_optimized.map(a => `"${a.text}" (${a.percentage}%)`).join(', ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Chart */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">{t('anchors.distribution')}</h3>
          <AnchorDistributionChart anchors={data.anchors} />
        </div>

        {/* Table */}
        <div className="col-span-3 card overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-50 border-b border-cream-200">
              <tr>
                <th className="table-header px-4 py-3">{t('anchors.anchorText')}</th>
                <th className="table-header px-4 py-3 text-right">{t('anchors.count')}</th>
                <th className="table-header px-4 py-3 text-right">%</th>
                <th className="table-header px-4 py-3 text-right">{t('anchors.dofollow')}</th>
                <th className="table-header px-4 py-3 text-right">{t('anchors.nofollow')}</th>
                <th className="table-header px-4 py-3">{t('anchors.category')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {data.anchors.map((anchor, i) => {
                const category = categorizeAnchor(anchor.text, projectDomain);
                return (
                  <tr key={i} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <span className="text-sm text-ink font-medium">{anchor.text}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-ink">{anchor.count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-cream-50">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(anchor.percentage, 100)}%` }} />
                        </div>
                        <span className="text-sm text-ink-500 w-10 text-right">{anchor.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-ink-500">{anchor.dofollow}</td>
                    <td className="px-4 py-3 text-right text-sm text-ink-500">{anchor.nofollow}</td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", CATEGORY_COLORS[category])}>{t(CATEGORY_KEYS[category])}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
