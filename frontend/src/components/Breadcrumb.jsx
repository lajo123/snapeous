import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/StructuredData';

/**
 * Breadcrumb navigation with JSON-LD schema.
 *
 * @param {Array<{label: string, to?: string}>} items
 *   List of breadcrumb items. The last item has no `to` (current page).
 */
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  // Build schema items with full URLs
  const schemaItems = items.map((item) => ({
    name: item.label,
    url: item.to || '',
  }));

  return (
    <>
      <BreadcrumbSchema items={schemaItems} />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-ink-300">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <li key={i} className="flex items-center gap-1.5">
                {i === 0 && <Home className="h-3.5 w-3.5 shrink-0" />}
                {i > 0 && (
                  <ChevronRight className="h-3 w-3 text-ink-200 shrink-0" />
                )}
                {isLast || !item.to ? (
                  <span className="text-ink-500 font-medium truncate max-w-[200px]">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="hover:text-ink-500 transition-colors truncate max-w-[200px]"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
