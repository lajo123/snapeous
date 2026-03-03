import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LANG_DATE_LOCALES } from '@/i18n';
import {
  Globe, Target, Key, ExternalLink, Loader, Link2,
  Search, Anchor, TrendingUp, Shield, BarChart3, Users,
  AlertTriangle, Server, MapPin, Tag, Layers, ArrowUpRight,
  Zap, Eye, GraduationCap, Landmark, Network, Hash,
  Calendar, Clock, DollarSign, Mail, Phone, Code2, Share2,
  History, Trophy, FileText,
} from 'lucide-react';

/* ── Reusable card helpers ─────────────────────────────────────────── */

const MetricCard = ({ icon: Icon, color, label, value, sub }) => (
  <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
    <div className="flex items-center gap-2 mb-1.5">
      <Icon className={`h-4 w-4 ${color}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{label}</p>
    </div>
    <p className="text-2xl font-bold text-ink">{value ?? '--'}</p>
    {sub && <p className="text-xs text-ink-300 mt-0.5">{sub}</p>}
  </div>
);

const SectionTitle = ({ icon: Icon, color, children }) => (
  <div className="flex items-center gap-2.5 mb-5">
    {Icon && <Icon className={`h-5 w-5 ${color || 'text-ink-400'}`} />}
    <h2 className="text-base font-bold text-ink">{children}</h2>
  </div>
);

const BarRow = ({ label, value, max, color = 'bg-brand-500' }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 truncate text-ink-400 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-cream-50 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right font-medium text-ink tabular-nums shrink-0">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────────────── */

export default function ProjectDetail() {
  const { id, lang } = useParams();
  const { t } = useTranslation('dashboard');
  const locale = LANG_DATE_LOCALES[lang] || 'en-US';
  const fmt = (v) => (v != null ? Number(v).toLocaleString(locale) : '--');

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader className="h-8 w-8 text-brand-500 animate-spin" /></div>;
  if (isError || !project) return <div className="text-center py-16"><p className="text-ink-400">{t('projectNotFound')}</p></div>;

  const analysis = project.site_analysis;
  const dm = analysis?.domain_metrics;
  const dfs = analysis?.dataforseo_metrics;

  const keywordsCount = analysis?.keywords?.length ?? project.keywords?.length ?? 0;
  const anchorsCount = analysis?.suggested_anchors?.length ?? project.anchors?.length ?? 0;
  const spotsCount = project.spots_count ?? 0;
  const backlinksCount = project.backlinks_count ?? 0;
  const searchesCount = project.searches_count ?? 0;
  const targetPagesCount = analysis?.target_pages?.length ?? 0;

  const statCards = [
    { label: t('stat.spots'), value: spotsCount, icon: Target, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: t('stat.backlinks'), value: backlinksCount, icon: Link2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('stat.searches'), value: searchesCount, icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('stat.keywords'), value: keywordsCount, icon: Key, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: t('stat.anchors'), value: anchorsCount, icon: Anchor, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: t('stat.targetPages'), value: targetPagesCount, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  const hasAnyMetrics = dm || dfs;

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{project.name}</h1>
          {project.niche && <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{project.niche}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-ink-400">
          <Globe className="h-4 w-4" />
          <span>{project.client_domain}</span>
          <a href={`https://${project.client_domain}`} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-700 transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </div>

      {/* ── Domain Metrics (DA, PA, TF, CF, Spam) ──────────────────── */}
      {dm && (
        <div className="card p-7">
          <SectionTitle icon={Shield} color="text-brand-600">{t('domainMetrics')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard icon={Shield} color="text-brand-600" label={t('domainRank')} value={dm.domain_rank ?? '--'} />
            <MetricCard icon={BarChart3} color="text-blue-600" label={t('urlRank')} value={dm.url_rank ?? '--'} />
            <MetricCard icon={Link2} color="text-violet-600" label="Backlinks" value={dm.backlinks_count != null ? fmt(dm.backlinks_count) : '--'} />
            <MetricCard icon={Users} color="text-amber-600" label={t('refDomains')} value={dm.referring_domains != null ? fmt(dm.referring_domains) : '--'} />
            <MetricCard
              icon={TrendingUp} color="text-rose-600" label={t('dofollow')}
              value={(() => { const df = Number(dm.dofollow_backlinks || 0); const nf = Number(dm.nofollow_backlinks || 0); const total = df + nf; return total > 0 ? `${Math.round((df / total) * 100)}%` : '--'; })()}
            />
          </div>
        </div>
      )}

      {/* ── Trust & Authority (CF, TF, Moz Rank, Moz Trust, Spam) ── */}
      {dm && (dm.citation_flow != null || dm.trust_flow != null || dm.moz_rank != null) && (
        <div className="card p-7">
          <SectionTitle icon={Zap} color="text-emerald-600">{t('trustAuthority')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard icon={TrendingUp} color="text-emerald-600" label={t('citationFlow')} value={dm.citation_flow ?? '--'} />
            <MetricCard icon={Shield} color="text-teal-600" label={t('trustFlow')} value={dm.trust_flow ?? '--'} />
            <MetricCard icon={BarChart3} color="text-indigo-600" label={t('mozRank')} value={dm.moz_rank ?? '--'} />
            <MetricCard icon={Shield} color="text-sky-600" label={t('mozTrust')} value={dm.moz_trust ?? '--'} />
            <MetricCard
              icon={AlertTriangle}
              color={dm.moz_spam_score > 5 ? 'text-red-600' : 'text-green-600'}
              label={t('spamScore')}
              value={dm.moz_spam_score != null ? `${dm.moz_spam_score}/17` : '--'}
            />
          </div>
        </div>
      )}

      {/* ── Quick stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between mb-4"><div className={cn('rounded-xl p-2.5', bg)}><Icon className={cn('h-5 w-5', color)} /></div></div>
            <p className="text-3xl font-bold tracking-tight text-ink">{value}</p>
            <p className="mt-1 text-sm text-ink-400">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Backlink Profile (DataForSEO) ──────────────────────────── */}
      {dfs && (
        <div className="card p-7">
          <SectionTitle icon={Link2} color="text-blue-600">{t('backlinkProfile')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <MetricCard icon={Link2} color="text-blue-600" label={t('totalBacklinks')} value={fmt(dfs.backlinks)} />
            <MetricCard icon={Users} color="text-violet-600" label={t('refDomains')} value={fmt(dfs.referring_domains)} />
            <MetricCard icon={Users} color="text-indigo-600" label={t('refMainDomains')} value={fmt(dfs.referring_main_domains)} />
            <MetricCard icon={Network} color="text-cyan-600" label={t('refIPs')} value={fmt(dfs.referring_ips)} />
            <MetricCard icon={Layers} color="text-teal-600" label={t('refSubnets')} value={fmt(dfs.referring_subnets)} />
            <MetricCard icon={Eye} color="text-amber-600" label={t('refPages')} value={fmt(dfs.referring_pages)} />
            <MetricCard icon={AlertTriangle} color="text-red-500" label={t('brokenBacklinks')} value={fmt(dfs.broken_backlinks)} />
            <MetricCard icon={AlertTriangle} color="text-orange-500" label={t('brokenPages')} value={fmt(dfs.broken_pages)} />
            <MetricCard icon={ArrowUpRight} color="text-emerald-600" label={t('internalLinks')} value={fmt(dfs.internal_links_count)} />
            <MetricCard icon={ExternalLink} color="text-rose-600" label={t('externalLinks')} value={fmt(dfs.external_links_count)} />
          </div>

          {/* Spam score bar */}
          {dfs.backlinks_spam_score != null && (
            <div className="mt-5 rounded-xl p-4 bg-cream-50 border border-cream-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('spamScore')} (DataForSEO)</p>
                <p className="text-sm font-bold text-ink">{dfs.backlinks_spam_score}%</p>
              </div>
              <div className="h-2 rounded-full bg-cream-50 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', dfs.backlinks_spam_score > 30 ? 'bg-red-500' : dfs.backlinks_spam_score > 10 ? 'bg-amber-500' : 'bg-green-500')}
                  style={{ width: `${Math.min(100, dfs.backlinks_spam_score)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edu & Gov Links ────────────────────────────────────────── */}
      {dm && (dm.edu_backlinks > 0 || dm.gov_backlinks > 0 || dm.edu_referring > 0 || dm.gov_referring > 0) && (
        <div className="card p-7">
          <SectionTitle icon={GraduationCap} color="text-blue-700">{t('eduGovLinks')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard icon={GraduationCap} color="text-blue-700" label={t('eduBacklinks')} value={fmt(dm.edu_backlinks)} />
            <MetricCard icon={Landmark} color="text-red-700" label={t('govBacklinks')} value={fmt(dm.gov_backlinks)} />
            <MetricCard icon={GraduationCap} color="text-blue-500" label={t('eduRefDomains')} value={fmt(dm.edu_referring)} />
            <MetricCard icon={Landmark} color="text-red-500" label={t('govRefDomains')} value={fmt(dm.gov_referring)} />
          </div>
        </div>
      )}

      {/* ── Link Distribution (types, attributes, platforms, positions) */}
      {dfs && (dfs.referring_links_types || dfs.referring_links_attributes || dfs.referring_links_platform_types) && (
        <div className="card p-7">
          <SectionTitle icon={Layers} color="text-violet-600">{t('linkDistribution')}</SectionTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Link Types */}
            {dfs.referring_links_types && Object.keys(dfs.referring_links_types).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('linkTypes')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_types)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .map(([key, val]) => (
                      <BarRow key={key} label={key} value={val} max={dfs.backlinks || 1} color="bg-violet-500" />
                    ))}
                </div>
              </div>
            )}

            {/* Attributes (dofollow, nofollow, etc.) */}
            {dfs.referring_links_attributes && Object.keys(dfs.referring_links_attributes).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('linkAttributes')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_attributes)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .map(([key, val]) => (
                      <BarRow key={key} label={key} value={val} max={dfs.backlinks || 1} color="bg-blue-500" />
                    ))}
                </div>
              </div>
            )}

            {/* Platform Types */}
            {dfs.referring_links_platform_types && Object.keys(dfs.referring_links_platform_types).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('platformTypes')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_platform_types)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .map(([key, val]) => (
                      <BarRow key={key} label={key} value={val} max={dfs.backlinks || 1} color="bg-emerald-500" />
                    ))}
                </div>
              </div>
            )}

            {/* Semantic Locations */}
            {dfs.referring_links_semantic_locations && Object.keys(dfs.referring_links_semantic_locations).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('semanticLocations')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_semantic_locations)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .map(([key, val]) => (
                      <BarRow key={key} label={key} value={val} max={dfs.backlinks || 1} color="bg-amber-500" />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Geographic Distribution (countries + TLDs) ─────────────── */}
      {dfs && (dfs.referring_links_countries || dfs.referring_links_tld) && (
        <div className="card p-7">
          <SectionTitle icon={MapPin} color="text-rose-600">{t('geographicDistribution')}</SectionTitle>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Top Countries */}
            {dfs.referring_links_countries && Object.keys(dfs.referring_links_countries).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('topCountries')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_countries)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .slice(0, 10)
                    .map(([key, val]) => {
                      const maxVal = Math.max(...Object.values(dfs.referring_links_countries));
                      return <BarRow key={key} label={key} value={val} max={maxVal} color="bg-rose-500" />;
                    })}
                </div>
              </div>
            )}

            {/* Top TLDs */}
            {dfs.referring_links_tld && Object.keys(dfs.referring_links_tld).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('topTLDs')}</p>
                <div className="space-y-2.5">
                  {Object.entries(dfs.referring_links_tld)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .slice(0, 10)
                    .map(([key, val]) => {
                      const maxVal = Math.max(...Object.values(dfs.referring_links_tld));
                      return <BarRow key={key} label={key} value={val} max={maxVal} color="bg-indigo-500" />;
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Topic Categories (Majestic) ────────────────────────────── */}
      {dm?.topic_categories?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Tag} color="text-purple-600">{t('topicCategories')}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dm.topic_categories.map((topic, i) => (
              <div key={i} className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-sm font-bold text-ink">{topic.name}</p>
                {topic.value != null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-ink-300 mb-1">
                      <span>Relevance</span>
                      <span>{topic.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream-50 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, topic.value)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Server Info (DataForSEO) ───────────────────────────────── */}
      {dfs?.server_info && (dfs.server_info.cms || dfs.server_info.server || dfs.server_info.ip_address) && (
        <div className="card p-7">
          <SectionTitle icon={Server} color="text-ink-500">{t('serverInfo')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {dfs.server_info.cms && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('cms')}</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{dfs.server_info.cms}</p>
              </div>
            )}
            {dfs.server_info.server && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('server')}</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{dfs.server_info.server}</p>
              </div>
            )}
            {dfs.server_info.ip_address && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('ipAddress')}</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{dfs.server_info.ip_address}</p>
              </div>
            )}
            {dfs.server_info.country && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('country')}</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{dfs.server_info.country}</p>
              </div>
            )}
          </div>
          {dfs.server_info.target_spam_score != null && (
            <div className="mt-4 rounded-xl p-4 bg-cream-50 border border-cream-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('spamScore')} (Target)</p>
                <p className="text-sm font-bold text-ink">{dfs.server_info.target_spam_score}%</p>
              </div>
              <div className="h-2 rounded-full bg-cream-50 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', dfs.server_info.target_spam_score > 30 ? 'bg-red-500' : dfs.server_info.target_spam_score > 10 ? 'bg-amber-500' : 'bg-green-500')}
                  style={{ width: `${Math.min(100, dfs.server_info.target_spam_score)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WHOIS / Domain Information ──────────────────────────────── */}
      {dfs?.whois && (
        <div className="card p-7">
          <SectionTitle icon={FileText} color="text-orange-600">{t('whoisInfo')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dfs.whois.created_datetime && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('domainCreated')}</p>
                </div>
                <p className="text-sm font-bold text-ink">
                  {new Date(dfs.whois.created_datetime).toLocaleDateString(locale)}
                </p>
              </div>
            )}
            {dfs.whois.expiration_datetime && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="h-4 w-4 text-red-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('domainExpires')}</p>
                </div>
                <p className="text-sm font-bold text-ink">
                  {new Date(dfs.whois.expiration_datetime).toLocaleDateString(locale)}
                </p>
              </div>
            )}
            {dfs.whois.registrar && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('domainRegistrar')}</p>
                </div>
                <p className="text-sm font-bold text-ink truncate" title={dfs.whois.registrar}>{dfs.whois.registrar}</p>
              </div>
            )}
            {dfs.whois.created_datetime && (() => {
              const created = new Date(dfs.whois.created_datetime);
              const now = new Date();
              const diffMs = now - created;
              const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
              const yrs = Math.floor(totalMonths / 12);
              const mos = totalMonths % 12;
              return (
                <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('domainAge')}</p>
                  </div>
                  <p className="text-sm font-bold text-ink">
                    {yrs > 0 && `${yrs} ${t('years')}`}{yrs > 0 && mos > 0 && ' '}{mos > 0 && `${mos} ${t('months')}`}
                    {yrs === 0 && mos === 0 && '< 1 ' + t('months')}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Organic Traffic & SERP Positions ──────────────────────────── */}
      {dfs?.whois && (dfs.whois.organic_etv != null || dfs.whois.organic_count != null) && (
        <div className="card p-7">
          <SectionTitle icon={TrendingUp} color="text-green-600">{t('organicTraffic')}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-6">
            <MetricCard icon={Eye} color="text-green-600" label={t('organicTraffic')} value={fmt(dfs.whois.organic_etv)} />
            <MetricCard icon={Key} color="text-blue-600" label={t('organicKeywords')} value={fmt(dfs.whois.organic_count)} />
            <MetricCard icon={DollarSign} color="text-amber-600" label={t('organicTrafficCost')} value={dfs.whois.organic_estimated_paid_traffic_cost != null ? `$${fmt(dfs.whois.organic_estimated_paid_traffic_cost)}` : '--'} />
          </div>
          {(dfs.whois.organic_pos_1 != null || dfs.whois.organic_pos_2_3 != null) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-3">{t('serpPositions')}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: t('pos1'), value: dfs.whois.organic_pos_1, color: 'bg-green-500' },
                  { label: t('pos2_3'), value: dfs.whois.organic_pos_2_3, color: 'bg-emerald-500' },
                  { label: t('pos4_10'), value: dfs.whois.organic_pos_4_10, color: 'bg-blue-500' },
                  { label: t('pos11_20'), value: dfs.whois.organic_pos_11_20, color: 'bg-violet-500' },
                  { label: t('pos21_30'), value: dfs.whois.organic_pos_21_30, color: 'bg-gray-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 bg-cream-50 border border-cream-200 text-center">
                    <p className="text-xs font-semibold text-ink-300 mb-1">{label}</p>
                    <p className="text-xl font-bold text-ink">{fmt(value)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-cream-50 overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.round(((value || 0) / Math.max(1, (dfs.whois.organic_count || 1))) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Technologies ─────────────────────────────────────────────── */}
      {dfs?.technologies?.technologies && Object.keys(dfs.technologies.technologies).length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Code2} color="text-cyan-600">{t('technologies')}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(dfs.technologies.technologies).map(([category, names]) => (
              <div key={category} className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-2">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(names) ? names : [names]).map((name, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Social Profiles ──────────────────────────────────────────── */}
      {dfs?.technologies?.social_graph_urls?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Share2} color="text-pink-600">{t('socialProfiles')}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {dfs.technologies.social_graph_urls.map((url, i) => {
              let name;
              try { name = new URL(url).hostname.replace('www.', ''); } catch { name = url; }
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 border border-pink-200 px-3 py-1.5 text-xs font-medium text-pink-700 hover:bg-pink-100 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  {name}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Contact Info ──────────────────────────────────────────────── */}
      {dfs?.technologies && (dfs.technologies.emails?.length > 0 || dfs.technologies.phone_numbers?.length > 0) && (
        <div className="card p-7">
          <SectionTitle icon={Mail} color="text-sky-600">{t('contactInfo')}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dfs.technologies.emails?.length > 0 && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">Emails</p>
                </div>
                <div className="space-y-1">
                  {dfs.technologies.emails.map((email, i) => (
                    <p key={i} className="text-sm text-ink">{email}</p>
                  ))}
                </div>
              </div>
            )}
            {dfs.technologies.phone_numbers?.length > 0 && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-sky-600" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">Phone</p>
                </div>
                <div className="space-y-1">
                  {dfs.technologies.phone_numbers.map((phone, i) => (
                    <p key={i} className="text-sm text-ink">{phone}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top Anchors ──────────────────────────────────────────────── */}
      {dfs?.top_anchors?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Anchor} color="text-rose-600">{t('topAnchors')}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchor')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchorBacklinks')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchorRefDomains')}</th>
                </tr>
              </thead>
              <tbody>
                {dfs.top_anchors.map((a, i) => (
                  <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-ink max-w-xs truncate" title={a.anchor}>{a.anchor || '(empty)'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(a.backlinks)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(a.referring_domains)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Top Referring Domains ─────────────────────────────────────── */}
      {dfs?.top_referring_domains?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Globe} color="text-indigo-600">{t('topReferringDomains')}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('domain')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('rank')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('anchorBacklinks')}</th>
                </tr>
              </thead>
              <tbody>
                {dfs.top_referring_domains.map((d, i) => (
                  <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-ink">{d.domain}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(d.rank)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(d.backlinks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Backlink History ──────────────────────────────────────────── */}
      {dfs?.history?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={History} color="text-teal-600">{t('backlinkHistory')}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('date')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">Backlinks</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('newBacklinks')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('lostBacklinks')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('refDomains')}</th>
                </tr>
              </thead>
              <tbody>
                {dfs.history.map((h, i) => (
                  <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                    <td className="py-2.5 px-3 text-ink">{h.date ? new Date(h.date).toLocaleDateString(locale, { year: 'numeric', month: 'short' }) : '--'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(h.backlinks)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-green-600 font-medium">{h.new_backlinks > 0 ? `+${fmt(h.new_backlinks)}` : '0'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-red-500 font-medium">{h.lost_backlinks > 0 ? `-${fmt(h.lost_backlinks)}` : '0'}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(h.referring_domains)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Competitors ──────────────────────────────────────────────── */}
      {dfs?.competitors?.length > 0 && (
        <div className="card p-7">
          <SectionTitle icon={Trophy} color="text-amber-600">{t('competitors')}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('competitorDomain')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('competitorRank')}</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wider text-ink-300">{t('sharedBacklinks')}</th>
                </tr>
              </thead>
              <tbody>
                {dfs.competitors.map((c, i) => (
                  <tr key={i} className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-ink">{c.domain}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(c.rank)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-ink-600">{fmt(c.intersections)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Analysis Summary ───────────────────────────────────────── */}
      {analysis && analysis.status === 'completed' && (
        <div className="card p-7">
          <SectionTitle icon={BarChart3} color="text-ink-500">{t('analysisSummary')}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {analysis.niche && (
              <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('nicheDetected')}</p>
                <p className="mt-1.5 text-sm font-bold text-ink">{analysis.niche}</p>
              </div>
            )}
            <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('pagesCrawled')}</p>
              <p className="mt-1.5 text-sm font-bold text-ink">{analysis.pages_crawled ?? 0}</p>
            </div>
            <div className="rounded-xl p-4 bg-cream-50 border border-cream-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">{t('method')}</p>
              <p className="mt-1.5 text-sm font-bold text-ink">
                {analysis.analysis_method === 'fast_fallback' ? t('methodFastFallback') : analysis.analysis_method === 'ai' ? t('methodAI') : analysis.analysis_method ?? '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Analyzing spinner ──────────────────────────────────────── */}
      {analysis?.status === 'analyzing' && (
        <div className="card px-6 py-12 text-center">
          <Loader className="h-10 w-10 text-brand-500 animate-spin mx-auto" />
          <h3 className="mt-4 text-base font-bold text-ink">{t('analyzing')}</h3>
          <p className="mt-2 text-sm text-ink-400">{analysis.progress || t('analyzingDesc')}</p>
        </div>
      )}
    </div>
  );
}
