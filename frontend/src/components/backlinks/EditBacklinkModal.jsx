import { useState } from 'react';

export default function EditBacklinkModal({ backlink, onClose, onSubmit, isPending }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier le backlink</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Source</label>
            <input
              type="url"
              required
              value={formData.source_url}
              onChange={(e) => setFormData(d => ({ ...d, source_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Cible</label>
            <input
              type="url"
              value={formData.target_url}
              onChange={(e) => setFormData(d => ({ ...d, target_url: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte d'ancre</label>
            <input
              type="text"
              value={formData.anchor_text}
              onChange={(e) => setFormData(d => ({ ...d, anchor_text: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.link_type}
                onChange={(e) => setFormData(d => ({ ...d, link_type: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="dofollow">Dofollow</option>
                <option value="nofollow">Nofollow</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-[#FAF7F2]/50 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="active">Actif</option>
                <option value="lost">Perdu</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Mise a jour...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
