import { LayoutDashboard, Link2, Type, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'dashboard', labelKey: 'tabs.dashboard', icon: LayoutDashboard },
  { key: 'links', labelKey: 'tabs.links', icon: Link2 },
  { key: 'anchors', labelKey: 'tabs.anchors', icon: Type },
  { key: 'history', labelKey: 'tabs.history', icon: Clock },
];

export default function BacklinkTabs({ activeTab, onTabChange }) {
  const { t } = useTranslation('backlinks');
  return (
    <div className="flex items-center gap-1 p-1 bg-[#FAF7F2] rounded-xl border border-[#E8DCCB]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === tab.key
              ? "bg-white text-brand-700 shadow-sm"
              : "text-[#5a5550] hover:bg-white/50"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}
