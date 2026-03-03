import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Globe, Languages, Link2, Rocket, ArrowLeft, Check, Loader,
  Sparkles, Upload, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STRATEGY_META = {
  auto: { icon: Sparkles, key: 'strategyAuto' },
  manual: { icon: Upload, key: 'strategyManual' },
  skip: { icon: Clock, key: 'strategySkip' },
};

const LANGUAGE_FLAGS = {
  en: '\u{1F1EC}\u{1F1E7}', fr: '\u{1F1EB}\u{1F1F7}', es: '\u{1F1EA}\u{1F1F8}',
  de: '\u{1F1E9}\u{1F1EA}', it: '\u{1F1EE}\u{1F1F9}', pt: '\u{1F1E7}\u{1F1F7}',
  nl: '\u{1F1F3}\u{1F1F1}', pl: '\u{1F1F5}\u{1F1F1}', ru: '\u{1F1F7}\u{1F1FA}',
  ja: '\u{1F1EF}\u{1F1F5}', zh: '\u{1F1E8}\u{1F1F3}', ko: '\u{1F1F0}\u{1F1F7}',
  ar: '\u{1F1F8}\u{1F1E6}', sv: '\u{1F1F8}\u{1F1EA}', da: '\u{1F1E9}\u{1F1F0}',
  fi: '\u{1F1EB}\u{1F1EE}', no: '\u{1F1F3}\u{1F1F4}', tr: '\u{1F1F9}\u{1F1F7}',
  cs: '\u{1F1E8}\u{1F1FF}', ro: '\u{1F1F7}\u{1F1F4}',
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const LAUNCH_STEPS = ['progressCreate', 'progressAnalyze', 'progressSetup', 'progressDone'];

export default function StepLaunch({ formData, onBack, onLaunch, isLaunching }) {
  const { t } = useTranslation('onboarding');
  const [launchStep, setLaunchStep] = useState(-1);

  const strategy = STRATEGY_META[formData.backlinkStrategy] || STRATEGY_META.auto;
  const StrategyIcon = strategy.icon;

  // Simulated launch progress
  useEffect(() => {
    if (!isLaunching) {
      setLaunchStep(-1);
      return;
    }
    setLaunchStep(0);
    const timers = [
      setTimeout(() => setLaunchStep(1), 800),
      setTimeout(() => setLaunchStep(2), 1800),
      setTimeout(() => setLaunchStep(3), 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isLaunching]);

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2 text-center">
          {t('step4.title')}
        </h2>
        <p className="text-sm text-ink-400 mb-8 text-center">
          {t('step4.subtitle')}
        </p>
      </motion.div>

      {/* Summary card */}
      <AnimatePresence mode="wait">
        {!isLaunching ? (
          <motion.div
            key="summary"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-cream-200 bg-white/90 backdrop-blur-sm shadow-soft-lg p-6 space-y-4"
          >
            {/* Project */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                {formData.domain ? (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${formData.domain}&sz=32`}
                    alt=""
                    className="w-4.5 h-4.5 rounded"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Globe className="h-4 w-4 text-brand-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  {t('step4.projectLabel')}
                </p>
                <p className="text-sm font-semibold text-ink truncate">{formData.name}</p>
              </div>
            </motion.div>

            {/* Domain */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Globe className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  {t('step4.domainLabel')}
                </p>
                <p className="text-sm font-semibold text-ink truncate">{formData.domain}</p>
              </div>
            </motion.div>

            {/* Languages */}
            <motion.div variants={itemVariants} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Languages className="h-4 w-4 text-violet-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  {t('step4.languagesLabel')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {formData.languages.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100"
                    >
                      {LANGUAGE_FLAGS[code]} {code.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Strategy */}
            <motion.div variants={itemVariants} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest">
                  {t('step4.strategyLabel')}
                </p>
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <StrategyIcon className="h-3.5 w-3.5 text-ink-400" />
                  {t(`step4.${strategy.key}`)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="launching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-brand-200 bg-brand-50/50 shadow-soft-lg p-6 space-y-3"
          >
            {LAUNCH_STEPS.map((stepKey, i) => {
              const isActive = i === launchStep;
              const isDone = i < launchStep;
              const isPending = i > launchStep;

              return (
                <motion.div
                  key={stepKey}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    isDone && 'bg-brand-500',
                    isActive && 'bg-brand-500',
                    isPending && 'bg-cream-200'
                  )}>
                    {isDone ? (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    ) : isActive ? (
                      <Loader className="h-3.5 w-3.5 text-white animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-ink-300" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isDone && 'text-brand-700',
                    isActive && 'text-brand-800 font-semibold',
                    isPending && 'text-ink-300'
                  )}>
                    {t(`step4.${stepKey}`)}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {!isLaunching && (
        <div className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="btn-secondary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('step4.back')}
          </button>
          <button
            onClick={onLaunch}
            className="btn-primary flex-[2] py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-200/40 hover:shadow-glow"
          >
            <Rocket className="h-4 w-4" />
            {t('step4.launch')}
          </button>
        </div>
      )}
    </div>
  );
}
