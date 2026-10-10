import React, { useEffect, useState } from 'react';
import { Expense, ExpenseStatus, Language, Ledger, Member } from '../types';
import { translations } from '../locales/i18n';
import { formatCurrency } from '../utils/format';
import { Plus, Clock, CheckCircle2, Search, ArrowRight, UserCheck } from 'lucide-react';

interface AllExpensesViewProps {
  lang: Language;
  expenses: Expense[];
  members: Member[];
  ledgers: Ledger[];
  externalSearchQuery?: string;
  onOpenAddExpense: () => void;
  onOpenReview: (expense: Expense) => void;
}

export const AllExpensesView: React.FC<AllExpensesViewProps> = ({
  lang,
  expenses,
  members,
  ledgers,
  externalSearchQuery = '',
  onOpenAddExpense,
  onOpenReview,
}) => {
  const t = translations[lang];
  const [activeFilter, setActiveFilter] = useState<'all' | ExpenseStatus | 'personal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => setSearchQuery(externalSearchQuery), [externalSearchQuery]);

  const filteredExpenses = expenses.filter((e) => {
    // Filter tab
    if (activeFilter === 'personal' && !e.isPersonal && e.participantIds.length > 1) {
      return false;
    }
    if (activeFilter !== 'all' && activeFilter !== 'personal' && e.status !== activeFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName =
        e.nameZh.toLowerCase().includes(q) || e.nameEn.toLowerCase().includes(q);
      const ledger = ledgers.find((l) => l.id === e.ledgerId);
      const matchLedger =
        ledger &&
        (ledger.nameZh.toLowerCase().includes(q) ||
          ledger.nameEn.toLowerCase().includes(q));
      return matchName || matchLedger;
    }

    return true;
  });

  const getPayerName = (payerId: string) => {
    const member = members.find((m) => m.id === payerId);
    if (!member) return payerId;
    return lang === 'zh' ? member.nameZh : member.nameEn;
  };

  const getLedgerName = (ledgerId: string) => {
    const ledger = ledgers.find((l) => l.id === ledgerId);
    if (!ledger) return '';
    return lang === 'zh' ? ledger.nameZh : ledger.nameEn;
  };

  return (
    <div className="max-w-[900px] w-full mx-auto p-4 sm:p-6 lg:p-[28px_32px_34px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#20241f] m-0 mb-1">
            {t.allExpenses}
          </h1>
          <div className="text-xs text-[#777e75]">
            {lang === 'zh'
              ? '查看每笔账单的分摊明细、付款人与成员确认状态。'
              : 'Review detailed splits, payers, and member confirmation states.'}
          </div>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#416f54] hover:bg-[#365c46] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addExpenseBtn}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1 p-1 bg-white border border-[#e8ebe5] rounded-lg">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              activeFilter === 'all'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.all}
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              activeFilter === 'pending'
                ? 'bg-[#f8efe8] text-[#c87943] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.pendingFilter}
          </button>
          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              activeFilter === 'confirmed'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.confirmedFilter}
          </button>
          <button
            onClick={() => setActiveFilter('settled')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              activeFilter === 'settled'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.settledFilter}
          </button>
          <button
            onClick={() => setActiveFilter('personal')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              activeFilter === 'personal'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.personalFilter}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#777e75] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full sm:w-60 bg-white border border-[#e8ebe5] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#20241f] outline-none focus:border-[#416f54] transition-colors"
          />
        </div>
      </div>

      {/* Expenses Table/List */}
      <div className="bg-white border border-[#e8ebe5] rounded-xl overflow-hidden shadow-xs divide-y divide-[#e8ebe5]">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#777e75]">
            {t.noExpensesFound}
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const isPending = expense.status === 'pending';
            const isPersonal = expense.isPersonal || expense.participantIds.length <= 1;
            const payer = members.find((m) => m.id === expense.payerId);

            // Count how many confirmed
            const confirmedCount = expense.splits.filter((s) => s.confirmed).length;
            const totalCount = expense.splits.length;

            return (
              <div
                key={expense.id}
                onClick={() => onOpenReview(expense)}
                className="p-3.5 sm:p-4 hover:bg-[#fcfdfa] transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Payer Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 border border-[#e8ebe5]"
                    style={{
                      backgroundColor: payer?.faceBg || '#eadfd5',
                      color: payer?.faceColor || '#74573f',
                    }}
                    title={`${getPayerName(expense.payerId)} (${t.paidBy})`}
                  >
                    {payer
                      ? lang === 'zh'
                        ? payer.avatarLetterZh
                        : payer.avatarLetterEn
                      : 'P'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium text-[#20241f] group-hover:text-[#416f54] transition-colors truncate">
                        {lang === 'zh' ? expense.nameZh : expense.nameEn}
                      </span>

                      {/* Status Tag */}
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 bg-[#f8efe8] text-[#c87943] px-2 py-0.5 rounded-[5px] text-[10px] font-medium border border-[#efa576]/30 shrink-0">
                          <Clock className="w-2.5 h-2.5 animate-spin" />
                          {t.pendingTag} ({confirmedCount}/{totalCount})
                        </span>
                      ) : isPersonal ? (
                        <span className="bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium shrink-0">
                          {t.personalTag}
                        </span>
                      ) : expense.status === 'settled' ? (
                        <span className="bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium shrink-0">
                          {t.settledTag}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {t.confirmedTag}
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="text-[11px] text-[#777e75] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{expense.date.replace('T', ' ')}</span>
                      <span>·</span>
                      <span>{getLedgerName(expense.ledgerId)}</span>
                      <span>·</span>
                      <span>
                        {lang === 'zh' ? '付款人：' : 'Paid by: '}
                        <strong className="font-medium text-[#20241f]">
                          {getPayerName(expense.payerId)}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        {expense.splitMethod === 'equal'
                          ? t.equalSplit
                          : expense.splitMethod === 'shares'
                          ? t.byShares
                          : t.customSplit}
                      </span>
                    </div>

                    {/* Participant Avatars preview */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-[#777e75]">
                        {lang === 'zh' ? '参与成员：' : 'Participants:'}
                      </span>
                      <div className="flex -space-x-1">
                        {expense.splits.map((s) => {
                          const m = members.find((mem) => mem.id === s.memberId);
                          if (!m) return null;
                          return (
                            <div
                              key={m.id}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold border ${
                                s.confirmed
                                  ? 'border-white'
                                  : 'border-[#c87943] ring-1 ring-[#c87943]'
                              }`}
                              style={{ backgroundColor: m.faceBg, color: m.faceColor }}
                              title={`${lang === 'zh' ? m.nameZh : m.nameEn}: ¥${s.shareAmount} (${
                                s.confirmed ? t.alreadyConfirmed : t.pendingConfirm
                              })`}
                            >
                              {lang === 'zh' ? m.avatarLetterZh : m.avatarLetterEn}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount and Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f6f7f4]">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-semibold text-[#20241f]">
                      {formatCurrency(expense.amount, true)}
                    </div>
                    {isPending && (
                      <div className="text-[10px] text-[#c87943] font-medium">
                        {lang === 'zh' ? '待全员确认' : 'Awaiting confirmation'}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReview(expense);
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#416f54] hover:text-[#365c46] hover:underline font-medium"
                  >
                    <span>{lang === 'zh' ? '查看流转' : 'Review details'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
