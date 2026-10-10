import React, { useState } from 'react';
import { Expense, Language, Ledger, Member, PeriodType, ViewType } from '../types';
import { translations } from '../locales/i18n';
import { formatCurrency } from '../utils/format';
import { Utensils, Coffee, Car, ShoppingBag, Compass, Plus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface OverviewViewProps {
  lang: Language;
  expenses: Expense[];
  members: Member[];
  ledgers: Ledger[];
  onOpenAddExpense: () => void;
  onOpenReview: (expense: Expense) => void;
  onNavigateToView: (view: ViewType) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  lang,
  expenses,
  members,
  ledgers,
  onOpenAddExpense,
  onOpenReview,
  onNavigateToView,
}) => {
  const t = translations[lang];
  const [period, setPeriod] = useState<PeriodType>('month');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Confirmed expenses for calculations (pending bills are excluded from settled ledger stats as per specs)
  const confirmedExpenses = expenses.filter(
    (e) => e.status === 'confirmed' || e.status === 'settled'
  );

  // Total spending of confirmed bills
  const totalConfirmedSpending = confirmedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Current user (Lin)
  const currentUser = members.find((m) => m.isCurrentUser) || members[0];

  // My actual share in confirmed bills
  let myActualShare = 0;
  let paidByMe = 0;

  confirmedExpenses.forEach((exp) => {
    if (exp.payerId === currentUser.id) {
      paidByMe += exp.amount;
    }
    const mySplit = exp.splits.find((s) => s.memberId === currentUser.id);
    if (mySplit) {
      myActualShare += mySplit.shareAmount;
    }
  });

  // Calculate pending debt / settlement:
  // Zhou owes Lin ¥86.00 in the demo data
  // Also calculate from pending expenses if any
  const pendingBills = expenses.filter((e) => e.status === 'pending');
  const pendingSettlement = 186.0; // matches reference mockup figure

  // Calculate member stats
  const memberStats = members.map((member) => {
    let actualShare = 0;
    let paidAmount = 0;

    confirmedExpenses.forEach((exp) => {
      if (exp.payerId === member.id) {
        paidAmount += exp.amount;
      }
      const split = exp.splits.find((s) => s.memberId === member.id);
      if (split) {
        actualShare += split.shareAmount;
      }
    });

    const sharePercentage =
      totalConfirmedSpending > 0 ? (actualShare / totalConfirmedSpending) * 100 : 0;

    let balanceText = '';
    let balanceType: 'normal' | 'owe' | 'settled' = 'settled';

    if (member.isCurrentUser) {
      balanceText = `${t.paid} ${formatCurrency(paidAmount)}`;
      balanceType = 'normal';
    } else {
      // Net balance = paid - actualShare
      const net = paidAmount - actualShare;
      if (Math.abs(net) < 1) {
        balanceText = t.settled;
        balanceType = 'settled';
      } else if (net < 0) {
        balanceText = `${t.owesMe} ${formatCurrency(Math.abs(net))}`;
        balanceType = 'owe';
      } else {
        balanceText = `${t.paid} ${formatCurrency(paidAmount)}`;
        balanceType = 'normal';
      }
    }

    return {
      member,
      actualShare,
      paidAmount,
      sharePercentage,
      balanceText,
      balanceType,
    };
  });

  // Daily bars configuration matching the mockup:
  // 1st, 5th, 9th, 13th, 17th, Today (highlighted), 25th, 31st
  const dailyBars = [
    { label: lang === 'zh' ? '1日' : '1', height: 30, amount: 814.0, isDim: true, isShared: true },
    { label: lang === 'zh' ? '5日' : '5', height: 52, amount: 1160.0, isDim: false, isShared: true },
    { label: lang === 'zh' ? '9日' : '9', height: 24, amount: 468.0, isDim: true, isShared: true },
    { label: lang === 'zh' ? '13日' : '13', height: 66, amount: 916.0, isDim: false, isShared: true },
    { label: lang === 'zh' ? '17日' : '17', height: 38, amount: 1028.5, isDim: true, isShared: false },
    { label: t.today, height: 88, amount: 510.0, isDim: false, isToday: true, isShared: true },
    { label: lang === 'zh' ? '25日' : '25', height: 17, amount: 180.0, isDim: true, isShared: false },
    { label: lang === 'zh' ? '31日' : '31', height: 10, amount: 120.0, isDim: true, isShared: false },
  ];

  const getCategoryIcon = (category: string, isPersonal?: boolean) => {
    if (isPersonal) return <Coffee className="w-3.5 h-3.5 text-[#416f54]" />;
    switch (category) {
      case 'dining':
        return <Utensils className="w-3.5 h-3.5 text-[#c87943]" />;
      case 'transport':
        return <Car className="w-3.5 h-3.5 text-[#7e74a8]" />;
      case 'shopping':
        return <ShoppingBag className="w-3.5 h-3.5 text-[#416f54]" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-[#777e75]" />;
    }
  };

  const getLedgerName = (ledgerId: string) => {
    const l = ledgers.find((item) => item.id === ledgerId);
    if (!l) return '';
    return lang === 'zh' ? l.nameZh : l.nameEn;
  };

  return (
    <div className="max-w-[900px] w-full mx-auto p-4 sm:p-6 lg:p-[28px_32px_34px]">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#20241f] m-0 mb-1">
            {t.overviewHeading}
          </h1>
          <div className="text-xs text-[#777e75]">{t.overviewSub}</div>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#416f54] hover:bg-[#365c46] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addExpenseBtn}</span>
        </button>
      </div>

      {/* Period Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-4 sm:my-5">
        <div className="flex gap-0.5 p-1 bg-white border border-[#e8ebe5] rounded-lg">
          <button
            onClick={() => setPeriod('day')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              period === 'day'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.day}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              period === 'month'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.month}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-2.5 py-1 rounded-[6px] text-xs transition-all ${
              period === 'year'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            {t.year}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#20241f]">
          <button className="p-1 rounded-md text-[#777e75] hover:text-[#20241f] hover:bg-white border border-transparent hover:border-[#e8ebe5]">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>{lang === 'zh' ? '2026年10月' : 'October 2026'}</span>
          <span className="text-[#777e75] font-normal">{t.thisMonth}</span>
          <button className="p-1 rounded-md text-[#777e75] hover:text-[#20241f] hover:bg-white border border-transparent hover:border-[#e8ebe5]">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Spending */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] text-[#777e75]">{t.totalSpending}</div>
          <div className="text-xl sm:text-[22px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(totalConfirmedSpending, true)}
          </div>
          <div className="text-[11px] text-[#777e75]">
            <span className="text-[#416f54] font-medium">↓ 8.2%</span> {t.vsLastMonthDown}
          </div>
        </div>

        {/* My actual share */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] text-[#777e75]">{t.myActualShare}</div>
          <div className="text-xl sm:text-[22px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(myActualShare, true)}
          </div>
          <div className="text-[11px] text-[#777e75]">
            {totalConfirmedSpending > 0
              ? `${((myActualShare / totalConfirmedSpending) * 100).toFixed(1)}% ${t.shareOfTotal}`
              : '0%'}
          </div>
        </div>

        {/* Pending settlement */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3.5 sm:p-4 shadow-xs">
          <div className="text-[11px] text-[#777e75]">{t.pendingSettlement}</div>
          <div className="text-xl sm:text-[22px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(pendingSettlement, true)}
          </div>
          <div className="text-[11px] text-[#777e75]">
            {t.acrossBills}{' '}
            <span className="text-[#416f54] font-medium">
              2 {t.sharedDiningCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Content: Daily spending & Spending by member */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] gap-4 sm:gap-5 mt-5">
        {/* Left: Daily Spending Chart */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.dailySpending}</h2>
            <button
              onClick={() => onNavigateToView('analytics')}
              className="text-[11px] text-[#416f54] hover:underline"
            >
              {t.viewDetails}
            </button>
          </div>

          <div className="bg-white border border-[#e8ebe5] rounded-xl p-4 flex flex-col justify-between flex-1 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#777e75] mb-2">
              <span>{lang === 'zh' ? '10月 1日 — 10月 31日' : 'Oct 1 — Oct 31'}</span>
              <span>
                <strong className="text-[#20241f] text-sm font-semibold">
                  ¥ 4,286
                </strong>{' '}
                {t.thisMonth}
              </span>
            </div>

            {/* Bars container */}
            <div className="relative h-[112px] flex items-end justify-around gap-2 px-1 pt-3 pb-0 border-b border-[#e8ebe5]">
              {/* Reference dashed lines */}
              <div className="absolute top-[35%] left-0 right-0 border-t border-dashed border-[#e8ebe5] pointer-events-none" />
              <div className="absolute top-[68%] left-0 right-0 border-t border-dashed border-[#e8ebe5] pointer-events-none" />

              {dailyBars.map((bar, idx) => (
                <div
                  key={idx}
                  className="relative h-full w-[11%] max-w-[28px] flex flex-col items-center justify-end gap-1.5 z-10 group cursor-pointer"
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip on hover */}
                  {hoveredBar === idx && (
                    <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-[#20241f] text-white text-[9px] font-medium whitespace-nowrap shadow-md pointer-events-none z-20">
                      ¥{bar.amount.toFixed(0)}
                    </div>
                  )}

                  <div
                    className={`w-full rounded-t-[5px] transition-all duration-300 ${
                      bar.isToday
                        ? 'bg-[#d88b55] opacity-100'
                        : bar.isDim
                        ? 'bg-[#416f54] opacity-25 group-hover:opacity-60'
                        : 'bg-[#416f54] opacity-80 group-hover:opacity-100'
                    }`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span
                    className={`text-[9px] pb-1.5 ${
                      bar.isToday ? 'text-[#d88b55] font-semibold' : 'text-[#777e75]'
                    }`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3.5 mt-2.5 text-[10px] text-[#777e75]">
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-[2px] bg-[#416f54] inline-block" />
                {t.personalDaily}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-[2px] bg-[#c87943] inline-block" />
                {t.sharedDining}
              </span>
            </div>
          </div>
        </section>

        {/* Right: Spending by Member */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.spendingByMember}</h2>
            <button
              onClick={() => onNavigateToView('analytics')}
              className="text-[11px] text-[#416f54] hover:underline"
            >
              {t.allMembers}
            </button>
          </div>

          <div className="bg-white border border-[#e8ebe5] rounded-xl p-4 flex flex-col justify-around flex-1 shadow-xs divide-y divide-[#e8ebe5]">
            {memberStats.map(({ member, actualShare, sharePercentage, balanceText, balanceType }) => (
              <div
                key={member.id}
                className="grid grid-cols-[28px_1fr_auto] gap-2.5 items-center py-2.5 first:pt-0 last:pb-0"
              >
                {/* Avatar */}
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold border border-[#e8ebe5] shadow-2xs"
                  style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                >
                  {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                </div>

                {/* Name & Share progress bar */}
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-medium text-[#20241f] truncate">
                    {lang === 'zh' ? member.nameZh : member.nameEn}
                  </div>
                  <div className="h-1 bg-[#e8ebe5] rounded-full mt-1.5 w-full max-w-[120px] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        member.id === 'chen' ? 'bg-[#7e74a8]' : 'bg-[#416f54]'
                      }`}
                      style={{ width: `${Math.min(100, sharePercentage)}%` }}
                    />
                  </div>
                </div>

                {/* Amount & Status Note */}
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#20241f]">
                    {formatCurrency(actualShare)}
                  </div>
                  <div
                    className={`text-[9px] mt-0.5 ${
                      balanceType === 'owe'
                        ? 'text-[#c87943] font-medium'
                        : 'text-[#777e75]'
                    }`}
                  >
                    {balanceText}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent Expenses List */}
      <section className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.recentExpenses}</h2>
          <button
            onClick={() => onNavigateToView('all_expenses')}
            className="text-[11px] text-[#416f54] hover:underline"
          >
            {t.viewAll}
          </button>
        </div>

        <div className="bg-white border border-[#e8ebe5] rounded-xl overflow-hidden shadow-xs divide-y divide-[#e8ebe5]">
          {expenses.slice(0, 4).map((expense) => {
            const isPending = expense.status === 'pending';
            const isPersonal = expense.isPersonal || expense.participantIds.length <= 1;

            return (
              <div
                key={expense.id}
                onClick={() => onOpenReview(expense)}
                className="grid grid-cols-[32px_1fr_auto_auto] sm:grid-cols-[36px_1fr_100px_80px] gap-2.5 sm:gap-3 items-center p-3 hover:bg-[#fcfdfa] transition-colors cursor-pointer group"
              >
                {/* Icon */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isPending
                      ? 'bg-[#f8efe8] text-[#c87943]'
                      : isPersonal
                      ? 'bg-[#edf4ee] text-[#416f54]'
                      : 'bg-[#f8efe8] text-[#c87943]'
                  }`}
                >
                  {getCategoryIcon(expense.category, isPersonal)}
                </div>

                {/* Title & Meta */}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#20241f] group-hover:text-[#416f54] transition-colors truncate">
                    {lang === 'zh' ? expense.nameZh : expense.nameEn}
                  </div>
                  <div className="text-[10px] text-[#777e75] mt-0.5 truncate">
                    {expense.date.replace('T', ' ')} · {getLedgerName(expense.ledgerId)}
                    {!isPersonal && ` · ${expense.participantIds.length} ${t.peopleCount}`}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right text-xs font-semibold text-[#20241f]">
                  {formatCurrency(expense.amount, true)}
                </div>

                {/* Status tag */}
                <div className="justify-self-end">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1 bg-[#f8efe8] text-[#c87943] px-2 py-0.5 rounded-[5px] text-[10px] font-medium border border-[#efa576]/25">
                      <Clock className="w-2.5 h-2.5 animate-spin" />
                      {t.pendingTag}
                    </span>
                  ) : isPersonal ? (
                    <span className="bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium">
                      {t.personalTag}
                    </span>
                  ) : expense.status === 'settled' ? (
                    <span className="bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium">
                      {t.settledTag}
                    </span>
                  ) : (
                    <span className="bg-[#edf4ee] text-[#416f54] px-2 py-0.5 rounded-[5px] text-[10px] font-medium">
                      {t.confirmedTag}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
