import { cn } from '@/lib/utils';

/**
 * Skeleton loading placeholder.
 *
 * @param {object} props
 * @param {string} [props.className] – Width / height / rounded overrides
 */
export default function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-ink-50', className)}
      aria-hidden="true"
    />
  );
}
