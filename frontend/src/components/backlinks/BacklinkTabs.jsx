import { LayoutDashboard, Link2, Type, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'liens', label: 'Liens', icon: Link2 },
  { key: 'ancres', label: 'Ancres', icon: Type },
  { key: 'historique', label: 'Historique', icon: Clock },
];

export default function BacklinkTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#FAF7F2] rounded-xl border border-[#EDE4D3]">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === tab.key
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-[#5a5550] hover:bg-white/50"
          )}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
