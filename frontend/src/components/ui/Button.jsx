import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Polymorphic button primitive.
 *
 * @param {'primary'|'secondary'|'danger'|'ghost'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean} [loading]  – Shows spinner and disables the button
 * @param {string}  [to]       – If set, renders as React Router <Link>
 * @param {string}  [href]     – If set, renders as <a>
 * @param {ReactNode} [icon]   – Leading icon element
 */
const VARIANT_CLASSES = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-glow hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100',
  secondary:
    'bg-white text-ink-700 border border-ink-50 hover:bg-cream-50 hover:border-ink-100 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
  danger:
    'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 active:scale-[0.98]',
  ghost:
    'text-ink-400 hover:text-ink-600 hover:bg-cream-50 active:scale-[0.97]',
};

const SIZE_CLASSES = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    to,
    href,
    icon,
    children,
    className = '',
    disabled,
    ...rest
  },
  ref,
) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-150';
  const classes = `${base} ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`;

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </>
  );

  // Render as Link (React Router)
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  // Render as <a>
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
