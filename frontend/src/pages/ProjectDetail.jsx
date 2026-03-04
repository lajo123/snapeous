import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject, refreshProjectMetrics } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LANG_DATE_LOCALES } from '@/i18n';
import {
  Globe, Target, Key, ExternalLink, Loader, Link2,
  Search, Anchor, TrendingUp, Shield, BarChart3, Users,
  AlertTriangle, Server, MapPin, Tag, Layers, ArrowUpRight,
  Zap, Eye, GraduationCap, Landmark, Network,
  Calendar, Clock, DollarSign, Mail, Phone, Code2, Share2,
  History, Trophy, FileText, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  AreaChart, Area, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── Chart palette ─────────────────────────────────────────────────── */
const C = {
  brand: '#C9785D', green: '#10b981', red: '#ef4444',
  blue: '#3b82f6', violet: '#8b5cf6', amber: '#f59e0b',
  rose: '#f43f5e', cyan: '#06b6d4', teal: '#14b8a6',
  indigo: '#6366f1', emerald: '#059669', gray: '#9ca3af',
};

/* ── Score Ring ─────────────────────────────────────────────────────── */
const ScoreRing = ({ value, max = 100, size = 88, label, color = C.brand }) => {
  const sw = 7;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, (value ?? 0) / max) : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} className="stroke-cream-200" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
            strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-ink">{value ?? '--'}</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-ink-400 text-center leading-tight">{label}</p>
    </div>
  );
};

/* ── Chart tooltip ─────────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-surface border border-cream-200 px-3 py-2 shadow-soft-md text-xs">
      {label && <p className="font-medium text-ink mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-ink-400">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-ink">{formatter ? formatter(p.value) : p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Section wrapper ───────────────────────────────────────────────── */
const Section = ({ icon: Icon, color, title, children, className }) => (
  <div className={cn('card p-6', className)}>
    {title && (
      <div className="flex items-center gap-2.5 mb-5">
        {Icon && <Icon className={cn('h-4.5 w-4.5', color || 'text-ink-400')} />}
        <h2 className="text-[13px] font-bold text-ink uppercase tracking-wider">{title}</h2>
      </div>
    )}
    {children}
  </div>
);

/* ── Horizontal bar ────────────────────────────────────────────────── */
const BarRow = ({ label, value, max, color = 'bg-brand-500', fmt }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 truncate text-ink-400 shrink-0 text-xs">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-cream-200/60 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right font-semibold text-ink tabular-nums shrink-0 text-xs">
        {fmt ? fmt(value) : (typeof value === 'number' ? value.toLocaleString() : value)}
      </span>
    </div>
  );
};

/* ── Table helpers ─────────────────────────────────────────────────── */
const TD = ({ children, right, className: cls }) => (
  <td className={cn('py-2.5 px-3 text-sm', right && 'text-right tabular-nums', cls)}>{children}</td>
);

/* Sortable table header */
const SortTH = ({ children, right, sortKey, sort, onSort }) => {
  const active = sort?.key === sortKey;
  const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ArrowUpDown;
  return (
    <th
      className={cn(
        'py-2.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-300 select-none',
        right && 'text-right',
        sortKey && 'cursor-pointer hover:text-ink-500 transition-colors group',
      )}
      onClick={sortKey ? () => onSort(sortKey) : undefined}
    >
      <span className={cn('inline-flex items-center gap-1', right && 'flex-row-reverse')}>
        {children}
        {sortKey && <Icon className={cn('h-3 w-3 shrink-0', active ? 'text-brand-500' : 'opacity-0 group-hover:opacity-40')} />}
      </span>
    </th>
  );
};

/* Hook for sort state */
function useTableSort(defaultKey = null, defaultDir = 'desc') {
  const [sort, setSort] = useState(defaultKey ? { key: defaultKey, dir: defaultDir } : null);
  const toggle = (key) => {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
      return { key, dir: 'desc' };
    });
  };
  const sortFn = (data) => {
    if (!sort || !data) return data;
    return [...data].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // String comparison
      if (typeof av === 'string' && typeof bv === 'string') {
        const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' });
        return sort.dir === 'asc' ? cmp : -cmp;
      }
      // Numeric comparison
      if (av === bv) return 0;
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  };
  return { sort, toggle, sortFn };
}

/* ── Keywords Table (sortable, paginated) ─────────────────────────── */
const KW_PER_PAGE = 30;

