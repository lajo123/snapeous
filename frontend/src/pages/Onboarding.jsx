import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getProjects, createProject, analyzeProject } from '@/lib/api';
import useLocalizedNavigate from '@/hooks/useLocalizedNavigate';
import ProgressBar from '@/components/onboarding/ProgressBar';
import StepTransition from '@/components/onboarding/StepTransition';
import StepProject from '@/components/onboarding/StepProject';
import StepLanguages from '@/components/onboarding/StepLanguages';
import StepBacklinks from '@/components/onboarding/StepBacklinks';
import StepLaunch from '@/components/onboarding/StepLaunch';

export default function Onboarding() {
  const { i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    languages: [i18n.language?.split('-')[0] || 'en'],
    backlinkStrategy: 'auto',
  });

  // Check if user already has projects → redirect to dashboard
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  useEffect(() => {
    if (!isLoading && projects?.length > 0) {
      navigate('/dashboard');
    }
  }, [projects, isLoading, navigate]);

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const createMutation = useMutation({
    mutationFn: (data) => createProject(data),
    onSuccess: async (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // Trigger analysis in background
      const primaryLang = formData.languages[0] || 'en';
      analyzeProject(project.id, primaryLang).catch(() => {});

      // Wait for the launch animation to finish
      await new Promise((resolve) => setTimeout(resolve, 3200));
      setIsLaunching(false);

      toast.success(
        formData.backlinkStrategy === 'manual'
          ? 'Project created! Add your backlinks.'
          : 'Project created!'
      );

      // Navigate based on strategy
      if (formData.backlinkStrategy === 'manual') {
        navigate(`/projects/${project.id}/backlinks`);
      } else {
        navigate(`/projects/${project.id}`);
      }
    },
    onError: (err) => {
      setIsLaunching(false);
      toast.error(err.response?.data?.detail || 'Failed to create project');
    },
  });

  const handleLaunch = () => {
    setIsLaunching(true);
    createMutation.mutate({
      name: formData.name,
      client_domain: formData.domain,
      languages: formData.languages,
      backlink_strategy: formData.backlinkStrategy,
    });
  };

  // Show nothing while checking existing projects
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center grain-bg">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-hidden grain-bg">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-brand-200/25 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[350px] h-[350px] bg-cream-200/40 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="shrink-0 relative z-10 pt-5 sm:pt-6 pb-3 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/snapeous-logo.svg" alt="Snapeous" className="h-6 w-6" />
          <span className="text-base font-bold tracking-tight text-ink">Snapeous</span>
        </div>

        <ProgressBar currentStep={step} />
      </header>

      {/* Step content */}
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:py-8 relative z-10">
        <StepTransition stepKey={step} direction={direction}>
          {step === 1 && (
            <StepProject
              formData={formData}
              updateForm={updateForm}
              onNext={goNext}
            />
          )}
          {step === 2 && (
            <StepLanguages
              formData={formData}
              updateForm={updateForm}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 3 && (
            <StepBacklinks
              formData={formData}
              updateForm={updateForm}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepLaunch
              formData={formData}
              onBack={goBack}
              onLaunch={handleLaunch}
              isLaunching={isLaunching}
            />
          )}
        </StepTransition>
      </main>
    </div>
  );
}
