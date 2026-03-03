import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { createProject, analyzeProject } from '@/lib/api'
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate'
import useLocalizedPath from '@/hooks/useLocalizedPath'
import { ArrowLeft, Globe, FolderOpen } from 'lucide-react'

export default function ProjectNew() {
  const navigate = useLocalizedNavigate()
  const lp = useLocalizedPath()
  const queryClient = useQueryClient()
  const { t } = useTranslation('app')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => createProject({ name, client_domain: domain }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success(t('toast.projectCreated'))
      navigate(`/projects/${data.id}`)
      analyzeProject(data.id).catch(() => {})
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.detail?.message ||
          error?.response?.data?.message ||
          error?.message ||
          t('toast.createError')
      )
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim()) {
      toast.error(t('toast.fieldsRequired'))
      return
    }
    mutate()
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-start justify-center pt-8">
      <div className="w-full max-w-lg">
        <a
          href={lp('/dashboard')}
          onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('projectNew.backToDashboard')}
        </a>

        <div className="card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <FolderOpen className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">
                {t('projectNew.title')}
              </h1>
              <p className="text-sm text-ink-400">{t('projectNew.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t('projectModal.nameLabel')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('projectModal.namePlaceholder')}
                className="input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="domain"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                {t('projectNew.domainLabel')}
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
                <input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={t('projectModal.domainPlaceholder')}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full py-3"
            >
              {isPending ? t('projectModal.creating') : t('projectModal.create')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
