import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGS, LANG_LABELS } from '@/i18n';
import { cn } from '@/lib/utils';

const FLAG_EMOJI = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
};

export default function LanguageSwitcher({ variant = 'default' }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = i18n.language;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchTo = (lang) => {
    if (lang === currentLang) { setOpen(false); return; }
    const pathWithoutLang = location.pathname.replace(/^\/(en|fr|es|de|it|pt)(\/|$)/, '/');
    const newPath = `/${lang}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    navigate(newPath + location.search + location.hash, { replace: true });
    setOpen(false);
  };

  const isCompact = variant === 'compact';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors text-sm font-medium',
          isCompact
            ? 'px-2.5 py-1.5 text-ink-500 hover:bg-cream hover:text-ink'
            : 'px-3 py-2 text-ink-400 hover:text-ink hover:bg-cream/50'
        )}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span>{FLAG_EMOJI[currentLang]} {LANG_LABELS[currentLang]}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform rotate-180', open && 'rotate-0')} />
      </button>

      {open && (
        <div className={cn(
          'absolute z-50 bg-white rounded-xl border border-cream-200 shadow-lg py-1 min-w-[160px] bottom-full mb-1',
          isCompact ? 'left-0' : 'left-1/2 -translate-x-1/2'
        )}>
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => switchTo(lang)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left',
                lang === currentLang
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-ink-500 hover:bg-cream-50'
              )}
            >
              <span className="text-base">{FLAG_EMOJI[lang]}</span>
              <span>{LANG_LABELS[lang]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
