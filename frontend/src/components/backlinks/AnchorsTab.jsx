import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { getBacklinkAnchors } from '@/lib/api';
import { cn } from '@/lib/utils';
import AnchorDistributionChart from './charts/AnchorDistributionChart';

const GENERIC_ANCHORS = ['cliquez ici', 'click here', 'lire plus', 'read more', 'voir', 'ici', 'en savoir plus', 'lien', 'link', 'site', 'page', 'article'];

function categorizeAnchor(text, projectDomain) {
  if (!text) return 'Autre';
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('http') || lower.includes('.com') || lower.includes('.fr') || lower.includes('.org')) return 'URL';
  if (projectDomain && lower.includes(projectDomain.toLowerCase().replace('www.', ''))) return 'Branded';
  if (GENERIC_ANCHORS.some(g => lower === g || lower.includes(g))) return 'Generique';
  return 'Autre';
}

function getDiversityColor(score) {
  if (score >= 70) return 'text-emerald-600 bg-emerald-50';
  if (score >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

const CATEGORY_COLORS = {
  'URL': 'bg-blue-100 text-blue-700',
  'Branded': 'bg-violet-100 text-violet-700',
  'Generique': 'bg-gray-100 text-gray-700',
  'Autre': 'bg-amber-100 text-amber-700',
};

export default function AnchorsTab({ projectId, projectDomain }) {
  const { data, isLoading } = useQuery({
    queryKey: ['backlink-anchors', projectId],
    queryFn: () => getBacklinkAnchors(projectId),
    staleTime: 60000,
  });

  if (isLoading) return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  if (!data || data.total_anchors === 0) return <div className="text-center py-12 text-gray-400">Aucune ancre trouvee</div>;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{data.total_anchors}</p>
          <p className="text-xs text-[#6b6560] mt-1">Total ancres</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{data.unique_anchors}</p>
          <p className="text-xs text-[#6b6560] mt-1">Ancres uniques</p>
        </div>
        <div className="card p-4 text-center">
          <p className={cn("text-3xl font-bold", getDiversityColor(data.diversity_score).split(' ')[0])}>
            {data.diversity_score}%
          </p>
          <p className="text-xs text-[#6b6560] mt-1">Score de diversite</p>
          <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium", getDiversityColor(data.diversity_score))}>
            {data.diversity_score >= 70 ? 'Bon' : data.diversity_score >= 40 ? 'Moyen' : 'Faible'}
          </span>
        </div>
      </div>

      {/* Over-optimized warning */}
      {data.over_optimized.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm">
            <strong>Ancre sur-optimisee detectee :</strong>{' '}
            {data.over_optimized.map(a => `"${a.text}" (${a.percentage}%)`).join(', ')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {/* Chart */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribution des ancres</h3>
          <AnchorDistributionChart anchors={data.anchors} />
        </div>

        {/* Table */}
        <div className="col-span-3 card overflow-hidden">
          <table className="w-full">
            <thead style={{ backgroundColor: '#FAF7F2' }} className="border-b border-[#EDE4D3]">
              <tr>
                <th className="table-header px-4 py-3">Texte d'ancre</th>
                <th className="table-header px-4 py-3 text-right">Nombre</th>
                <th className="table-header px-4 py-3 text-right">%</th>
                <th className="table-header px-4 py-3 text-right">Dofollow</th>
                <th className="table-header px-4 py-3 text-right">Nofollow</th>
                <th className="table-header px-4 py-3">Categorie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE4D3]">
              {data.anchors.map((anchor, i) => {
                const category = categorizeAnchor(anchor.text, projectDomain);
                return (
                  <tr key={i} className="hover:bg-emerald-50/40">
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 font-medium">{anchor.text}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">{anchor.count}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(anchor.percentage, 100)}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 w-10 text-right">{anchor.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{anchor.dofollow}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{anchor.nofollow}</td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-xs", CATEGORY_COLORS[category])}>{category}</span>
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