const KeywordsTable = ({ keywords, t, fmtK }) => {
  const { sort, toggle, sortFn } = useTableSort('search_volume');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => sortFn(keywords || []), [keywords, sort]);
  const totalPages = Math.ceil(sorted.length / KW_PER_PAGE);
  const slice = sorted.slice(page * KW_PER_PAGE, (page + 1) * KW_PER_PAGE);

  if (!keywords?.length) return null;

  return (
    <Section title={t('topKeywords')} icon={Search} color="text-emerald-600">
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full">
          <thead><tr className="border-b border-cream-200">
            <SortTH sortKey="keyword" sort={sort} onSort={toggle}>{t('keyword')}</SortTH>
            <SortTH right sortKey="position" sort={sort} onSort={toggle}>{t('position')}</SortTH>
            <SortTH right sortKey="search_volume" sort={sort} onSort={toggle}>{t('searchVolume')}</SortTH>
            <SortTH right sortKey="traffic" sort={sort} onSort={toggle}>{t('estimatedTraffic')}</SortTH>
            <SortTH right sortKey="cpc" sort={sort} onSort={toggle}>CPC</SortTH>
            <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-300">{t('pageUrl')}</th>
          </tr></thead>
          <tbody>
            {slice.map((kw, i) => {
              let shortPath = '';
              if (kw.url) {
                try { shortPath = new URL(kw.url).pathname; } catch { shortPath = kw.url; }
                if (shortPath.length > 35) shortPath = shortPath.slice(0, 32) + '...';
              }
              return (
                <tr key={`${kw.keyword}-${i}`} className="border-b border-cream-100 last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <TD className="font-medium text-ink max-w-[280px]">
                    <span className="truncate block">{kw.keyword}</span>
                  </TD>
                  <TD right>
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[28px] rounded-full px-2 py-0.5 text-xs font-bold',
                      kw.position <= 3 ? 'bg-green-100 text-green-700' :
                      kw.position <= 10 ? 'bg-blue-100 text-blue-700' :
                      kw.position <= 20 ? 'bg-violet-100 text-violet-700' :
                      'bg-cream-200 text-ink-400'
                    )}>
                      {kw.position}
                    </span>
                  </TD>
                  <TD right className="text-ink-600">{fmtK(kw.search_volume)}</TD>
                  <TD right className="text-ink-600">{kw.traffic != null ? fmtK(kw.traffic) : '--'}</TD>
                  <TD right className="text-ink-400">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '--'}</TD>
                  <TD className="max-w-[180px]">
                    {kw.url ? (
                      <a href={kw.url} target="_blank" rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-700 text-xs font-mono truncate block" title={kw.url}>
                        {shortPath}
                      </a>
                    ) : '--'}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-200">
          <p className="text-xs text-ink-300">
            {t('showingTopN', { n: Math.min(sorted.length, (page + 1) * KW_PER_PAGE), total: sorted.length })}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn(
                  'h-7 min-w-[28px] rounded-lg text-xs font-medium transition-colors',
                  i === page ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-cream-200'
                )}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
};

/* ── Pages Table (sortable, enriched with keyword + backlinks) ────── */
const PG_PER_PAGE = 20;

