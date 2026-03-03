import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['step1', 'step2', 'step3', 'step4'];

export default function ProgressBar({ currentStep }) {
  const { t } = useTranslation('onboarding');

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line (background) */}
        <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-cream-200" />
        {/* Connecting line (progress) */}
        <motion.div
          className="absolute top-4 left-[10%] h-[2px] bg-brand-500 origin-left"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />

        {STEPS.map((stepKey, i) => {
          const stepNum = i + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div key={stepKey} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300',
                  isCompleted && 'bg-brand-500 text-white',
                  isCurrent && 'bg-brand-500 text-white ring-4 ring-brand-100',
                  !isCompleted && !isCurrent && 'bg-white border-2 border-ink-50 text-ink-300'
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stepNum}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] font-semibold whitespace-nowrap hidden sm:block',
                  isCurrent || isCompleted ? 'text-brand-600' : 'text-ink-300'
                )}
              >
                {t(`progress.${stepKey}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
