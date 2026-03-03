import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

export default function ImportBacklinksModal({ onClose, onSubmit, isPending }) {
  const { t } = useTranslation('backlinks');
  const [csvText, setCsvText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (event) => setCsvText(event.target.result);
      reader.readAsText(file);
    } else {
      toast.error(t('importModal.csvError'));
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setCsvText(event.target.result);
      reader.readAsText(file);
    }
  };

  const parseCSV = () => {
    const lines = csvText.trim().split('\n');
    const items = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 1 && parts[0]) {
        items.push({ source_url: parts[0] });
      }
    }
    return items;
  };

  const handleSubmit = () => {
    const items = parseCSV();
    if (items.length === 0) {
      toast.error(t('importModal.noUrls'));
      return;
    }
    onSubmit(items);
  };

  return (
    <Modal open onClose={onClose} title={t('importModal.title')} size="lg">
      <p className="text-sm text-ink-400 mb-4">
        {t('importModal.desc')}
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          isDragging ? "border-brand-400 bg-brand-50" : "border-ink-50 hover:border-ink-200"
        )}
      >
        <Upload className="h-8 w-8 text-ink-300 mx-auto mb-2" />
        <p className="text-sm text-ink-500 mb-2">{t('importModal.dropzone')}</p>
        <p className="text-xs text-ink-300 mb-4">{t('importModal.or')}</p>
        <label className="btn-secondary cursor-pointer">
          <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          {t('importModal.selectFile')}
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs text-ink-400 mb-2">{t('importModal.csvFormat')}</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={"https://site1.com/page\nhttps://site2.com/article\nhttps://site3.com/blog/post"}
          className="input h-32 font-mono"
        />
      </div>

      <Modal.Footer>
        <button type="button" onClick={onClose} className="btn-secondary">{t('importModal.cancel')}</button>
        <button onClick={handleSubmit} disabled={isPending || !csvText.trim()} className="btn-primary">
          {isPending ? t('importModal.importing') : t('importModal.submit', { count: parseCSV().length })}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
