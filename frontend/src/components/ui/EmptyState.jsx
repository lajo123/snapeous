import { cn } from '@/lib/utils';

/**
 * Reusable empty state component.
 *
 * @param {object}   props
 * @param {import('lucide-react').LucideIcon} props.icon  – Lucide icon component
 * @param {string}   props.title       – Heading text
 * @param {string}   [props.description] – Optional description
 * @param {React.ReactNode} [props.action] – Optional action (button / link)
 * @param {string}   [props.className]
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mb-4">
          <Icon className="h-6 w-6 text-brand-500" />
        </div>
      )}
      <h3 className="text-base font-bold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-400 max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}
