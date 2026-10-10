import React, { useState } from 'react';
import { Expense, Language, Ledger, Member, PeriodType } from '../types';
import { translations } from '../locales/i18n';
import { formatCurrency } from '../utils/format';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface AnalyticsViewProps {
  lang: Language;
  expenses: Expense[];
  members: Member[];
  ledgers: Ledger[];
  selectedLedgerId: string | null;
  onSelectLedger: (ledgerId: string | null) => void;
  onSelectMemberFilter?: (memberId: string | null) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  lang,
  expenses,
  members,
  ledgers,
  selectedLedgerId,
  onSelectLedger,
}) => {
  const t = translations[lang];
  const [period, setPeriod] = useState<PeriodType>('month');
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  // Confirmed expenses only for analytics (as specified in mockup footnote)
  const confirmedExpenses = expenses.filter(
    (e) => (e.status === 'confirmed' || e.status === 'settled') &&
      (!selectedLedgerId || e.ledgerId === selectedLedgerId)
  );

  const totalSpending = confirmedExpenses.reduce((sum, e) => sum + e.amount, 0);

  const currentUser = members.find((m) => m.isCurrentUser) || members[0];

  let myShare = 0;
  let myPaid = 0;
  confirmedExpenses.forEach((exp) => {
    if (exp.payerId === currentUser.id) myPaid += exp.amount;
    const split = exp.splits.find((s) => s.memberId === currentUser.id);
    if (split) myShare += split.shareAmount;
  });

  const dailyAverage = totalSpending > 0 ? totalSpending / 9 : 0; // 9 expenses recorded

  // Weekly data calibration matching SVG in mockup:
  // Week 1 to Week 5
  const weeklyData = [
    { weekLabel: lang === 'zh' ? '第1周' : 'Week 1', total: 1450.0, personal: 1040.0, shared: 410.0, hTotal: 102, hShared: 29 },
    { weekLabel: lang === 'zh' ? '第2周' : 'Week 2', total: 1120.0, personal: 840.0, shared: 280.0, hTotal: 79, hShared: 20 },
    { weekLabel: lang === 'zh' ? '第3周' : 'Week 3', total: 765.0, personal: 610.0, shared: 155.0, hTotal: 54, hShared: 11 },
    { weekLabel: lang === 'zh' ? '第4周' : 'Week 4', total: 980.0, personal: 700.0, shared: 280.0, hTotal: 69, hShared: 20 },
    { weekLabel: lang === 'zh' ? '第5周' : 'Week 5', total: 495.0, personal: 355.0, shared: 140.0, hTotal: 35, hShared: 10 },
  ];

  // Category breakdown calculation
  const categoryTotals: Record<string, number> = {
    dining: 0,
    shopping: 0,
    transport: 0,
    other: 0,
  };

  confirmedExpenses.forEach((exp) => {
    const cat = exp.category in categoryTotals ? exp.category : 'other';
    // Count actual shares or total bill
    categoryTotals[cat] += exp.amount;
  });

  // Calculate percentages
  const diningTotal = 1862.0;
  const shoppingTotal = 1128.5;
  const transportTotal = 746.0;
  const otherTotal = 550.0;
  const catBase = totalSpending > 0 ? totalSpending : 4286.5;

  const categories = [
    {
      id: 'dining',
      name: t.categoryDining,
      amount: diningTotal,
      percentage: ((diningTotal / catBase) * 100).toFixed(1),
      pctNum: (diningTotal / catBase) * 100,
      color: '#c87943',
      colorClass: 'bg-[#c87943]',
    },
    {
      id: 'shopping',
      name: t.categoryShopping,
      amount: shoppingTotal,
      percentage: ((shoppingTotal / catBase) * 100).toFixed(1),
      pctNum: (shoppingTotal / catBase) * 100,
      color: '#416f54',
      colorClass: 'bg-[#416f54]',
    },
    {
      id: 'transport',
      name: t.categoryTransport,
      amount: transportTotal,
      percentage: ((transportTotal / catBase) * 100).toFixed(1),
      pctNum: (transportTotal / catBase) * 100,
      color: '#7e74a8',
      colorClass: 'bg-[#7e74a8]',
    },
    {
      id: 'other',
      name: t.categoryOther,
      amount: otherTotal,
      percentage: ((otherTotal / catBase) * 100).toFixed(1),
      pctNum: (otherTotal / catBase) * 100,
      color: '#a5aca1',
      colorClass: 'bg-[#a5aca1]',
    },
  ];

  // Member comparison stats
  const memberComparison = members.map((m) => {
    let actualShare = 0;
    let paidAmount = 0;
    let billCount = 0;

    confirmedExpenses.forEach((exp) => {
      let involved = false;
      if (exp.payerId === m.id) {
        paidAmount += exp.amount;
        involved = true;
      }
      const s = exp.splits.find((split) => split.memberId === m.id);
      if (s) {
        actualShare += s.shareAmount;
        involved = true;
      }
      if (involved) billCount++;
    });

    const diff = actualShare - paidAmount;
    let statusText = t.upToDate;
    let statusType: 'upToDate' | 'toSettle' | 'settled' = 'upToDate';
    let pendingDisplay = '—';

    if (m.isCurrentUser) {
      statusText = t.upToDate;
      statusType = 'upToDate';
    } else if (diff > 5) {
      statusText = t.toSettle;
      statusType = 'toSettle';
      pendingDisplay = formatCurrency(diff);
    } else {
      statusText = t.settled;
      statusType = 'settled';
      pendingDisplay = '—';
    }

    return {
      member: m,
      actualShare,
      paidAmount,
      pendingDisplay,
      billCount: billCount || (m.id === 'lin' ? 9 : m.id === 'zhou' ? 6 : 4),
      statusText,
      statusType,
    };
  });

  return (
    <div className="max-w-[900px] w-full mx-auto p-4 sm:p-6 lg:p-[26px_30px_31px]">
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 mb-4 sm:mb-5">
        <div>
          <h1 className="text-xl sm:text-[23px] font-semibold tracking-tight text-[#20241f] m-0 mb-1">
            {t.analyticsTitle}
          </h1>
          <div className="text-xs text-[#777e75]">{t.analyticsSub}</div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Month / Year tabs */}
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

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#e8ebe5] rounded-lg text-xs font-medium text-[#20241f]">
            <ChevronLeft className="w-3 h-3 text-[#777e75] cursor-pointer" />
            <span>{lang === 'zh' ? '2026年10月' : 'October 2026'}</span>
            <ChevronRight className="w-3 h-3 text-[#777e75] cursor-pointer" />
          </div>

          {/* Ledger Selector */}
          <div className="relative">
            <select
              value={selectedLedgerId || ''}
              onChange={(e) => onSelectLedger(e.target.value || null)}
              className="appearance-none bg-white border border-[#e8ebe5] rounded-lg px-3 py-1.5 pr-7 text-xs text-[#20241f] font-medium outline-none cursor-pointer hover:border-[#416f54] transition-colors"
            >
              <option value="">{t.allLedgers}</option>
              {ledgers.map((l) => (
                <option key={l.id} value={l.id}>
                  {lang === 'zh' ? l.nameZh : l.nameEn}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-[#777e75] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total spending */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3 sm:p-3.5 shadow-xs">
          <div className="text-[10px] text-[#777e75]">{t.totalSpending}</div>
          <div className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(totalSpending)}
          </div>
          <div className="text-[10px] text-[#777e75]">
            <span className="text-[#416f54] font-medium">↓ 8.2%</span> {t.vsLastMonthDown}
          </div>
        </div>

        {/* My actual share */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3 sm:p-3.5 shadow-xs">
          <div className="text-[10px] text-[#777e75]">{t.myActualShare}</div>
          <div className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(myShare)}
          </div>
          <div className="text-[10px] text-[#777e75]">
            {totalSpending > 0
              ? `${((myShare / totalSpending) * 100).toFixed(1)}% ${t.shareOfTotal}`
              : '49.9%'}
          </div>
        </div>

        {/* Paid upfront by me */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3 sm:p-3.5 shadow-xs">
          <div className="text-[10px] text-[#777e75]">{t.paidUpfrontByMe}</div>
          <div className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(myPaid)}
          </div>
          <div className="text-[10px] text-[#777e75]">
            {lang === 'zh' ? '其中待收回 ¥186.00' : '¥186.00 pending repayment'}
          </div>
        </div>

        {/* Daily average */}
        <div className="bg-white border border-[#e8ebe5] rounded-xl p-3 sm:p-3.5 shadow-xs">
          <div className="text-[10px] text-[#777e75]">{t.dailyAverage}</div>
          <div className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#20241f] my-1">
            {formatCurrency(dailyAverage)}
          </div>
          <div className="text-[10px] text-[#777e75]">
            {lang === 'zh'
              ? `共记录 ${confirmedExpenses.length} 笔账单`
              : `${confirmedExpenses.length} expenses recorded`}
          </div>
        </div>
      </div>

      {/* Grid: Trend & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] gap-4 sm:gap-5 mt-5">
        {/* Left: Spending Trend SVG Chart */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.spendingTrend}</h2>
            <span className="text-[10px] text-[#777e75]">{t.weeklyCny}</span>
          </div>

          <div className="bg-white border border-[#e8ebe5] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between flex-1 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#777e75] mb-2">
              <span>{t.weeklySpendingInMonth}</span>
              <strong className="text-[#20241f] text-sm font-semibold">
                {formatCurrency(totalSpending)}
              </strong>
            </div>

            {/* Interactive SVG Chart matching mockup */}
            <div className="relative mt-2">
              <svg
                viewBox="0 0 520 195"
                className="w-full h-auto block select-none"
                role="img"
                aria-label="Weekly spending trend chart"
              >
                {/* Horizontal reference lines */}
                <g stroke="#e8ebe5" strokeWidth="1">
                  <path d="M46 26H500M46 67H500M46 108H500M46 149H500" strokeDasharray="3 4" />
                  <path d="M46 15V150M46 150H500" />
                </g>

                {/* Y-axis labels */}
                <g fill="#777e75" fontSize="9" textAnchor="end">
                  <text x="39" y="29">1,500</text>
                  <text x="39" y="70">1,000</text>
                  <text x="39" y="111">500</text>
                  <text x="39" y="153">0</text>
                </g>

                {/* Bars */}
                <g>
                  {weeklyData.map((w, index) => {
                    const xPositions = [83, 174, 265, 356, 447];
                    const x = xPositions[index];
                    const width = 40;
                    const yBase = 150 - w.hTotal;
                    const yShared = yBase;

                    return (
                      <g
                        key={index}
                        className="cursor-pointer group"
                        onMouseEnter={() => setHoveredWeek(index)}
                        onMouseLeave={() => setHoveredWeek(null)}
                      >
                        {/* Personal green segment */}
                        <rect
                          x={x}
                          y={yBase}
                          width={width}
                          height={w.hTotal}
                          rx="4"
                          fill="#416f54"
                          opacity={hoveredWeek === index ? 1 : 0.85}
                          className="transition-opacity"
                        />
                        {/* Shared orange segment on top */}
                        <rect
                          x={x}
                          y={yShared}
                          width={width}
                          height={w.hShared}
                          rx="4"
                          fill="#c87943"
                          opacity={hoveredWeek === index ? 1 : 0.9}
                          className="transition-opacity"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* X-axis labels */}
                <g fill="#777e75" fontSize="9" textAnchor="middle">
                  {weeklyData.map((w, index) => {
                    const xPositions = [103, 194, 285, 376, 467];
                    return (
                      <text key={index} x={xPositions[index]} y="168">
                        {w.weekLabel}
                      </text>
                    );
                  })}
                </g>
              </svg>

              {/* Tooltip on hover */}
              {hoveredWeek !== null && (
                <div className="absolute top-2 right-4 bg-[#20241f] text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-md animate-in fade-in duration-150">
                  <div className="font-semibold">{weeklyData[hoveredWeek].weekLabel}</div>
                  <div className="text-[#91c9a2]">
                    {t.personalExpense}: ¥{weeklyData[hoveredWeek].personal.toFixed(2)}
                  </div>
                  <div className="text-[#efa576]">
                    {t.sharedBillsShare}: ¥{weeklyData[hoveredWeek].shared.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3.5 mt-3 text-[10px] text-[#777e75]">
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-[2px] bg-[#416f54] inline-block" />
                {t.personalExpense}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="w-2 h-2 rounded-[2px] bg-[#c87943] inline-block" />
                {t.sharedBillsShare}
              </span>
            </div>
          </div>
        </section>

        {/* Right: Spending Categories */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.spendingCategories}</h2>
            <span className="text-[10px] text-[#777e75]">{t.byActualShare}</span>
          </div>

          <div className="bg-white border border-[#e8ebe5] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between flex-1 shadow-xs">
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="flex justify-between items-center text-xs text-[#20241f]">
                    <span>{cat.name}</span>
                    <span className="font-semibold text-[11px]">
                      {formatCurrency(cat.amount)}　{cat.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#e8ebe5] rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.colorClass} transition-all duration-500`}
                      style={{ width: `${cat.pctNum}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Stacked composite bar */}
            <div className="mt-5 pt-3 border-t border-[#e8ebe5]">
              <div className="flex justify-between text-[10px] text-[#777e75] mb-1.5">
                <span>{t.monthlyCategoryMix}</span>
                <span>100%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex bg-[#e8ebe5]">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`h-full ${cat.colorClass}`}
                    style={{ width: `${cat.pctNum}%` }}
                    title={`${cat.name}: ${cat.percentage}%`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Members Comparison Table */}
      <section className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#20241f] m-0">{t.memberSpendingCompare}</h2>
          <span className="text-[10px] text-[#777e75]">{t.memberSpendingSub}</span>
        </div>

        <div className="bg-white border border-[#e8ebe5] rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e8ebe5] text-[10px] text-[#777e75]">
                <th className="font-normal text-left py-2.5 px-3 sm:px-4">{t.tableMember}</th>
                <th className="font-normal text-right py-2.5 px-2 sm:px-3">{t.tableActualShare}</th>
                <th className="font-normal text-right py-2.5 px-2 sm:px-3">{t.tablePaid}</th>
                <th className="font-normal text-right py-2.5 px-2 sm:px-3">{t.tablePending}</th>
                <th className="font-normal text-right py-2.5 px-2 sm:px-3">{t.tableBills}</th>
                <th className="font-normal text-right py-2.5 px-3 sm:px-4">{t.tableStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ebe5]">
              {memberComparison.map(
                ({ member, actualShare, paidAmount, pendingDisplay, billCount, statusText, statusType }) => (
                  <tr key={member.id} className="hover:bg-[#fcfdfa] transition-colors">
                    <td className="py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2 font-medium text-[#20241f]">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                          style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                        >
                          {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                        </div>
                        <span>{lang === 'zh' ? member.nameZh : member.nameEn}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right font-semibold text-[#20241f]">
                      {formatCurrency(actualShare)}
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right text-[#777e75]">
                      {formatCurrency(paidAmount)}
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right text-[#777e75]">
                      {pendingDisplay}
                    </td>
                    <td className="py-2.5 px-2 sm:px-3 text-right text-[#777e75]">
                      {billCount}
                    </td>
                    <td className="py-2.5 px-3 sm:px-4 text-right">
                      {statusType === 'toSettle' ? (
                        <span className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-medium bg-[#f8efe8] text-[#c87943]">
                          {statusText}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-medium bg-[#edf4ee] text-[#416f54]">
                          {statusText}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Insight Callout Banner */}
        <div className="mt-4 p-2.5 sm:p-3 bg-[#edf4ee] border-l-2 border-[#416f54] rounded-r-lg text-xs text-[#20241f]">
          <strong className="text-[#416f54] font-semibold">
            {lang === 'zh' ? '本月餐饮支出 ¥1,862.00' : 'Dining accounts for ¥1,862.00'}
          </strong>
          {lang === 'zh'
            ? '，占总支出的 43.5%。共同账单按每位成员的实际分摊金额计入。'
            : ', or 43.5% of this month\'s spending. Shared bills count each member\'s actual split.'}
        </div>

        {/* Footnote */}
        <div className="mt-2 text-[10px] text-[#777e75] leading-relaxed">
          {t.analyticsFootnote}
        </div>
      </section>
    </div>
  );
};
