import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Upload, Clock, ArrowRight, ArrowLeft, Check, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STRATEGIES = [
  {
    id: 'auto',
    icon: Sparkles,
    premium: true,
    titleKey: 'autoTitle',
    descKey: 'autoDesc',
  },
  {
    id: 'manual',
    icon: Upload,
    premium: false,
    titleKey: 'manualTitle',
    descKey: 'manualDesc',
  },
  {
    id: 'skip',
    icon: Clock,
    premium: false,
    titleKey: 'skipTitle',
    descKey: 'skipDesc',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function StepBacklinks({ formData, updateForm, onNext, onBack, isPaidPlan }) {
  const { t } = useTranslation('onboarding');

  const handleSelect = (strategy) => {
    // Don't allow selecting premium features on free plan
    if (strategy.premium && !isPaidPlan) return;
    updateForm({ backlinkStrategy: strategy.id });
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2 text-center">
          {t('step3.title')}
        </h2>
        <p className="text-sm text-ink-400 mb-8 text-center">
          {t('step3.subtitle')}
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {STRATEGIES.map((strategy) => {
          const isSelected = formData.backlinkStrategy === strategy.id;
          const isLocked = strategy.premium && !isPaidPlan;
          const Icon = strategy.icon;

          return (
            <motion.button
              key={strategy.id}
              variants={cardVariants}
              type="button"
              onClick={() => handleSelect(strategy)}
              whileHover={isLocked ? {} : { y: -2 }}
              whileTap={isLocked ? {} : { scale: 0.98 }}
              className={cn(
                'relative w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-200',
                isLocked
                  ? 'border-cream-200 bg-cream-50/50 cursor-not-allowed opacity-75'
                  : isSelected
                    ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200 shadow-md'
                    : 'border-cream-200 bg-white hover:border-ink-50 hover:shadow-soft'
              )}
              style={isSelected && !isLocked ? { transform: 'perspective(800px) rotateX(-1deg)' } : {}}
            >
              {/* Premium badge */}
              {strategy.premium && (
                <div className={cn(
                  'absolute -top-2.5 right-4 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1',
                  isPaidPlan
                    ? 'bg-brand-500 text-white'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                )}>
                  {isPaidPlan ? (
                    <>
                      <Sparkles className="h-2.5 w-2.5" />
                      {t('step3.autoTag')}
                    </>
                  ) : (
                    <>
                      <Crown className="h-2.5 w-2.5" />
                      {t('step3.premiumTag')}
                    </>
                  )}
                </div>
              )}

              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                isLocked
                  ? 'bg-cream-100 text-ink-300'
                  : isSelected
                    ? 'bg-brand-500 text-white'
                    : 'bg-cream text-ink-400'
              )}>
                {isLocked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-bold',
                  isLocked ? 'text-ink-300' : isSelected ? 'text-brand-800' : 'text-ink'
                )}>
                  {t(`step3.${strategy.titleKey}`)}
                </p>
                <p className={cn(
                  'text-xs mt-0.5 leading-relaxed',
                  isLocked ? 'text-ink-300' : 'text-ink-400'
                )}>
                  {t(`step3.${strategy.descKey}`)}
                </p>
                {isLocked && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    {t('step3.premiumHint')}
                  </p>
                )}
              </div>

              {isSelected && !isLocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-0.5"
                >
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="btn-secondary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('step3.back')}
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex-[2] py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {t('step3.continue')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
