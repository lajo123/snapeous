import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/ui/Modal';

export default function AddBacklinkModal({ onClose, onSubmit, isPending }) {
  const { t } = useTranslation('backlinks');
  const [formData, setFormData] = useState({
    source_url: '',
    target_url: '',
    anchor_text: '',
    link_type: 'dofollow',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal open onClose={onClose} title={t('addModal.title')}>
      <p className="text-sm text-ink-400 mb-4">
        {t('addModal.desc')}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('addModal.sourceUrl')} *</label>
          <input
            type="url"
            required
            value={formData.source_url}
            onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
            className="input"
            placeholder="https://example.com/page-with-link"
          />
        </div>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('addModal.cancel')}
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? t('addModal.detecting') : t('addModal.submit')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
