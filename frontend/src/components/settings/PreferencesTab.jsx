import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Globe, Loader, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORTED_LANGS, LANG_LABELS, DEFAULT_LANG } from '@/i18n';
import { cn } from '@/lib/utils';

const LANG_FLAGS = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
};

export default function PreferencesTab() {
  const { t, i18n } = useTranslation('app');
  const navigate = useNavigate();
  const { lang } = useParams();
  const { user } = useAuth();
  const currentLang = lang || DEFAULT_LANG;

  const [selectedLang, setSelectedLang] = useState(currentLang);
  const [saving, setSaving] = useState(false);
  const [autoFetch, setAutoFetch] = useState(false);
  const [savingAutoFetch, setSavingAutoFetch] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.auto_fetch_backlinks) {
      setAutoFetch(true);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { preferred_language: selectedLang },
      });
      if (error) throw error;

      localStorage.setItem('i18nextLng', selectedLang);
      await i18n.changeLanguage(selectedLang);
      navigate(`/${selectedLang}/settings`, { replace: true, state: { tab: 'preferences' } });
      toast.success(t('settings.preferences.saved'));
    } catch {
      toast.error(t('settings.preferences.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoFetch = async () => {
    const newValue = !autoFetch;
    setSavingAutoFetch(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { auto_fetch_backlinks: newValue },
      });
      if (error) throw error;
      setAutoFetch(newValue);
      toast.success(t('settings.preferences.autoFetchSaved'));
    } catch {
      toast.error(t('settings.preferences.autoFetchError'));
    } finally {
      setSavingAutoFetch(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Language */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-violet-50 p-2.5">
            <Globe className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">{t('settings.preferences.language')}</h2>
            <p className="text-xs text-ink-300 mt-0.5">{t('settings.preferences.languageDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGS.map((code) => (
            <button
              key={code}
              onClick={() => setSelectedLang(code)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all text-left',
                selectedLang === code
                  ? 'border-brand-300 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                  : 'border-ink-100 bg-white text-ink hover:border-ink-200 hover:bg-surface-muted'
              )}
            >
              <span className="text-lg">{LANG_FLAGS[code]}</span>
              <span>{LANG_LABELS[code]}</span>
              {selectedLang === code && <Check className="h-4 w-4 ml-auto text-brand-500" />}
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || selectedLang === currentLang}
            className="btn-primary text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t('settings.preferences.save')}
          </button>
        </div>
      </div>

      {/* Auto Fetch Backlinks */}
      <div className="bg-white rounded-xl border border-ink-50 shadow-soft p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <RefreshCw className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">{t('settings.preferences.autoFetchTitle')}</h2>
              <p className="text-xs text-ink-300 mt-0.5">{t('settings.preferences.autoFetchDesc')}</p>
            </div>
          </div>

          <button
            onClick={handleToggleAutoFetch}
            disabled={savingAutoFetch}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2',
              autoFetch ? 'bg-brand-500' : 'bg-ink-200'
            )}
            role="switch"
            aria-checked={autoFetch}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                autoFetch ? 'translate-x-6' : 'translate-x-1'
              )}
            />
            {savingAutoFetch && (
              <Loader className="absolute -right-6 h-3.5 w-3.5 animate-spin text-ink-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
