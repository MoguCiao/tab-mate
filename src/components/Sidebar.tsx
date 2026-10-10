import React from 'react';
import { Language, Ledger, ViewType } from '../types';
import { translations } from '../locales/i18n';
import { LayoutGrid, Plus, FileText, PieChart, X } from 'lucide-react';

interface SidebarProps {
  lang: Language;
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  ledgers: Ledger[];
  selectedLedgerId: string | null;
  onSelectLedger: (ledgerId: string | null) => void;
  onOpenAddExpense: () => void;
  onOpenNewLedger: () => void;
  pendingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  currentView,
  onSelectView,
  ledgers,
  selectedLedgerId,
  onSelectLedger,
  onOpenAddExpense,
  onOpenNewLedger,
  pendingCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const t = translations[lang];

  const navItems = [
    {
      id: 'overview' as ViewType,
      label: t.overview,
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
    },
    {
      id: 'add_expense' as ViewType,
      label: t.addExpense,
      icon: <Plus className="w-3.5 h-3.5" />,
      action: onOpenAddExpense,
    },
    {
      id: 'all_expenses' as ViewType,
      label: t.allExpenses,
      icon: <FileText className="w-3.5 h-3.5" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'analytics' as ViewType,
      label: t.analytics,
      icon: <PieChart className="w-3.5 h-3.5" />,
    },
  ];

  const content = (
    <div className="p-[22px_14px] flex flex-col h-full text-xs">
      {/* Mobile close button */}
      <div className="flex md:hidden items-center justify-between pb-3 mb-2 border-b border-[#e8ebe5]">
        <span className="font-semibold text-sm text-[#20241f]">{t.brandName}</span>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded-lg text-[#777e75] hover:text-[#20241f]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Workspace label */}
      <div className="text-[#777e75] text-[10px] tracking-[0.08em] uppercase font-medium px-2.5 mb-2.5">
        {t.workspace}
      </div>

      {/* Nav items */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isSelected = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  onSelectView(item.id);
                  onSelectLedger(null); // reset ledger filter to all
                }
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-[#edf4ee] text-[#416f54] font-semibold shadow-xs'
                  : 'text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="opacity-90">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-[#f8efe8] text-[#c87943] font-semibold border border-[#efa576]/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Ledgers section */}
      <div className="mt-6">
        <div className="text-[#777e75] text-[10px] tracking-[0.08em] uppercase font-medium px-2.5 mb-2.5">
          {t.yourLedgers}
        </div>

        <div className="space-y-1">
          {/* All Ledgers option */}
          <button
            onClick={() => {
              onSelectLedger(null);
              onCloseMobile();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-[11px] ${
              selectedLedgerId === null
                ? 'text-[#20241f] font-semibold bg-[#f6f7f4]'
                : 'text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#416f54]" />
            <span className="truncate">{t.allLedgers}</span>
          </button>

          {ledgers.map((ledger) => {
            const isSelected = selectedLedgerId === ledger.id;
            return (
              <button
                key={ledger.id}
                onClick={() => {
                  onSelectLedger(ledger.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-[11px] ${
                  isSelected
                    ? 'text-[#20241f] font-semibold bg-[#f6f7f4]'
                    : 'text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ledger.iconColor || '#416f54' }}
                />
                <span className="truncate">
                  {lang === 'zh' ? ledger.nameZh : ledger.nameEn}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              onOpenNewLedger();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] text-[#777e75] hover:text-[#416f54] hover:bg-[#edf4ee] transition-colors"
          >
            <span className="font-bold text-xs">＋</span>
            <span>{t.newLedger}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[190px] shrink-0 bg-white border-r border-[#e8ebe5] select-none">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-[230px] max-w-[80vw] bg-white h-full z-50 shadow-2xl flex flex-col">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
