import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import useLocalizedPath from '@/hooks/useLocalizedPath';
import SEOHead from '@/components/SEOHead';
import { SoftwareApplicationSchema, FAQSchema } from '@/components/StructuredData';
import SnapeousLogo from '@/components/SnapeousLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  Shield, Activity, BarChart3, Search, Bell, FileText,
  ArrowRight, Play, ChevronDown, Link2, TrendingUp, TrendingDown,
  Check, AlertTriangle, ExternalLink, Eye, Zap, PieChart, Sparkles,
  Menu, X,
} from 'lucide-react';

const FEATURE_ICONS = [Activity, BarChart3, Shield, Zap, PieChart, Bell];
const TESTIMONIAL_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
];

const PRICING_META = [
  { id: 'free', monthlyPrice: 0, annualPrice: 0 },
  { id: 'starter', monthlyPrice: 19, annualPrice: 15 },
  { id: 'pro', monthlyPrice: 49, annualPrice: 39, recommended: true },
  { id: 'agency', monthlyPrice: 99, annualPrice: 79 },
];

/* ── tiny helpers ────────────────────────────────────────────── */

function StarIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}


/* ══════════════════════════════════════════════════════════════ */

export default function Landing() {
  const { user } = useAuth();
  const { t } = useTranslation('landing');
  const lp = useLocalizedPath();
  const [openFaq, setOpenFaq] = useState(null);
  const [pricingInterval, setPricingInterval] = useState('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const faqId = useId();

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const features = t('features.items', { returnObjects: true });
  const steps = t('howItWorks.steps', { returnObjects: true });
  const testimonials = t('testimonials.items', { returnObjects: true });
  const faqs = t('faq.items', { returnObjects: true });
  const plans = t('pricing.plans', { returnObjects: true });

  return (
    <div className="grain-bg text-ink antialiased min-h-screen flex flex-col relative overflow-x-hidden">
      <SEOHead pageKey="landing" />
      <SoftwareApplicationSchema />
      {Array.isArray(faqs) && faqs.length > 0 && (
        <FAQSchema items={faqs.map(f => ({ question: f.q, answer: f.a }))} />
      )}
      {/* ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-200/30 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-60 right-0 w-[400px] h-[400px] bg-cream-200/50 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ─── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <SnapeousLogo className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Snapeous</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-400">
            <a href="#features" className="hover:text-ink transition-colors">{t('nav.features')}</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">{t('nav.howItWorks')}</a>
            <a href="#pricing" className="hover:text-ink transition-colors">{t('nav.pricing')}</a>
            <a href="#faq" className="hover:text-ink transition-colors">{t('nav.faq')}</a>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link to={lp('/dashboard')} className="bg-brand-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-500/20 hover:-translate-y-0.5">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link to={lp('/login')} className="text-sm font-medium hidden md:block hover:opacity-70 transition-opacity">{t('nav.login')}</Link>
                <Link to={lp('/register')} className="bg-brand-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-500/20 hover:-translate-y-0.5 hidden sm:inline-flex">
                  {t('nav.freeTrial')}
                </Link>
              </>
            )}
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── MOBILE MENU ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-16 inset-x-0 bg-cream border-b border-cream-200 shadow-xl px-6 py-6 flex flex-col gap-2">
            {[
              { href: '#features', label: t('nav.features') },
              { href: '#how-it-works', label: t('nav.howItWorks') },
              { href: '#pricing', label: t('nav.pricing') },
              { href: '#faq', label: t('nav.faq') },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-ink-700 py-3 px-4 rounded-xl hover:bg-white/60 transition-colors"
              >
                {label}
              </a>
            ))}
            <hr className="border-cream-200 my-2" />
            {user ? (
              <Link to={lp('/dashboard')} onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to={lp('/register')} onClick={() => setMobileMenuOpen(false)} className="btn-primary text-center">
                  {t('nav.freeTrial')}
                </Link>
                <Link to={lp('/login')} onClick={() => setMobileMenuOpen(false)} className="text-center text-sm font-medium text-ink-400 py-2">
                  {t('nav.login')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── HERO ───────────────────────────────────────────────── */}
      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 border border-brand-200/50 text-xs font-medium text-brand-700 mb-8 shadow-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            {t('hero.badge')}
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            {t('hero.titleLine1')}{' '}<br className="hidden md:block" />
            <span className="text-gradient">{t('hero.titleHighlight')}</span>{t('hero.titleLine2')}
          </h1>

          <p className="text-lg md:text-xl text-ink-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            {t('hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to={lp('/register')} className="w-full sm:w-auto bg-brand-600 text-white text-base font-medium px-8 py-3.5 rounded-full hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-500/25 hover:-translate-y-1 flex items-center justify-center gap-2">
              {t('hero.cta')}
              <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto glass text-ink text-base font-medium px-8 py-3.5 rounded-full hover:bg-white/60 transition-all flex items-center justify-center gap-2">
              <Play size={16} />
              {t('hero.demo')}
            </a>
          </div>

          {/* ─── DASHBOARD MOCKUP ──────────────────────────────── */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-cream-100 via-transparent to-transparent z-10 top-1/2" />
            <div className="glass rounded-2xl md:rounded-[2rem] p-2 shadow-2xl">
              <div className="bg-white/70 backdrop-blur-xl rounded-xl md:rounded-[1.5rem] border border-cream-200 overflow-hidden shadow-inner">
                <div className="h-11 border-b border-cream-200 flex items-center px-4 justify-between bg-white/40">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                  </div>
                  <div className="text-xs font-medium text-ink-300">app.snapeous.io/dashboard</div>
                  <div className="w-8" />
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
                  <div className="col-span-1 space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-cream-200 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-1 flex items-center justify-between">
                        {t('mockup.activeBacklinks')}
                        <Link2 size={14} className="text-ink-300" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">2 847</div>
                      <div className="text-xs font-medium text-brand-600 mt-2 flex items-center gap-1">
                        <TrendingUp size={12} />
                        {t('mockup.thisWeek')}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-cream-200 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-1 flex items-center justify-between">
                        {t('mockup.healthScore')}
                        <Shield size={14} className="text-ink-300" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-brand-600">87<span className="text-base text-ink-300 font-medium">/100</span></div>
                      <div className="w-full bg-cream-200 rounded-full h-1.5 mt-2">
                        <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '87%' }} />
                      </div>
                    </div>
                    <div className="bg-navy-600 text-white rounded-xl p-4 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 blur-xl rounded-full translate-x-8 -translate-y-8" />
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-1 flex items-center justify-between">
                        {t('mockup.avgDA')}
                        <BarChart3 size={14} className="text-white/40" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight">42.5</div>
                      <div className="text-xs text-white/50 mt-1">{t('mockup.avgDR')} : 38.2</div>
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                      <div className="text-sm font-semibold tracking-tight">{t('mockup.recentBacklinks')}</div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-300">DA</div>
                    </div>
                    {[
                      { name: 'journaldunet.com/seo/...', meta: 'Dofollow · Ancre : "outil SEO"', da: 'DA 89', status: 'live', Icon: ExternalLink, iconColor: 'bg-brand-50 text-brand-600' },
                      { name: 'webmarketing-com.com/...', meta: 'Dofollow · Ancre : marque', da: 'DA 72', status: 'live', Icon: ExternalLink, iconColor: 'bg-blue-50 text-blue-600' },
                      { name: 'blog.hubspot.fr/...', meta: 'Nofollow · Ancre : URL', da: 'DA 91', status: 'lost', Icon: AlertTriangle, iconColor: 'bg-red-50 text-red-500' },
                    ].map((row, i) => (
                      <div key={i} className={`px-5 py-3 ${i < 2 ? 'border-b border-cream-200/60' : ''} flex items-center justify-between hover:bg-cream-50 transition-colors`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${row.iconColor} flex items-center justify-center`}>
                            <row.Icon size={16} />
                          </div>
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {row.name}
                              {row.status === 'lost' && (
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">{t('mockup.lost')}</span>
                              )}
                            </div>
                            <div className="text-xs text-ink-300">{row.meta}</div>
                          </div>
                        </div>
                        <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${row.status === 'lost' ? 'text-red-600 bg-red-50' : 'text-brand-700 bg-brand-50'}`}>{row.da}</div>
                      </div>
                    ))}
                    <div className="px-5 py-3 bg-cream-50 border-t border-cream-200/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-300">{t('mockup.dofollowNofollow')}</span>
                        <span className="font-semibold text-brand-600 flex items-center gap-1 cursor-pointer hover:text-brand-700 transition-colors">
                          {t('mockup.viewAll')} <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── SOCIAL PROOF ───────────────────────────────────────── */}
      <section className="py-16 border-t border-cream-200/50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-8">{t('socialProof.title')}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {[
              { val: '500+', label: t('socialProof.stat1') },
              { val: '+35', label: t('socialProof.stat2') },
              { val: '2M+', label: t('socialProof.stat3') },
              { val: '99.9%', label: t('socialProof.stat4') },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 min-w-[120px]">
                <span className="text-2xl font-bold tracking-tight text-brand-700">{val}</span>
                <span className="text-xs text-ink-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────────────────── */}
      <section id="features" className="py-24 relative">
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-brand-100/30 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-3">{t('features.sectionLabel')}</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('features.title')}</h2>
            <p className="text-ink-400 font-medium max-w-xl mx-auto text-base leading-relaxed">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.isArray(features) && features.map((feat, i) => {
              const Icon = FEATURE_ICONS[i] || Shield;
              return (
                <div key={i} className="glass p-8 rounded-3xl hover:bg-white/60 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-cream-200 flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                    <Icon size={20} className="text-brand-600" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight mb-2">{feat.title}</h3>
                  <p className="text-sm text-ink-400 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cream-200/40 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-3">{t('howItWorks.sectionLabel')}</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('howItWorks.title')}</h2>
            <p className="text-ink-400 font-medium max-w-xl mx-auto text-base leading-relaxed">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.isArray(steps) && steps.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg shadow-brand-500/20">{i + 1}</div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">{step.title}</h3>
                <p className="text-sm text-ink-400 leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── KEY METRICS ────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-brand-200/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
              {[
                { val: '2M+', label: t('metrics.backlinkMonitored') },
                { val: '99.9%', label: t('metrics.uptimeMonitoring') },
                { val: '<2s', label: t('metrics.daDrAnalysis') },
                { val: '500+', label: t('metrics.activeProjects') },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-4xl md:text-5xl font-bold tracking-tight text-brand-700">{val}</div>
                  <div className="text-sm text-ink-400 font-medium mt-2">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-3">{t('testimonials.sectionLabel')}</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('testimonials.title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.isArray(testimonials) && testimonials.map((item, i) => {
              const initials = item.name.split(' ').map(w => w[0]).join('');
              const color = TESTIMONIAL_COLORS[i] || TESTIMONIAL_COLORS[0];
              return (
                <div key={i} className="glass p-8 rounded-3xl">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => <StarIcon key={j} />)}
                  </div>
                  <p className="text-sm text-ink-700 leading-relaxed mb-6">&ldquo;{item.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-semibold text-sm`}>{initials}</div>
                    <div>
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-xs text-ink-300">{item.role}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PRICING ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-100/20 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-3">{t('pricing.sectionLabel')}</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('pricing.title')}</h2>
            <p className="text-ink-400 font-medium max-w-xl mx-auto text-base leading-relaxed">{t('pricing.subtitle')}</p>

            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPricingInterval('monthly')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  pricingInterval === 'monthly'
                    ? 'bg-white shadow-sm text-ink'
                    : 'text-ink-400 hover:text-ink'
                )}
              >
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setPricingInterval('annual')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                  pricingInterval === 'annual'
                    ? 'bg-white shadow-sm text-ink'
                    : 'text-ink-400 hover:text-ink'
                )}
              >
                {t('pricing.annual')}
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">{t('pricing.annualDiscount')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {Array.isArray(plans) && plans.map((plan, i) => {
              const meta = PRICING_META[i] || PRICING_META[0];
              const price = pricingInterval === 'annual' ? meta.annualPrice : meta.monthlyPrice;
              const isFree = meta.id === 'free';
              const isRecommended = meta.recommended;

              return (
                <div
                  key={meta.id}
                  className={cn(
                    'relative p-7 rounded-3xl flex flex-col',
                    isRecommended
                      ? 'bg-navy-600 text-white shadow-xl shadow-navy-500/15 ring-1 ring-navy-500 md:-mt-4 md:mb-[-1rem]'
                      : 'glass'
                  )}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md shadow-brand-500/20 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {t('pricing.recommended')}
                    </div>
                  )}

                  <div className={cn('text-sm font-semibold mb-1', isRecommended ? 'text-white/70' : 'text-ink-400')}>
                    {plan.name}
                  </div>
                  <div className="text-4xl font-bold tracking-tight mb-1">
                    {isFree ? t('pricing.free') : `${price}\u20AC`}
                    {!isFree && (
                      <span className={cn('text-lg font-medium', isRecommended ? 'text-white/60' : 'text-ink-300')}>{t('pricing.perMonth')}</span>
                    )}
                  </div>
                  {!isFree && pricingInterval === 'annual' && (
                    <p className="text-[11px] text-brand-400 font-medium mt-0.5">
                      {t('pricing.billedAnnually', { amount: price * 12 })}
                    </p>
                  )}
                  <div className={cn('text-sm mb-5 mt-1', isRecommended ? 'text-white/60' : 'text-ink-300')}>
                    {plan.sub}
                  </div>

                  {!isFree && (
                    <div className={cn(
                      'rounded-lg px-3 py-2 mb-5 flex items-center gap-1.5',
                      isRecommended ? 'bg-white/10 border border-white/10' : 'bg-brand-50/80 border border-brand-100'
                    )}>
                      <Shield className={cn('h-3 w-3', isRecommended ? 'text-white/70' : 'text-brand-600')} />
                      <p className={cn('text-[11px] font-semibold', isRecommended ? 'text-white/80' : 'text-brand-700')}>
                        {t('pricing.trialBadge')}
                      </p>
                    </div>
                  )}

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {Array.isArray(plan.items) && plan.items.map((item, j) => (
                      <li key={j} className={cn('flex items-start gap-2.5 text-sm', isRecommended ? 'text-white/90' : 'text-ink-700')}>
                        <Check size={16} className={cn('mt-0.5 shrink-0', isRecommended ? 'text-navy-200' : 'text-brand-500')} strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={lp('/register')}
                    className={cn(
                      'block text-center text-sm font-semibold px-6 py-3 rounded-full transition-all',
                      isRecommended
                        ? 'bg-white text-navy-600 hover:bg-cream-50 hover:shadow-lg'
                        : isFree
                          ? 'glass text-ink hover:bg-white/60'
                          : 'bg-ink text-white hover:bg-ink-900'
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 relative" aria-labelledby="faq-heading">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-brand-100/20 blur-[120px] rounded-full pointer-events-none -z-10 -translate-y-1/2" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 mb-3">{t('faq.sectionLabel')}</p>
              <h2 id="faq-heading" className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">{t('faq.title')}</h2>
            </div>

            <div className="lg:col-span-3">
              <div className="divide-y divide-cream-200/80" role="list">
                {Array.isArray(faqs) && faqs.map((faq, i) => {
                  const isOpen = openFaq === i;
                  const answerId = `${faqId}-answer-${i}`;
                  return (
                    <div
                      key={i}
                      className={cn('faq-item group', isOpen && 'open')}
                      role="listitem"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="flex items-start justify-between gap-4 w-full text-left py-6"
                        aria-expanded={isOpen}
                        aria-controls={answerId}
                      >
                        <h3 className={cn(
                          'text-base font-semibold transition-colors duration-200',
                          isOpen ? 'text-brand-700' : 'text-ink group-hover:text-brand-600'
                        )}>
                          {faq.q}
                        </h3>
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300',
                          isOpen
                            ? 'bg-brand-600 text-white'
                            : 'bg-cream-200/60 text-ink-300 group-hover:bg-brand-100 group-hover:text-brand-600'
                        )}>
                          <ChevronDown size={14} className="faq-chevron" strokeWidth={2.5} aria-hidden="true" />
                        </div>
                      </button>
                      <div id={answerId} className="faq-answer" role="region" aria-hidden={!isOpen}>
                        <div>
                          <p className="pb-6 text-sm text-ink-400 leading-relaxed pr-12">
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24">
        <div className="bg-navy-600 rounded-[2rem] relative overflow-hidden py-20 px-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-navy-400/30 blur-[80px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-navy-900/30 blur-[60px] rounded-full" />
          <div className="max-w-3xl mx-auto text-center text-white relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('cta.title')}</h2>
            <p className="text-white/70 font-medium max-w-lg mx-auto text-base leading-relaxed mb-10">
              {t('cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={lp('/register')} className="w-full sm:w-auto bg-white text-navy-600 text-base font-semibold px-8 py-3.5 rounded-full hover:bg-cream-50 transition-all hover:shadow-lg flex items-center justify-center gap-2">
                {t('cta.button')}
                <ArrowRight size={16} />
              </Link>
            </div>
            <p className="text-white/50 text-xs mt-6">{t('cta.note')}</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-cream-200/50 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                  <SnapeousLogo className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">Snapeous</span>
              </div>
              <p className="text-sm text-ink-400 leading-relaxed">{t('footer.description')}</p>
            </div>
            {[
              { heading: t('footer.product'), links: [
                { label: t('footer.productLinks.features'), href: '#features' },
                { label: t('footer.productLinks.pricing'), href: '#pricing' },
                { label: t('footer.productLinks.faq'), href: '#faq' },
                { label: t('footer.productLinks.changelog'), href: 'changelog' },
              ]},
              { heading: t('footer.resources'), links: [
                { label: t('footer.resourceLinks.blog'), href: 'blog' },
                { label: t('footer.resourceLinks.apiDocs'), href: 'docs' },
                { label: t('footer.resourceLinks.contact'), href: 'contact' },
              ]},
              { heading: t('footer.legal'), links: [
                { label: t('footer.legalLinks.legalNotice'), href: 'legal-notice' },
                { label: t('footer.legalLinks.privacy'), href: 'privacy' },
                { label: t('footer.legalLinks.terms'), href: 'terms' },
                { label: t('footer.legalLinks.gdpr'), href: 'gdpr' },
              ]},
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-300 mb-4">{heading}</h4>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      {href.startsWith('#') ? (
                        <a href={href} className="text-sm text-ink-400 hover:text-ink transition-colors">{label}</a>
                      ) : (
                        <Link to={href} className="text-sm text-ink-400 hover:text-ink transition-colors">{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-cream-200/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-ink-300">{t('footer.copyright', { year: new Date().getFullYear() })}</div>
            <div className="flex items-center gap-5">
              <LanguageSwitcher />
              <a href="#" className="text-ink-300 hover:text-ink transition-colors" aria-label="Twitter">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="#" className="text-ink-300 hover:text-ink transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
