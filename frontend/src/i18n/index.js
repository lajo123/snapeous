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
import frContact from './locales/fr/contact.json';
import frOnboarding from './locales/fr/onboarding.json';
import frPricing from './locales/fr/pricing.json';
import frBlog from './locales/fr/blog.json';
import frChangelog from './locales/fr/changelog.json';
import frDocs from './locales/fr/docs.json';

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
import enContact from './locales/en/contact.json';
import enOnboarding from './locales/en/onboarding.json';
import enPricing from './locales/en/pricing.json';
import enBlog from './locales/en/blog.json';
import enChangelog from './locales/en/changelog.json';
import enDocs from './locales/en/docs.json';

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
import esContact from './locales/es/contact.json';
import esOnboarding from './locales/es/onboarding.json';
import esPricing from './locales/es/pricing.json';
import esBlog from './locales/es/blog.json';
import esChangelog from './locales/es/changelog.json';
import esDocs from './locales/es/docs.json';

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
import deContact from './locales/de/contact.json';
import deOnboarding from './locales/de/onboarding.json';
import dePricing from './locales/de/pricing.json';
import deBlog from './locales/de/blog.json';
import deChangelog from './locales/de/changelog.json';
import deDocs from './locales/de/docs.json';

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
import itContact from './locales/it/contact.json';
import itOnboarding from './locales/it/onboarding.json';
import itPricing from './locales/it/pricing.json';
import itBlog from './locales/it/blog.json';
import itChangelog from './locales/it/changelog.json';
import itDocs from './locales/it/docs.json';

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
import ptContact from './locales/pt/contact.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptPricing from './locales/pt/pricing.json';
import ptBlog from './locales/pt/blog.json';
import ptChangelog from './locales/pt/changelog.json';
import ptDocs from './locales/pt/docs.json';

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
      en: { common: enCommon, landing: enLanding, auth: enAuth, app: enApp, analysis: enAnalysis, spots: enSpots, backlinks: enBacklinks, search: enSearch, dashboard: enDashboard, seo: enSeo, legal: enLegal, contact: enContact, onboarding: enOnboarding, pricing: enPricing, blog: enBlog, changelog: enChangelog, docs: enDocs },
      fr: { common: frCommon, landing: frLanding, auth: frAuth, app: frApp, analysis: frAnalysis, spots: frSpots, backlinks: frBacklinks, search: frSearch, dashboard: frDashboard, seo: frSeo, legal: frLegal, contact: frContact, onboarding: frOnboarding, pricing: frPricing, blog: frBlog, changelog: frChangelog, docs: frDocs },
      es: { common: esCommon, landing: esLanding, auth: esAuth, app: esApp, analysis: esAnalysis, spots: esSpots, backlinks: esBacklinks, search: esSearch, dashboard: esDashboard, seo: esSeo, legal: esLegal, contact: esContact, onboarding: esOnboarding, pricing: esPricing, blog: esBlog, changelog: esChangelog, docs: esDocs },
      de: { common: deCommon, landing: deLanding, auth: deAuth, app: deApp, analysis: deAnalysis, spots: deSpots, backlinks: deBacklinks, search: deSearch, dashboard: deDashboard, seo: deSeo, legal: deLegal, contact: deContact, onboarding: deOnboarding, pricing: dePricing, blog: deBlog, changelog: deChangelog, docs: deDocs },
      it: { common: itCommon, landing: itLanding, auth: itAuth, app: itApp, analysis: itAnalysis, spots: itSpots, backlinks: itBacklinks, search: itSearch, dashboard: itDashboard, seo: itSeo, legal: itLegal, contact: itContact, onboarding: itOnboarding, pricing: itPricing, blog: itBlog, changelog: itChangelog, docs: itDocs },
      pt: { common: ptCommon, landing: ptLanding, auth: ptAuth, app: ptApp, analysis: ptAnalysis, spots: ptSpots, backlinks: ptBacklinks, search: ptSearch, dashboard: ptDashboard, seo: ptSeo, legal: ptLegal, contact: ptContact, onboarding: ptOnboarding, pricing: ptPricing, blog: ptBlog, changelog: ptChangelog, docs: ptDocs },
    },
    fallbackLng: DEFAULT_LANG,
    defaultNS: 'common',
    ns: ['common', 'landing', 'auth', 'app', 'analysis', 'spots', 'backlinks', 'search', 'dashboard', 'seo', 'legal', 'contact', 'onboarding', 'pricing', 'blog', 'changelog', 'docs'],
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
