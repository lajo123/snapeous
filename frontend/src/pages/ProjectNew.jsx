import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProject, analyzeProject } from '@/lib/api'
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate'
import { ArrowLeft, Globe, FolderOpen } from 'lucide-react'

export default function ProjectNew() {
  const navigate = useLocalizedNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => createProject({ name, client_domain: domain }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet créé avec succès')
      navigate(`/projects/${data.id}`)
      // Trigger analysis in background (fire-and-forget)
      analyzeProject(data.id).catch(() => {})
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.detail?.message ||
          error?.response?.data?.message ||
          error?.message ||
          'Erreur lors de la création du projet'
      )
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    mutate()
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-start justify-center pt-8">
      <div className="w-full max-w-lg">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 shadow-soft p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <FolderOpen className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Creer un nouveau projet
              </h1>
              <p className="text-sm text-gray-400">Renseignez les informations de votre projet</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nom du projet
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campagne SEO Q1 2026"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                required
              />
            </div>

            <div>
              <label
                htmlFor="domain"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Domaine du site
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="monsite.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3"
            >
              {isPending ? 'Creation en cours...' : 'Creer le projet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
