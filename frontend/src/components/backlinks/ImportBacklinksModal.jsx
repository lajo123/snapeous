import { useState, useMemo } from 'react';
import { Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/ui/Modal';
import { useSubscription } from '@/contexts/SubscriptionContext';

const MAX_BATCH_SIZE = 10000;

export default function ImportBacklinksModal({ onClose, onSubmit, isPending, currentCount = 0 }) {
  const { t } = useTranslation('backlinks');
  const { limits, plan } = useSubscription();
  const [urlText, setUrlText] = useState('');

  const maxForPlan = limits?.max_backlinks ?? 50;
  const remaining = Math.max(0, maxForPlan - currentCount);

  const parsedUrls = useMemo(() => {
    if (!urlText.trim()) return [];
    const lines = urlText.trim().split('\n');
    const urls = [];
    const seen = new Set();
    for (const line of lines) {
      const url = line.trim();
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push({ source_url: url });
      }
    }
    return urls;
  }, [urlText]);

  const count = parsedUrls.length;
  const effectiveMax = Math.min(MAX_BATCH_SIZE, remaining);
  const isOverBatchLimit = count > MAX_BATCH_SIZE;
  const isOverPlanLimit = count > remaining;
  const hasError = isOverBatchLimit || isOverPlanLimit;

  const handleSubmit = () => {
    if (count === 0) {
      toast.error(t('importModal.noUrls'));
      return;
    }
    if (isOverBatchLimit) {
      toast.error(t('importModal.batchLimitError', { max: MAX_BATCH_SIZE.toLocaleString() }));
      return;
    }
    if (isOverPlanLimit) {
      toast.error(t('importModal.planLimitError', { remaining, plan: limits?.label || plan }));
      return;
    }
    onSubmit(parsedUrls);
  };

  return (
    <Modal open onClose={onClose} title={t('importModal.title')} size="lg">
      <p className="text-sm text-ink-400 mb-4">
        {t('importModal.desc')}
      </p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-ink-500">
            {t('importModal.urlsLabel')}
          </label>
          <span className={`text-xs font-medium ${hasError ? 'text-red-500' : 'text-ink-400'}`}>
            {count.toLocaleString()} / {effectiveMax.toLocaleString()}
          </span>
        </div>
        <textarea
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          placeholder={"https://site1.com/page\nhttps://site2.com/article\nhttps://site3.com/blog/post"}
          className="input h-48 font-mono text-sm"
          autoFocus
        />
      </div>

      {/* Warnings */}
      {isOverBatchLimit && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{t('importModal.batchLimitError', { max: MAX_BATCH_SIZE.toLocaleString() })}</span>
        </div>
      )}
      {!isOverBatchLimit && isOverPlanLimit && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-xs">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{t('importModal.planLimitError', { remaining: remaining.toLocaleString(), plan: limits?.label || plan })}</span>
        </div>
      )}

      {/* Info bar */}
      <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
        <Link2 className="h-3.5 w-3.5" />
        <span>
          {t('importModal.capacityInfo', {
            current: currentCount.toLocaleString(),
            max: maxForPlan.toLocaleString(),
            plan: limits?.label || plan,
          })}
        </span>
      </div>

      <Modal.Footer>
        <button type="button" onClick={onClose} className="btn-secondary">{t('importModal.cancel')}</button>
        <button
          onClick={handleSubmit}
          disabled={isPending || count === 0 || hasError}
          className="btn-primary"
        >
          {isPending ? t('importModal.importing') : t('importModal.submit', { count })}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
