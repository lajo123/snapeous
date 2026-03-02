import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── FR ────────────────────────────────────────────────────────────
import frCommon from './locales/fr/common.json';
import frLanding from './locales/fr/landing.json';
import frAuth from './locales/fr/auth.json';
import frApp from './locales/fr/app.json';
import frAnalysis from './locales/fr/analysis.json';
import frSpots from './locales/fr/spots.json';
import frBacklinks from './locales/fr/backlinks.json';
import frSearch from './locales/fr/search.json';
import frDashboard from './locales/fr/dashboard.json';
import frSeo from './locales/fr/seo.json';
import frLegal from './locales/fr/legal.json';

// ── EN ────────────────────────────────────────────────────────────
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';
import enAuth from './locales/en/auth.json';
import enApp from './locales/en/app.json';
import enAnalysis from './locales/en/analysis.json';
import enSpots from './locales/en/spots.json';
import enBacklinks from './locales/en/backlinks.json';
import enSearch from './locales/en/search.json';
import enDashboard from './locales/en/dashboard.json';
import enSeo from './locales/en/seo.json';
import enLegal from './locales/en/legal.json';

// ── ES ────────────────────────────────────────────────────────────
import esCommon from './locales/es/common.json';
import esLanding from './locales/es/landing.json';
import esAuth from './locales/es/auth.json';
import esApp from './locales/es/app.json';
import esAnalysis from './locales/es/analysis.json';
import esSpots from './locales/es/spots.json';
import esBacklinks from './locales/es/backlinks.json';
import esSearch from './locales/es/search.json';
import esDashboard from './locales/es/dashboard.json';
import esSeo from './locales/es/seo.json';
import esLegal from './locales/es/legal.json';

// ── DE ────────────────────────────────────────────────────────────
import deCommon from './locales/de/common.json';
import deLanding from './locales/de/landing.json';
import deAuth from './locales/de/auth.json';
import deApp from './locales/de/app.json';
import deAnalysis from './locales/de/analysis.json';
import deSpots from './locales/de/spots.json';
import deBacklinks from './locales/de/backlinks.json';
import deSearch from './locales/de/search.json';
import deDashboard from './locales/de/dashboard.json';
import deSeo from './locales/de/seo.json';
import deLegal from './locales/de/legal.json';

// ── IT ────────────────────────────────────────────────────────────
import itCommon from './locales/it/common.json';
import itLanding from './locales/it/landing.json';
import itAuth from './locales/it/auth.json';
import itApp from './locales/it/app.json';
import itAnalysis from './locales/it/analysis.json';
import itSpots from './locales/it/spots.json';
import itBacklinks from './locales/it/backlinks.json';
import itSearch from './locales/it/search.json';
import itDashboard from './locales/it/dashboard.json';
import itSeo from './locales/it/seo.json';
import itLegal from './locales/it/legal.json';

// ── PT ────────────────────────────────────────────────────────────
import ptCommon from './locales/pt/common.json';
import ptLanding from './locales/pt/landing.json';
import ptAuth from './locales/pt/auth.json';
import ptApp from './locales/pt/app.json';
import ptAnalysis from './locales/pt/analysis.json';
import ptSpots from './locales/pt/spots.json';
import ptBacklinks from './locales/pt/backlinks.json';
import ptSearch from './locales/pt/search.json';
import ptDashboard from './locales/pt/dashboard.json';
import ptSeo from './locales/pt/seo.json';
import ptLegal from './locales/pt/legal.json';

export const SUPPORTED_LANGS = ['en', 'fr', 'es', 'de', 'it', 'pt'];
export const DEFAULT_LANG = 'en';

export const LANG_LABELS = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

export const LANG_DATE_LOCALES = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, landing: enLanding, auth: enAuth, app: enApp, analysis: enAnalysis, spots: enSpots, backlinks: enBacklinks, search: enSearch, dashboard: enDashboard, seo: enSeo, legal: enLegal },
      fr: { common: frCommon, landing: frLanding, auth: frAuth, app: frApp, analysis: frAnalysis, spots: frSpots, backlinks: frBacklinks, search: frSearch, dashboard: frDashboard, seo: frSeo, legal: frLegal },
      es: { common: esCommon, landing: esLanding, auth: esAuth, app: esApp, analysis: esAnalysis, spots: esSpots, backlinks: esBacklinks, search: esSearch, dashboard: esDashboard, seo: esSeo, legal: esLegal },
      de: { common: deCommon, landing: deLanding, auth: deAuth, app: deApp, analysis: deAnalysis, spots: deSpots, backlinks: deBacklinks, search: deSearch, dashboard: deDashboard, seo: deSeo, legal: deLegal },
      it: { common: itCommon, landing: itLanding, auth: itAuth, app: itApp, analysis: itAnalysis, spots: itSpots, backlinks: itBacklinks, search: itSearch, dashboard: itDashboard, seo: itSeo, legal: itLegal },
      pt: { common: ptCommon, landing: ptLanding, auth: ptAuth, app: ptApp, analysis: ptAnalysis, spots: ptSpots, backlinks: ptBacklinks, search: ptSearch, dashboard: ptDashboard, seo: ptSeo, legal: ptLegal },
    },
    fallbackLng: DEFAULT_LANG,
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'app', 'analysis', 'spots', 'backlinks', 'search', 'dashboard', 'seo', 'legal'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  });

export default i18n;
