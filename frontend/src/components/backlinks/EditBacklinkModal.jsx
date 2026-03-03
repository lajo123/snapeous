import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/ui/Modal';

export default function EditBacklinkModal({ backlink, onClose, onSubmit, isPending }) {
  const { t } = useTranslation('backlinks');
  const [formData, setFormData] = useState({
    source_url: backlink.source_url,
    target_url: backlink.target_url || '',
    anchor_text: backlink.anchor_text || '',
    link_type: backlink.link_type || 'dofollow',
    status: backlink.status,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal open onClose={onClose} title={t('editModal.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('editModal.sourceUrl')}</label>
          <input
            type="url"
            required
            value={formData.source_url}
            onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('editModal.targetUrl')}</label>
          <input
            type="url"
            value={formData.target_url}
            onChange={(e) => setFormData(d => ({ ...d, target_url: e.target.value }))}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('editModal.anchorText')}</label>
          <input
            type="text"
            value={formData.anchor_text}
            onChange={(e) => setFormData(d => ({ ...d, anchor_text: e.target.value }))}
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">{t('editModal.type')}</label>
            <select
              value={formData.link_type}
              onChange={(e) => setFormData(d => ({ ...d, link_type: e.target.value }))}
              className="select w-full"
            >
              <option value="dofollow">Dofollow</option>
              <option value="nofollow">Nofollow</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">{t('editModal.status')}</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
              className="select w-full"
            >
              <option value="active">{t('editModal.active')}</option>
              <option value="lost">{t('editModal.lost')}</option>
              <option value="pending">{t('editModal.pending')}</option>
            </select>
          </div>
        </div>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary">{t('editModal.cancel')}</button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? t('editModal.updating') : t('editModal.submit')}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
