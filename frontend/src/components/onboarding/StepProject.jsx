import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowRight } from 'lucide-react';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/**
 * Derive a clean project name from a domain string.
 * "www.example.com" → "example.com"
 * "https://my-site.fr/page" → "my-site.fr"
 */
function domainToName(raw) {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/\/.*$/, '');
  d = d.replace(/^www\./, '');
  return d;
}

export default function StepProject({ formData, updateForm, onNext, isFirstProject }) {
  const { t } = useTranslation('onboarding');

  const domainValue = formData.domain.trim();
  const canContinue = domainValue.length > 0;

  const handleDomainChange = (e) => {
    const domain = e.target.value;
    updateForm({ domain, name: domainToName(domain) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canContinue) onNext();
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 w-full max-w-4xl mx-auto px-4">
      {/* Form side */}
      <motion.form
        onSubmit={handleSubmit}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 w-full max-w-md"
      >
        <motion.h2
          variants={itemVariants}
          className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2"
        >
          {isFirstProject ? t('step1.title') : t('step1.titleNext')}
        </motion.h2>
        <motion.p variants={itemVariants} className="text-sm text-ink-400 mb-8">
          {t('step1.subtitle')}
        </motion.p>

        <motion.div variants={itemVariants} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              {t('step1.domainLabel')}
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
              <input
                type="text"
                value={formData.domain}
                onChange={handleDomainChange}
                placeholder={t('step1.domainPlaceholder')}
                className="input w-full pl-10"
                autoFocus
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8">
          <button
            type="submit"
            disabled={!canContinue}
            className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('step1.continue')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.form>

      {/* 3D Preview card */}
      <motion.div
        initial={{ opacity: 0, rotateY: -15, scale: 0.9 }}
        animate={{ opacity: 1, rotateY: -5, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
        whileHover={{ rotateY: 0, scale: 1.02 }}
        className="hidden lg:block flex-shrink-0"
        style={{ perspective: 1000 }}
      >
        <div
          className="w-72 rounded-2xl border border-cream-200 bg-white/90 backdrop-blur-sm shadow-soft-lg p-6 space-y-4"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              {domainValue ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domainValue}&sz=32`}
                  alt=""
                  className="w-5 h-5 rounded"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Globe className="h-5 w-5 text-brand-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">
                {domainToName(formData.domain) || t('step1.domainPlaceholder')}
              </p>
              <p className="text-xs text-ink-300 truncate">
                {domainValue || t('step1.domainPlaceholder')}
              </p>
            </div>
          </div>

          {/* Skeleton preview lines */}
          <div className="space-y-2.5 pt-2">
            <div className="flex gap-2">
              <div className="h-2 rounded-full bg-brand-100 w-1/3" />
              <div className="h-2 rounded-full bg-cream-200 w-1/2" />
            </div>
            <div className="flex gap-2">
              <div className="h-2 rounded-full bg-cream-200 w-2/5" />
              <div className="h-2 rounded-full bg-brand-100 w-1/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-2 rounded-full bg-brand-100 w-1/4" />
              <div className="h-2 rounded-full bg-cream-200 w-1/3" />
            </div>
          </div>

          {/* Fake stats row */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: 'DA', color: 'bg-brand-100 text-brand-700' },
              { label: 'Links', color: 'bg-blue-50 text-blue-700' },
              { label: 'Score', color: 'bg-emerald-50 text-emerald-700' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-lg ${stat.color} px-2 py-1.5 text-center`}>
                <span className="text-[10px] font-bold">{stat.label}</span>
                <div className="h-1.5 rounded-full bg-white/50 mt-1" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-ink-300 text-center pt-1">{t('step1.preview')}</p>
        </div>
      </motion.div>
    </div>
  );
}
