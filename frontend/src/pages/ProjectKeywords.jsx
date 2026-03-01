import { useParams, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

export default function ProjectKeywords() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mots-clés</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Gérez les mots-clés cibles de votre projet.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-soft px-6 py-20 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-emerald-50">
          <KeyRound className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="mt-5 text-base font-semibold text-gray-900">
          Section en cours de développement
        </h3>
        <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
          La gestion des mots-clés sera disponible prochainement.
          En attendant, utilisez la section{' '}
          <Link
            to={`/projects/${id}/analysis`}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Analyse
          </Link>{' '}
          pour gérer vos mots-clés.
        </p>
      </div>
    </div>
  );
}
