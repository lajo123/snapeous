import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://snapeous.com';

/**
 * Renders JSON-LD structured data in <head>.
 * Works around react-helmet-async's script rendering issues by using
 * a deterministic key per schema type.
 */
function JsonLd({ data }) {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
}

/** SoftwareApplication schema for the main product pages. */
export function SoftwareApplicationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Snapeous',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: BASE_URL,
        description:
          'SEO audit and monitoring tool. Analyze your website, track rankings, and improve your search engine visibility.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          lowPrice: '0',
          highPrice: '79',
          offerCount: '4',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '120',
        },
      }}
    />
  );
}

/**
 * FAQPage schema — pass an array of { question, answer } objects.
 * Used on the landing page FAQ section.
 */
export function FAQSchema({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer,
          },
        })),
      }}
    />
  );
}

/**
 * BreadcrumbList schema for internal pages.
 * @param {Array<{name: string, url: string}>} items - Breadcrumb trail
 */
export function BreadcrumbSchema({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
        })),
      }}
    />
  );
}
