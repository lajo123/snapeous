import { useState } from 'react';

export default function AddBacklinkModal({ onClose, onSubmit, isPending }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un backlink</h2>
        <p className="text-sm text-[#6b6560] mb-4">
          L'outil detectera automatiquement l'URL cible et le texte d'ancre en scrapant la page.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Source *</label>
            <input
              type="url"
              required
              value={formData.source_url}
              onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="https://exemple.com/page-avec-lien"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Detection...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
