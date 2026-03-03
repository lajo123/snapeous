import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English', popular: true },
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00e7ais', popular: true },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00f1ol', popular: true },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch', popular: true },
  { code: 'it', flag: '\u{1F1EE}\u{1F1F9}', label: 'Italiano' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Portugu\u00eas' },
  { code: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'Nederlands' },
  { code: 'pl', flag: '\u{1F1F5}\u{1F1F1}', label: 'Polski' },
  { code: 'ru', flag: '\u{1F1F7}\u{1F1FA}', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}', label: '\u65E5\u672C\u8A9E' },
  { code: 'zh', flag: '\u{1F1E8}\u{1F1F3}', label: '\u4E2D\u6587' },
  { code: 'ko', flag: '\u{1F1F0}\u{1F1F7}', label: '\uD55C\uAD6D\uC5B4' },
  { code: 'ar', flag: '\u{1F1F8}\u{1F1E6}', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { code: 'sv', flag: '\u{1F1F8}\u{1F1EA}', label: 'Svenska' },
  { code: 'da', flag: '\u{1F1E9}\u{1F1F0}', label: 'Dansk' },
  { code: 'fi', flag: '\u{1F1EB}\u{1F1EE}', label: 'Suomi' },
  { code: 'no', flag: '\u{1F1F3}\u{1F1F4}', label: 'Norsk' },
  { code: 'tr', flag: '\u{1F1F9}\u{1F1F7}', label: 'T\u00fcrk\u00e7e' },
  { code: 'cs', flag: '\u{1F1E8}\u{1F1FF}', label: '\u010Ce\u0161tina' },
  { code: 'ro', flag: '\u{1F1F7}\u{1F1F4}', label: 'Rom\u00e2n\u0103' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 20 } },
};

export default function StepLanguages({ formData, updateForm, onNext, onBack }) {
  const { t } = useTranslation('onboarding');
  const [search, setSearch] = useState('');

  const selected = formData.languages;

  const toggleLanguage = (code) => {
    const updated = selected.includes(code)
      ? selected.filter((c) => c !== code)
      : [...selected, code];
    updateForm({ languages: updated });
  };

  const filtered = LANGUAGES.filter(
    (l) => l.label.toLowerCase().includes(search.toLowerCase()) || l.code.includes(search.toLowerCase())
  );

  const popular = filtered.filter((l) => l.popular);
  const others = filtered.filter((l) => !l.popular);

  const canContinue = selected.length > 0;

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2 text-center">
          {t('step2.title')}
        </h2>
        <p className="text-sm text-ink-400 mb-6 text-center">
          {t('step2.subtitle')}
        </p>
      </motion.div>

      {/* Selected count badge */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center mb-4"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full">
              <Check className="h-3 w-3" strokeWidth={3} />
              {t('step2.selected', { count: selected.length })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-5"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('step2.searchPlaceholder')}
          className="input w-full pl-10"
        />
      </motion.div>

      {/* Languages grid */}
      <div className="max-h-[340px] overflow-y-auto pr-1 -mr-1 space-y-4">
        {popular.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest mb-2">
              {t('step2.popular')}
            </p>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-2"
            >
              {popular.map((lang) => (
                <LanguageChip
                  key={lang.code}
                  lang={lang}
                  isSelected={selected.includes(lang.code)}
                  onToggle={toggleLanguage}
                />
              ))}
            </motion.div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-ink-300 uppercase tracking-widest mb-2">
              {t('step2.all')}
            </p>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-2"
            >
              {others.map((lang) => (
                <LanguageChip
                  key={lang.code}
                  lang={lang}
                  isSelected={selected.includes(lang.code)}
                  onToggle={toggleLanguage}
                />
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="btn-secondary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('step2.back')}
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="btn-primary flex-[2] py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('step2.continue')}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LanguageChip({ lang, isSelected, onToggle }) {
  return (
    <motion.button
      variants={itemVariants}
      type="button"
      onClick={() => onToggle(lang.code)}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200',
        isSelected
          ? 'border-brand-300 bg-brand-50/80 ring-1 ring-brand-200 shadow-sm'
          : 'border-cream-200 bg-white hover:border-ink-50 hover:shadow-soft'
      )}
    >
      <span className="text-lg leading-none">{lang.flag}</span>
      <span className={cn(
        'text-sm font-medium flex-1',
        isSelected ? 'text-brand-800' : 'text-ink-600'
      )}>
        {lang.label}
      </span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center"
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}
