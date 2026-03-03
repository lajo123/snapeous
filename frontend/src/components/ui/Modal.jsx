import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable modal with portal rendering, focus trap, and escape-to-close.
 *
 * @param {boolean}  open       – Controls visibility
 * @param {function} onClose    – Called when overlay/escape/close-button triggers dismiss
 * @param {string}   [title]    – Optional header title
 * @param {string}   [size]     – 'sm' | 'md' | 'lg' (default 'md')
 * @param {boolean}  [showClose] – Show the X button (default true)
 * @param {string}   [className] – Extra classes on the panel
 * @param {ReactNode} children  – Modal body
 */
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  showClose = true,
  className = '',
  children,
}) {
  const panelRef = useRef(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the panel
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative bg-surface rounded-2xl shadow-soft-lg border border-black/[0.07] w-full ${SIZES[size] || SIZES.md} outline-none ${className}`}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            {title && (
              <h2 className="text-lg font-bold text-ink">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="ml-auto -mr-1 p-1 rounded-lg text-ink-300 hover:text-ink-600 hover:bg-cream-50 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Convenience sub-components for structured modal content.
 *
 * <Modal.Footer>
 *   <button className="btn-secondary">Cancel</button>
 *   <button className="btn-primary">Confirm</button>
 * </Modal.Footer>
 */
Modal.Footer = function ModalFooter({ className = '', children }) {
  return (
    <div className={`flex items-center justify-end gap-3 pt-2 ${className}`}>
      {children}
    </div>
  );
};