const PagesTable = ({ pages, keywords, t, fmtK, fmt }) => {
  const { sort, toggle, sortFn } = useTableSort('etv');
  const [page, setPage] = useState(0);

  // Build a map: url → { topKeyword, keywordCount, backlinkCount }
  const urlMeta = useMemo(() => {
    const map = {};
    // From ranked_keywords: group by url, pick top keyword (highest search_volume)
    (keywords || []).forEach((kw) => {
      if (!kw.url) return;
      const norm = kw.url.replace(/\/$/, '');
      if (!map[norm]) map[norm] = { topKeyword: null, topVolume: 0, kwCount: 0 };
      map[norm].kwCount += 1;
      if ((kw.search_volume || 0) > map[norm].topVolume) {
        map[norm].topKeyword = kw.keyword;
        map[norm].topVolume = kw.search_volume || 0;
      }
    });
    return map;
  }, [keywords]);

  const enriched = useMemo(() => {
    if (!pages?.length) return [];
    return pages.map((pg) => {
      const norm = pg.url?.replace(/\/$/, '') || '';
      const meta = urlMeta[norm] || {};
      return { ...pg, topKeyword: meta.topKeyword || null, kwFromRank: meta.kwCount || 0 };
    });
  }, [pages, urlMeta]);

  const sorted = useMemo(() => sortFn(enriched), [enriched, sort]);
  const totalPages = Math.ceil(sorted.length / PG_PER_PAGE);
  const slice = sorted.slice(page * PG_PER_PAGE, (page + 1) * PG_PER_PAGE);

  if (!pages?.length) return null;

  return (
    <Section title={t('topPages')} icon={FileText} color="text-blue-600">
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full">
          <thead><tr className="border-b border-cream-200">
            <SortTH sortKey="url" sort={sort} onSort={toggle}>{t('pageUrl')}</SortTH>
            <SortTH right sortKey="etv" sort={sort} onSort={toggle}>{t('estimatedTraffic')}</SortTH>
            <SortTH right sortKey="keywords_count" sort={sort} onSort={toggle}>{t('organicKeywords')}</SortTH>
            <th className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-ink-300">{t('topKeyword')}</th>
            <SortTH right sortKey="pos_1" sort={sort} onSort={toggle}>{t('pos1')}</SortTH>
            <SortTH right sortKey="pos_4_10" sort={sort} onSort={toggle}>{t('pos4_10')}</SortTH>
          </tr></thead>
          <tbody>
            {slice.map((pg, i) => {
              let pathname = '';
              try { pathname = new URL(pg.url).pathname; } catch { pathname = pg.url || ''; }
              const isHome = pathname === '/';
              return (
                <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-surface-muted/50 transition-colors">
                  <TD className="max-w-[300px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col min-w-0 flex-1">
                        <a href={pg.url} target="_blank" rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-800 font-medium text-sm truncate block transition-colors"
                          title={pg.url}>
                          {isHome ? '/' : pathname}
                        </a>
                      </div>
                      <a href={pg.url} target="_blank" rel="noopener noreferrer"
                        className="text-ink-300 hover:text-brand-500 shrink-0 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TD>
                  <TD right>
                    <span className="font-bold text-ink">{fmtK(pg.etv)}</span>
                  </TD>
                  <TD right className="text-ink-600">{fmtK(pg.keywords_count)}</TD>
                  <TD className="max-w-[200px]">
                    {pg.topKeyword ? (
                      <span className="text-xs text-ink-500 truncate block" title={pg.topKeyword}>{pg.topKeyword}</span>
                    ) : <span className="text-xs text-ink-300">--</span>}
                  </TD>
                  <TD right className="text-ink-600">{pg.pos_1 ?? '--'}</TD>
                  <TD right className="text-ink-600">{pg.pos_4_10 ?? '--'}</TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-200">
          <p className="text-xs text-ink-300">
            {t('showingTopN', { n: Math.min(sorted.length, (page + 1) * PG_PER_PAGE), total: sorted.length })}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn(
                  'h-7 min-w-[28px] rounded-lg text-xs font-medium transition-colors',
                  i === page ? 'bg-brand-500 text-white' : 'text-ink-400 hover:bg-cream-200'
                )}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function ProjectDetail() {
  const { id, lang } = useParams();
  const { t } = useTranslation('dashboard');
  const queryClient = useQueryClient();
  const locale = LANG_DATE_LOCALES[lang] || 'en-US';
  const fmt = (v) => (v != null ? Number(v).toLocaleString(locale) : '--');
  const fmtK = (v) => {
    if (v == null) return '--';
    const n = Number(v);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString(locale);
  };

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    refetchInterval: (query) => {
      const status = query.state.data?.site_analysis?.status;
      return status === 'analyzing' ? 5000 : false;
    },
  });

  /* Refresh only DataForSEO + DomDetailer metrics (no crawl / no AI) */
  const fetchMutation = useMutation({
    mutationFn: () => refreshProjectMetrics(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader className="h-8 w-8 text-brand-500 animate-spin" /></div>;
  if (isError || !project) return <div className="text-center py-16"><p className="text-ink-400">{t('projectNotFound')}</p></div>;

  const analysis = project.site_analysis;
  const dm = analysis?.domain_metrics;
  const dfs = analysis?.dataforseo_metrics;

  /* ── Flatten summary-level dfs fields (backlinks, referring_domains…) ─
     When backlinks/summary endpoint returned data these live at the dfs root.
     When only whois is available, fall back to DomDetailer data. */
  const bl = {
    backlinks: dfs?.backlinks ?? dm?.backlinks_count,
    referring_domains: dfs?.referring_domains ?? dm?.referring_domains,
    referring_ips: dfs?.referring_ips ?? dm?.referring_ips,
    referring_subnets: dfs?.referring_subnets ?? dm?.referring_subnets,
    broken_backlinks: dfs?.broken_backlinks,
    internal_links_count: dfs?.internal_links_count,
    external_links_count: dfs?.external_links_count,
    referring_links_types: dfs?.referring_links_types,
    referring_links_platform_types: dfs?.referring_links_platform_types,
    referring_links_countries: dfs?.referring_links_countries,
    referring_links_tld: dfs?.referring_links_tld,
    server_info: dfs?.server_info,
  };

  /* ── Organic WHOIS values (always shown) ──────────────────────────── */
  const whois = dfs?.whois;
  const organicEtv = whois?.organic_etv ?? null;
  const organicCount = whois?.organic_count ?? null;
  const organicCost = whois?.organic_estimated_paid_traffic_cost ?? null;

  /* ── Analyzing state ────────────────────────────────────────────── */
  if (analysis?.status === 'analyzing') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-ink-400">
            <Globe className="h-4 w-4" /><span>{project.client_domain}</span>
          </div>
        </div>
        <div className="card px-6 py-16 text-center">
          <Loader className="h-10 w-10 text-brand-500 animate-spin mx-auto" />
          <h3 className="mt-4 text-base font-bold text-ink">{t('analyzing')}</h3>
          <p className="mt-2 text-sm text-ink-400">{analysis.progress || t('analyzingDesc')}</p>
        </div>
      </div>
    );
  }

  const hasMetrics = dm || dfs;

  /* ── Derived data ───────────────────────────────────────────────── */
  const dofollow = Number(dm?.dofollow_backlinks || dfs?.referring_links_attributes?.dofollow || 0);
  const nofollow = Number(dm?.nofollow_backlinks || dfs?.referring_links_attributes?.nofollow || bl.backlinks || 0);
  const dfTotal = dofollow + nofollow;
  const dfPieData = dfTotal > 0
    ? [{ name: 'Dofollow', value: dofollow }, { name: 'Nofollow', value: nofollow }]
    : null;

  /* SERP positions are always shown when available (decoupled from organic value guards) */
  const serpData = whois ? [
    { label: t('pos1'), value: whois.organic_pos_1 || 0, color: C.green },
    { label: t('pos2_3'), value: whois.organic_pos_2_3 || 0, color: C.emerald },
    { label: t('pos4_10'), value: whois.organic_pos_4_10 || 0, color: C.blue },
    { label: t('pos11_20'), value: whois.organic_pos_11_20 || 0, color: C.violet },
    { label: t('pos21_30'), value: whois.organic_pos_21_30 || 0, color: C.gray },
  ].filter(d => d.value > 0) : [];

  const historyData = (dfs?.history || []).map(h => ({
    date: h.date ? new Date(h.date).toLocaleDateString(locale, { month: 'short', year: '2-digit' }) : '',
    backlinks: h.backlinks || 0,
    newBl: h.new_backlinks || 0,
    lostBl: h.lost_backlinks || 0,
    refDomains: h.referring_domains || 0,
  }));

  const domainAge = (() => {
    if (!whois?.created_datetime) return null;
    const totalMonths = Math.floor((Date.now() - new Date(whois.created_datetime)) / (1000 * 60 * 60 * 24 * 30.44));
    const yrs = Math.floor(totalMonths / 12);
    const mos = totalMonths % 12;
    if (yrs > 0) return `${yrs} ${t('years')}${mos > 0 ? ` ${mos} ${t('months')}` : ''}`;
    return mos > 0 ? `${mos} ${t('months')}` : `< 1 ${t('months')}`;
  })();

  return (
    <div className="space-y-5">
      {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{project.name}</h1>
            {project.niche && (
              <span className="badge bg-violet-50 text-violet-700 border border-violet-200">{project.niche}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-ink-400">
            <Globe className="h-4 w-4" />
            <span>{project.client_domain}</span>
            <a href={`https://${project.client_domain}`} target="_blank" rel="noopener noreferrer"
              className="text-brand-500 hover:text-brand-700 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {domainAge && (
              <>
                <span className="text-ink-200">·</span>
                <Calendar className="h-3.5 w-3.5" />
                <span>{domainAge}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchMutation.mutate()}
          disabled={fetchMutation.isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
            'bg-brand-500 text-white hover:bg-brand-600 shadow-soft-sm hover:shadow-soft-md',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-soft-sm'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', fetchMutation.isPending && 'animate-spin')} />
          {t('fetchData')}
        </button>
      </div>

      {!hasMetrics && (
        <div className="card px-6 py-12 text-center">
          <BarChart3 className="h-10 w-10 text-ink-200 mx-auto" />
          <p className="mt-3 text-sm text-ink-400">{t('noProjectsDesc')}</p>
        </div>
      )}

      {hasMetrics && (
        <>
          {/* ═══ 1 · AUTHORITY SCORES (Majestic + Moz) ═════════════ */}
          {dm && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Majestic */}
              <Section className="relative">
                <span className="absolute top-3 right-4 text-[10px] font-semibold uppercase tracking-widest text-ink-300">Majestic</span>
                <div className="flex items-center justify-around gap-4">
                  <ScoreRing value={dm.citation_flow} label="CF" color={C.teal} />
                  <ScoreRing value={dm.trust_flow} label="TF" color={C.emerald} />
                </div>
                {/* Majestic Topical Trust Flow */}
                {dm.topic_categories?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-cream-200">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300 mb-2">Topical Trust Flow</p>
                    <div className="space-y-1.5">
                      {dm.topic_categories.slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-ink-500 truncate">{t.name}</span>
                          </div>
                          <div className="w-20 h-1.5 rounded-full bg-cream-200/60 overflow-hidden">
                            <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, t.value || 0)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-ink tabular-nums w-8 text-right">{t.value ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
              {/* Moz */}
              <Section className="relative">
                <span className="absolute top-3 right-4 text-[10px] font-semibold uppercase tracking-widest text-ink-300">Moz</span>
                <div className="flex items-center justify-around gap-4">
                  <ScoreRing value={dm.domain_rank} label="DA" color={C.brand} />
                  <ScoreRing value={dm.moz_rank} max={10} label="Moz Rank" color={C.indigo} />
                  {dm.moz_spam_score != null && (
                    <ScoreRing value={dm.moz_spam_score} max={17} label={t('spamScore')}
                      color={dm.moz_spam_score > 5 ? C.red : dm.moz_spam_score > 2 ? C.amber : C.green} />
                  )}
                </div>
                {/* Moz additional stats */}
                {(dm.moz_links != null || dm.moz_trust != null) && (
                  <div className="mt-4 pt-3 border-t border-cream-200 flex items-center gap-6 flex-wrap">
                    {dm.moz_trust != null && (
                      <div>
                        <p className="text-[10px] text-ink-300">Moz Trust</p>
                        <p className="text-sm font-bold text-ink">{dm.moz_trust}</p>
                      </div>
                    )}
                    {dm.moz_links != null && (
                      <div>
                        <p className="text-[10px] text-ink-300">Moz Links</p>
                        <p className="text-sm font-bold text-ink">{fmtK(dm.moz_links)}</p>
                      </div>
                    )}
                    {dm.url_rank != null && (
                      <div>
                        <p className="text-[10px] text-ink-300">PA</p>
                        <p className="text-sm font-bold text-ink">{dm.url_rank}</p>
                      </div>
                    )}
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ═══ 2 · BACKLINK KPIs ═══════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Link2, c: 'text-blue-600', bg: 'bg-blue-100', label: t('totalBacklinks'), val: fmtK(bl.backlinks) },
              { icon: Users, c: 'text-violet-600', bg: 'bg-violet-100', label: t('refDomains'), val: fmtK(bl.referring_domains) },
              { icon: Shield, c: 'text-green-600', bg: 'bg-green-100', label: 'Dofollow', val: fmtK(dofollow) },
              { icon: AlertTriangle, c: 'text-ink-400', bg: 'bg-cream-200', label: 'Nofollow', val: fmtK(nofollow) },
            ].map(({ icon: I, c, bg, label, val }) => (
              <div key={label} className="card p-5">
                <div className={cn('rounded-xl p-2 w-fit mb-3', bg)}><I className={cn('h-4 w-4', c)} /></div>
                <p className="text-2xl font-bold tracking-tight text-ink">{val}</p>
                <p className="text-xs text-ink-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* ═══ 3 · LINK QUALITY + ORGANIC / SERP ═══════════════════ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Dofollow / Nofollow pie */}
            {dfPieData && (
              <Section title={t('linkAttributes')} icon={Shield} color="text-green-600">
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={dfPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58}
                        paddingAngle={3} dataKey="value" stroke="none">
                        <Cell fill={C.green} />
                        <Cell fill={C.gray} />
                      </Pie>
                      <Tooltip content={<ChartTip formatter={fmt} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: C.green }} />
                      <span className="text-xs text-ink-400">Dofollow</span>
                      <span className="ml-auto text-sm font-bold text-ink">{fmtK(dofollow)}</span>
                      <span className="text-xs text-ink-300">{dfTotal > 0 ? `${Math.round((dofollow / dfTotal) * 100)}%` : '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: C.gray }} />
                      <span className="text-xs text-ink-400">Nofollow</span>
                      <span className="ml-auto text-sm font-bold text-ink">{fmtK(nofollow)}</span>
                      <span className="text-xs text-ink-300">{dfTotal > 0 ? `${Math.round((nofollow / dfTotal) * 100)}%` : '--'}</span>
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {/* SERP positions */}
            {serpData.length > 0 && (
              <Section title={t('serpPositions')} icon={TrendingUp} color="text-green-600">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={serpData} layout="vertical" margin={{ left: 0, right: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="label" width={70}
                      tick={{ fontSize: 12, fill: '#6b6560' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip formatter={fmt} />} />
                    <Bar dataKey="value" name="Keywords" radius={[0, 4, 4, 0]} barSize={16}>
                      {serpData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {(organicEtv != null || organicCount != null || organicCost != null) && (
                  <div className="mt-3 pt-3 border-t border-cream-200 flex items-center gap-6 flex-wrap">
                    {organicEtv != null && (
                      <div>
                        <p className="text-[11px] text-ink-300">{t('organicTraffic')}</p>
                        <p className="text-base font-bold text-ink">{fmtK(organicEtv)}</p>
                      </div>
                    )}
                    {organicCount != null && (
                      <div>
                        <p className="text-[11px] text-ink-300">{t('organicKeywords')}</p>
                        <p className="text-base font-bold text-ink">{fmtK(organicCount)}</p>
                      </div>
                    )}
                    {organicCost != null && (
                      <div>
                        <p className="text-[11px] text-ink-300">{t('organicTrafficCost')}</p>
                        <p className="text-base font-bold text-ink">${fmt(organicCost)}</p>
                      </div>
                    )}
                  </div>
                )}
              </Section>
            )}
          </div>

          {/* ═══ 3b · ORGANIC KPIs (shown even without SERP chart) ════ */}
          {serpData.length === 0 && (organicEtv != null || organicCount != null || organicCost != null) && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {organicEtv != null && (
                <div className="card p-5">
                  <div className="rounded-xl p-2 w-fit mb-3 bg-green-100"><TrendingUp className="h-4 w-4 text-green-600" /></div>
                  <p className="text-2xl font-bold tracking-tight text-ink">{fmtK(organicEtv)}</p>
                  <p className="text-xs text-ink-400 mt-1">{t('organicTraffic')}</p>
                </div>
              )}
              {organicCount != null && (
                <div className="card p-5">
                  <div className="rounded-xl p-2 w-fit mb-3 bg-emerald-100"><Key className="h-4 w-4 text-emerald-600" /></div>
                  <p className="text-2xl font-bold tracking-tight text-ink">{fmtK(organicCount)}</p>
                  <p className="text-xs text-ink-400 mt-1">{t('organicKeywords')}</p>
                </div>
              )}
              {organicCost != null && (
                <div className="card p-5">
                  <div className="rounded-xl p-2 w-fit mb-3 bg-amber-100"><DollarSign className="h-4 w-4 text-amber-600" /></div>
                  <p className="text-2xl font-bold tracking-tight text-ink">${fmt(organicCost)}</p>
                  <p className="text-xs text-ink-400 mt-1">{t('organicTrafficCost')}</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ 3c · TOP KEYWORDS (sortable) ════════════════════════ */}
          <KeywordsTable keywords={dfs?.ranked_keywords} t={t} fmtK={fmtK} />

          {/* ═══ 3d · TOP PAGES BY TRAFFIC (sortable, enriched) ════ */}
          <PagesTable pages={dfs?.relevant_pages} keywords={dfs?.ranked_keywords} t={t} fmtK={fmtK} fmt={fmt} />

          {/* ═══ 4 · BACKLINK TREND (area chart) ═════════════════════ */}
          {historyData.length > 0 && (
            <Section title={t('backlinkHistory')} icon={History} color="text-teal-600">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dccb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip formatter={fmt} />} />
                  <Area type="monotone" dataKey="backlinks" name="Backlinks"
                    stroke={C.brand} fill="url(#gradBl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              {/* New / Lost summary strip */}
              {historyData.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cream-200 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[11px] text-ink-300">{t('totalBacklinks')}</p>
                    <p className="text-base font-bold text-ink">{fmt(historyData[historyData.length - 1]?.backlinks)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-300">{t('newBacklinks')}</p>
                    <p className="text-base font-bold text-green-600">+{fmt(historyData[historyData.length - 1]?.newBl)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-300">{t('lostBacklinks')}</p>
                    <p className="text-base font-bold text-red-500">-{fmt(historyData[historyData.length - 1]?.lostBl)}</p>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ═══ 5 · LINK DISTRIBUTION + GEOGRAPHIC ═════════════════ */}
          {(bl.referring_links_types || bl.referring_links_countries) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {(bl.referring_links_types || bl.referring_links_platform_types) && (
                <Section title={t('linkDistribution')} icon={Layers} color="text-violet-600">
                  <div className="space-y-5">
                    {bl.referring_links_types && Object.keys(bl.referring_links_types).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2.5">{t('linkTypes')}</p>
                        <div className="space-y-2">
                          {Object.entries(bl.referring_links_types)
                            .sort(([, a], [, b]) => (b || 0) - (a || 0))
                            .map(([key, val]) => (
                              <BarRow key={key} label={key} value={val} max={bl.backlinks || 1} color="bg-violet-500" fmt={fmtK} />
                            ))}
                        </div>
                      </div>
                    )}
                    {bl.referring_links_platform_types && Object.keys(bl.referring_links_platform_types).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2.5">{t('platformTypes')}</p>
                        <div className="space-y-2">
                          {Object.entries(bl.referring_links_platform_types)
                            .sort(([, a], [, b]) => (b || 0) - (a || 0))
                            .map(([key, val]) => (
                              <BarRow key={key} label={key} value={val} max={bl.backlinks || 1} color="bg-emerald-500" fmt={fmtK} />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {(bl.referring_links_countries || bl.referring_links_tld) && (
                <Section title={t('geographicDistribution')} icon={MapPin} color="text-rose-600">
                  <div className="space-y-5">
                    {bl.referring_links_countries && Object.keys(bl.referring_links_countries).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2.5">{t('topCountries')}</p>
                        <div className="space-y-2">
                          {Object.entries(bl.referring_links_countries)
                            .sort(([, a], [, b]) => (b || 0) - (a || 0))
                            .slice(0, 8)
                            .map(([key, val]) => (
                              <BarRow key={key} label={key} value={val}
                                max={Math.max(...Object.values(bl.referring_links_countries))}
                                color="bg-rose-500" fmt={fmtK} />
                            ))}
                        </div>
                      </div>
                    )}
                    {bl.referring_links_tld && Object.keys(bl.referring_links_tld).length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2.5">{t('topTLDs')}</p>
                        <div className="space-y-2">
                          {Object.entries(bl.referring_links_tld)
                            .sort(([, a], [, b]) => (b || 0) - (a || 0))
                            .slice(0, 8)
                            .map(([key, val]) => (
                              <BarRow key={key} label={key} value={val}
                                max={Math.max(...Object.values(bl.referring_links_tld))}
                                color="bg-indigo-500" fmt={fmtK} />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* ═══ 7 · REFERRERS + COMPETITORS (side by side) ═════════ */}
          {(dfs?.top_referring_domains?.length > 0 || dfs?.competitors?.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {dfs?.top_referring_domains?.length > 0 && (
                <Section title={t('topReferringDomains')} icon={Globe} color="text-indigo-600">
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full">
                      <thead><tr className="border-b border-cream-200">
                        <TH>{t('domain')}</TH>
                        <TH right>{t('rank')}</TH>
                        <TH right>{t('anchorBacklinks')}</TH>
                      </tr></thead>
                      <tbody>
                        {dfs.top_referring_domains.slice(0, 10).map((d, i) => (
                          <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-surface-muted/50 transition-colors">
                            <TD className="font-medium text-ink">{d.domain}</TD>
                            <TD right className="text-ink-600">{fmt(d.rank)}</TD>
                            <TD right className="text-ink-600">{fmt(d.backlinks)}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {dfs?.competitors?.length > 0 && (
                <Section title={t('competitors')} icon={Trophy} color="text-amber-600">
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full">
                      <thead><tr className="border-b border-cream-200">
                        <TH>{t('competitorDomain')}</TH>
                        <TH right>{t('competitorRank')}</TH>
                        <TH right>{t('sharedBacklinks')}</TH>
                      </tr></thead>
                      <tbody>
                        {dfs.competitors.slice(0, 10).map((c, i) => (
                          <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-surface-muted/50 transition-colors">
                            <TD className="font-medium text-ink">{c.domain}</TD>
                            <TD right className="text-ink-600">{fmt(c.rank)}</TD>
                            <TD right className="text-ink-600">{fmt(c.intersections)}</TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* ═══ 8 · TOP ANCHORS ═════════════════════════════════════ */}
          {dfs?.top_anchors?.length > 0 && (
            <Section title={t('topAnchors')} icon={Anchor} color="text-rose-600">
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full">
                  <thead><tr className="border-b border-cream-200">
                    <TH>{t('anchor')}</TH>
                    <TH right>{t('anchorBacklinks')}</TH>
                    <TH right>{t('anchorRefDomains')}</TH>
                  </tr></thead>
                  <tbody>
                    {dfs.top_anchors.slice(0, 15).map((a, i) => (
                      <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-surface-muted/50 transition-colors">
                        <TD className="font-medium text-ink max-w-[250px] truncate">{a.anchor || '(empty)'}</TD>
                        <TD right className="text-ink-600">{fmt(a.backlinks)}</TD>
                        <TD right className="text-ink-600">{fmt(a.referring_domains)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ═══ 9 · TECH INFO (3-col compact) ═══════════════════════ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {whois && (
              <Section title={t('whoisInfo')} icon={FileText} color="text-orange-600">
                <dl className="space-y-3">
                  {whois.created_datetime && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('domainCreated')}</dt>
                      <dd className="text-sm font-medium text-ink">{new Date(whois.created_datetime).toLocaleDateString(locale)}</dd>
                    </div>
                  )}
                  {whois.expiration_datetime && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('domainExpires')}</dt>
                      <dd className="text-sm font-medium text-ink">{new Date(whois.expiration_datetime).toLocaleDateString(locale)}</dd>
                    </div>
                  )}
                  {whois.registrar && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-xs text-ink-400 shrink-0">{t('domainRegistrar')}</dt>
                      <dd className="text-sm font-medium text-ink truncate">{whois.registrar}</dd>
                    </div>
                  )}
                  {domainAge && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('domainAge')}</dt>
                      <dd className="text-sm font-medium text-ink">{domainAge}</dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}

            {bl.server_info && (
              <Section title={t('serverInfo')} icon={Server} color="text-ink-500">
                <dl className="space-y-3">
                  {bl.server_info.cms && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('cms')}</dt>
                      <dd className="text-sm font-medium text-ink">{bl.server_info.cms}</dd>
                    </div>
                  )}
                  {bl.server_info.server && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('server')}</dt>
                      <dd className="text-sm font-medium text-ink">{bl.server_info.server}</dd>
                    </div>
                  )}
                  {bl.server_info.ip_address && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('ipAddress')}</dt>
                      <dd className="text-xs font-medium text-ink font-mono">{bl.server_info.ip_address}</dd>
                    </div>
                  )}
                  {bl.server_info.country && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-ink-400">{t('country')}</dt>
                      <dd className="text-sm font-medium text-ink">{bl.server_info.country}</dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}

            {dfs?.technologies?.technologies && Object.keys(dfs.technologies.technologies).length > 0 && (
              <Section title={t('technologies')} icon={Code2} color="text-cyan-600">
                <div className="space-y-3">
                  {Object.entries(dfs.technologies.technologies).slice(0, 6).map(([cat, names]) => (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-1.5">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(names) ? names : [names]).map((name, i) => (
                          <span key={i} className="badge bg-cyan-50 text-cyan-700 border border-cyan-200 text-[11px]">{name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* ═══ 10 · EDU/GOV LINKS ════════════════════════════════ */}
          {dm && (dm.edu_backlinks > 0 || dm.gov_backlinks > 0) && (
            <Section title={t('eduGovLinks')} icon={GraduationCap} color="text-blue-700">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: t('eduBacklinks'), value: dm.edu_backlinks },
                  { label: t('govBacklinks'), value: dm.gov_backlinks },
                  { label: t('eduRefDomains'), value: dm.edu_referring },
                  { label: t('govRefDomains'), value: dm.gov_referring },
                ].filter(d => d.value > 0).map(d => (
                  <div key={d.label} className="rounded-xl p-3 bg-cream-50 border border-cream-200 text-center">
                    <p className="text-[11px] text-ink-300 mb-1">{d.label}</p>
                    <p className="text-lg font-bold text-ink">{fmt(d.value)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ═══ 11 · SOCIAL + CONTACT (compact inline) ═════════════ */}
          {dfs?.technologies && (dfs.technologies.social_graph_urls?.length > 0 || dfs.technologies.emails?.length > 0 || dfs.technologies.phone_numbers?.length > 0) && (
            <Section>
              <div className="flex flex-wrap gap-6">
                {dfs.technologies.social_graph_urls?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2">{t('socialProfiles')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dfs.technologies.social_graph_urls.map((url, i) => {
                        let name;
                        try { name = new URL(url).hostname.replace('www.', ''); } catch { name = url; }
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="badge bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors">
                            <ExternalLink className="h-3 w-3" />{name}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(dfs.technologies.emails?.length > 0 || dfs.technologies.phone_numbers?.length > 0) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-2">{t('contactInfo')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dfs.technologies.emails?.map((email, i) => (
                        <span key={`e${i}`} className="badge bg-sky-50 text-sky-700 border border-sky-200">
                          <Mail className="h-3 w-3" />{email}
                        </span>
                      ))}
                      {dfs.technologies.phone_numbers?.map((phone, i) => (
                        <span key={`p${i}`} className="badge bg-sky-50 text-sky-700 border border-sky-200">
                          <Phone className="h-3 w-3" />{phone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ═══ ANALYSIS FOOTER ═════════════════════════════════════ */}
          {analysis?.status === 'completed' && (
            <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-ink-300 px-1">
              {analysis.niche && <span>{t('nicheDetected')}: <strong className="text-ink-500">{analysis.niche}</strong></span>}
              {analysis.pages_crawled > 0 && <span>{t('pagesCrawled')}: <strong className="text-ink-500">{analysis.pages_crawled}</strong></span>}
              <span>{t('method')}: <strong className="text-ink-500">
                {analysis.analysis_method === 'fast_fallback' ? t('methodFastFallback') : analysis.analysis_method === 'ai' ? t('methodAI') : analysis.analysis_method ?? '--'}
              </strong></span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
