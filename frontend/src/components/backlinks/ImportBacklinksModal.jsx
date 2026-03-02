import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('importModal.title')}</h2>
        <p className="text-sm text-[#6b6560] mb-4">
          {t('importModal.desc')}
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            isDragging ? "border-brand-400 bg-brand-50" : "border-gray-300 hover:border-gray-400"
          )}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">{t('importModal.dropzone')}</p>
          <p className="text-xs text-gray-400 mb-4">{t('importModal.or')}</p>
          <label className="btn-secondary cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            {t('importModal.selectFile')}
          </label>
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">{t('importModal.csvFormat')}</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={"https://site1.com/page\nhttps://site2.com/article\nhttps://site3.com/blog/post"}
            className="w-full h-32 px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">{t('importModal.cancel')}</button>
          <button onClick={handleSubmit} disabled={isPending || !csvText.trim()} className="btn-primary">
            {isPending ? t('importModal.importing') : t('importModal.submit', { count: parseCSV().length })}
          </button>
        </div>
      </div>
    </div>
  );
}
