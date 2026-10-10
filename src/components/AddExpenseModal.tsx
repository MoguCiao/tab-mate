import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Language, Ledger, Member, MemberSplit, SplitMethod } from '../types';
import { translations } from '../locales/i18n';
import { formatCurrency } from '../utils/format';
import { X, Check, AlertCircle, Plus, Info } from 'lucide-react';

interface AddExpenseModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  ledgers: Ledger[];
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onOpenNewMemberModal: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  lang,
  isOpen,
  onClose,
  members,
  ledgers,
  onSaveExpense,
  onOpenNewMemberModal,
}) => {
  const t = translations[lang];

  // Pre-filled demo values as in reference mockup
  const [nameZh, setNameZh] = useState('火锅聚餐');
  const [nameEn, setNameEn] = useState('Hot pot dinner');
  const [amountStr, setAmountStr] = useState('468.00');
  const [dateTime, setDateTime] = useState('2026-10-09T19:20');
  const [ledgerId, setLedgerId] = useState(ledgers[0]?.id || 'weekend_dinners');
  const [category, setCategory] = useState<ExpenseCategory>('dining');
  const [payerId, setPayerId] = useState(members[0]?.id || 'lin');
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.id));
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const availableMembers = members.filter((member) => !member.memberLedgerIds || member.memberLedgerIds.includes(ledgerId));

  useEffect(() => {
    if (ledgers.length && !ledgers.some((ledger) => ledger.id === ledgerId)) setLedgerId(ledgers[0].id);
  }, [ledgers, ledgerId]);

  useEffect(() => {
    const allowedIds = new Set(availableMembers.map((member) => member.id));
    setParticipantIds((current) => {
      const next = current.filter((id) => allowedIds.has(id));
      return next.length ? next : (availableMembers[0] ? [availableMembers[0].id] : []);
    });
    if (!allowedIds.has(payerId) && availableMembers[0]) setPayerId(availableMembers[0].id);
  }, [ledgerId, members]);

  // Custom inputs: shares counts or custom amounts
  const [sharesMap, setSharesMap] = useState<Record<string, number>>({
    lin: 1,
    zhou: 1,
    chen: 1,
  });
  const [customAmountsMap, setCustomAmountsMap] = useState<Record<string, string>>({
    lin: '156.00',
    zhou: '156.00',
    chen: '156.00',
  });

  const parsedAmount = parseFloat(amountStr) || 0;

  // Toggle participant
  const toggleParticipant = (memberId: string) => {
    if (participantIds.includes(memberId)) {
      if (participantIds.length > 1) {
        setParticipantIds(participantIds.filter((id) => id !== memberId));
      }
    } else {
      setParticipantIds([...participantIds, memberId]);
    }
  };

  // Compute calculated splits
  const [calculatedSplits, setCalculatedSplits] = useState<MemberSplit[]>([]);
  const [isBalanced, setIsBalanced] = useState(true);
  const [balanceDifference, setBalanceDifference] = useState(0);

  useEffect(() => {
    if (participantIds.length === 0) {
      setCalculatedSplits([]);
      setIsBalanced(false);
      return;
    }

    if (splitMethod === 'equal') {
      const perPerson = Math.floor((parsedAmount / participantIds.length) * 100) / 100;
      let remaining = Math.round((parsedAmount - perPerson * participantIds.length) * 100) / 100;

      const splits: MemberSplit[] = participantIds.map((memId, idx) => {
        let share = perPerson;
        if (remaining > 0 && idx === 0) {
          share = Math.round((share + remaining) * 100) / 100;
        }
        return {
          memberId: memId,
          shareAmount: share,
          confirmed: memId === payerId, // Payer / Creator is pre-confirmed
        };
      });

      setCalculatedSplits(splits);
      setIsBalanced(true);
      setBalanceDifference(0);
    } else if (splitMethod === 'shares') {
      const totalShares = participantIds.reduce(
        (sum, id) => sum + (sharesMap[id] || 1),
        0
      );
      if (totalShares <= 0) return;

      const splits: MemberSplit[] = participantIds.map((memId) => {
        const memberShares = sharesMap[memId] || 1;
        const share = Math.round(((parsedAmount * memberShares) / totalShares) * 100) / 100;
        return {
          memberId: memId,
          shareAmount: share,
          sharesCount: memberShares,
          confirmed: memId === payerId,
        };
      });

      const currentSum = splits.reduce((s, item) => s + item.shareAmount, 0);
      const diff = Math.round((parsedAmount - currentSum) * 100) / 100;

      if (splits.length > 0 && Math.abs(diff) > 0) {
        splits[0].shareAmount = Math.round((splits[0].shareAmount + diff) * 100) / 100;
      }

      setCalculatedSplits(splits);
      setIsBalanced(true);
      setBalanceDifference(0);
    } else if (splitMethod === 'custom') {
      const splits: MemberSplit[] = participantIds.map((memId) => {
        const val = parseFloat(customAmountsMap[memId] || '0') || 0;
        return {
          memberId: memId,
          shareAmount: val,
          confirmed: memId === payerId,
        };
      });

      const sum = splits.reduce((acc, curr) => acc + curr.shareAmount, 0);
      const diff = Math.round((parsedAmount - sum) * 100) / 100;

      setCalculatedSplits(splits);
      setIsBalanced(Math.abs(diff) < 0.01);
      setBalanceDifference(diff);
    }
  }, [parsedAmount, participantIds, splitMethod, sharesMap, customAmountsMap, payerId]);

  if (!isOpen) return null;

  const handleSubmit = (isDraft: boolean = false) => {
    if (parsedAmount <= 0) {
      alert(lang === 'zh' ? '请输入有效金额' : 'Please enter a valid amount');
      return;
    }

    if (!isBalanced && !isDraft) {
      alert(
        lang === 'zh'
          ? `金额未平，相差 ¥${balanceDifference.toFixed(2)}，请核对`
          : `Amounts are not balanced. Difference: ¥${balanceDifference.toFixed(2)}`
      );
      return;
    }

    const newExpense: Omit<Expense, 'id' | 'createdAt'> = {
      nameZh: nameZh || '新账单',
      nameEn: nameEn || 'New expense',
      amount: parsedAmount,
      date: dateTime,
      ledgerId,
      category,
      payerId,
      participantIds,
      splitMethod,
      splits: calculatedSplits,
      status: isDraft ? 'draft' : 'pending',
      createdBy: payerId,
      isPersonal: participantIds.length === 1,
    };

    onSaveExpense(newExpense);
    onClose();
  };

  // Quick name suggestions
  const quickNames = [
    { zh: '火锅聚餐', en: 'Hot pot dinner', cat: 'dining' },
    { zh: '日料聚餐', en: 'Sushi dinner', cat: 'dining' },
    { zh: '咖啡午后加餐', en: 'Coffee snack', cat: 'dining' },
    { zh: '周末租车油费', en: 'Car rental & gas', cat: 'transport' },
    { zh: '超市采购买菜', en: 'Grocery shopping', cat: 'shopping' },
    { zh: '剧本杀桌游', en: 'Board game session', cat: 'entertainment' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#e8ebe5] rounded-2xl w-full max-w-[790px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-[20px_24px_16px] border-b border-[#e8ebe5] flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-[19px] font-semibold tracking-tight text-[#20241f] m-0">
              {t.addExpenseModalTitle}
            </h2>
            <div className="text-[11px] text-[#777e75] mt-0.5">
              {t.addExpenseModalCaption}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#fafbfa] border-b border-[#e8ebe5] text-[10px] text-[#777e75]">
          <span className="flex items-center gap-1.5 text-[#416f54] font-semibold">
            <span className="w-4 h-4 rounded-full bg-[#edf4ee] text-[#416f54] flex items-center justify-center font-bold text-[9px]">
              1
            </span>
            {t.step1}
          </span>
          <span className="w-6 sm:w-8 h-[1px] bg-[#e8ebe5]" />
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#edf4ee] text-[#416f54] flex items-center justify-center font-bold text-[9px]">
              2
            </span>
            {t.step2}
          </span>
          <span className="w-6 sm:w-8 h-[1px] bg-[#e8ebe5]" />
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#edf4ee] text-[#416f54] flex items-center justify-center font-bold text-[9px]">
              3
            </span>
            {t.step3}
          </span>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-4 sm:p-[16px_24px_20px] overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Expense Name */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-[#777e75] mb-1.5">
                <span>{t.expenseName}</span>
                <span className="text-[10px] text-[#416f54]">
                  {lang === 'zh' ? '支持快捷选择' : 'Quick fill'}
                </span>
              </div>
              <input
                type="text"
                value={lang === 'zh' ? nameZh : nameEn}
                onChange={(e) => {
                  if (lang === 'zh') {
                    setNameZh(e.target.value);
                    setNameEn(e.target.value);
                  } else {
                    setNameEn(e.target.value);
                    setNameZh(e.target.value);
                  }
                }}
                placeholder={t.expenseNamePlaceholder}
                className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54] transition-colors"
              />

              {/* Suggestions chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {quickNames.slice(0, 3).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNameZh(item.zh);
                      setNameEn(item.en);
                      setCategory(item.cat as ExpenseCategory);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#f6f7f4] text-[#777e75] hover:text-[#416f54] hover:bg-[#edf4ee] transition-colors border border-[#e8ebe5]"
                  >
                    {lang === 'zh' ? item.zh : item.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Amount */}
            <div>
              <div className="text-[11px] text-[#777e75] mb-1.5">{t.totalAmount}</div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-white border border-[#e8ebe5] rounded-lg pl-3 pr-12 py-1.5 text-base sm:text-lg font-semibold text-[#20241f] outline-none focus:border-[#416f54] transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#777e75] font-normal">
                  CNY
                </span>
              </div>
            </div>

            {/* Date and time */}
            <div>
              <div className="text-[11px] text-[#777e75] mb-1.5">{t.dateTime}</div>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54] transition-colors"
              />
            </div>

            {/* Add to Ledger */}
            <div>
              <div className="text-[11px] text-[#777e75] mb-1.5">{t.addToLedger}</div>
              <select
                value={ledgerId}
                onChange={(e) => setLedgerId(e.target.value)}
                className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54] transition-colors cursor-pointer"
              >
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {lang === 'zh' ? l.nameZh : l.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Paid By (Payer) - Full row */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between text-[11px] text-[#777e75] mb-1.5">
                <span>{t.paidBy}</span>
                <span className="text-[10px] text-[#777e75]">{t.paidByHint}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMembers.map((member) => {
                  const isSelected = payerId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setPayerId(member.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? 'bg-[#edf4ee] text-[#416f54] border-[#416f54] font-medium shadow-2xs'
                          : 'bg-white text-[#20241f] border-[#e8ebe5] hover:bg-[#f6f7f4]'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                        style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                      >
                        {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                      </div>
                      <span>{lang === 'zh' ? member.nameZh : member.nameEn}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={onOpenNewMemberModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[#e8ebe5] text-xs text-[#777e75] hover:text-[#416f54] hover:border-[#416f54] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '添加成员' : 'Add member'}</span>
                </button>
              </div>
            </div>

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-[#777e75] mb-1.5">
                <span>{t.participants}</span>
                <span className="text-[10px] text-[#416f54] font-medium">
                  {participantIds.length} {t.peopleCount}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableMembers.map((member) => {
                  const isSelected = participantIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleParticipant(member.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? 'bg-[#edf4ee] text-[#416f54] border-[#416f54] font-medium'
                          : 'bg-white text-[#777e75] border-[#e8ebe5] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold"
                        style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                      >
                        {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                      </div>
                      <span>{lang === 'zh' ? member.nameZh : member.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Method */}
            <div>
              <div className="text-[11px] text-[#777e75] mb-1.5">{t.splitMethod}</div>
              <div className="flex gap-1 p-0.5 bg-[#f6f7f4] border border-[#e8ebe5] rounded-lg">
                <button
                  type="button"
                  onClick={() => setSplitMethod('equal')}
                  className={`flex-1 py-1.5 rounded-[6px] text-xs transition-all ${
                    splitMethod === 'equal'
                      ? 'bg-white text-[#416f54] font-semibold shadow-xs'
                      : 'text-[#777e75] hover:text-[#20241f]'
                  }`}
                >
                  {t.equalSplit}
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('shares')}
                  className={`flex-1 py-1.5 rounded-[6px] text-xs transition-all ${
                    splitMethod === 'shares'
                      ? 'bg-white text-[#416f54] font-semibold shadow-xs'
                      : 'text-[#777e75] hover:text-[#20241f]'
                  }`}
                >
                  {t.byShares}
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod('custom')}
                  className={`flex-1 py-1.5 rounded-[6px] text-xs transition-all ${
                    splitMethod === 'custom'
                      ? 'bg-white text-[#416f54] font-semibold shadow-xs'
                      : 'text-[#777e75] hover:text-[#20241f]'
                  }`}
                >
                  {t.customSplit}
                </button>
              </div>

              <div className="text-[10px] text-[#777e75] mt-1.5">
                {splitMethod === 'equal' && t.equalSplitHint}
                {splitMethod === 'shares' && t.bySharesHint}
                {splitMethod === 'custom' && t.customSplitHint}
              </div>
            </div>
          </div>

          {/* Interactive controls for By Shares or Custom amounts */}
          {splitMethod === 'shares' && (
            <div className="p-3 bg-[#f6f7f4] border border-[#e8ebe5] rounded-xl space-y-2">
              <div className="text-[11px] font-medium text-[#20241f]">
                {lang === 'zh' ? '设置每人份额权重：' : 'Set shares weight:'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {participantIds.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  const currentShare = sharesMap[id] || 1;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#e8ebe5] text-xs"
                    >
                      <span className="truncate">{lang === 'zh' ? m?.nameZh : m?.nameEn}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSharesMap((prev) => ({
                              ...prev,
                              [id]: Math.max(1, currentShare - 1),
                            }))
                          }
                          className="w-5 h-5 rounded bg-[#f6f7f4] border border-[#e8ebe5] flex items-center justify-center font-bold text-xs hover:bg-[#edf4ee]"
                        >
                          -
                        </button>
                        <span className="font-semibold text-xs w-4 text-center">
                          {currentShare}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSharesMap((prev) => ({
                              ...prev,
                              [id]: currentShare + 1,
                            }))
                          }
                          className="w-5 h-5 rounded bg-[#f6f7f4] border border-[#e8ebe5] flex items-center justify-center font-bold text-xs hover:bg-[#edf4ee]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === 'custom' && (
            <div className="p-3 bg-[#f6f7f4] border border-[#e8ebe5] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#20241f]">
                <span>{lang === 'zh' ? '输入每人承担金额：' : 'Enter amount for each:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    // Auto balance difference to first member
                    if (participantIds.length > 0 && Math.abs(balanceDifference) > 0) {
                      const firstId = participantIds[0];
                      const current = parseFloat(customAmountsMap[firstId] || '0') || 0;
                      setCustomAmountsMap((prev) => ({
                        ...prev,
                        [firstId]: (current + balanceDifference).toFixed(2),
                      }));
                    }
                  }}
                  className="text-[10px] text-[#416f54] hover:underline"
                >
                  {lang === 'zh' ? '自动配平差额' : 'Auto balance'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {participantIds.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#e8ebe5] text-xs"
                    >
                      <span>{lang === 'zh' ? m?.nameZh : m?.nameEn}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#777e75]">¥</span>
                        <input
                          type="number"
                          step="0.01"
                          value={customAmountsMap[id] || ''}
                          onChange={(e) =>
                            setCustomAmountsMap((prev) => ({
                              ...prev,
                              [id]: e.target.value,
                            }))
                          }
                          className="w-20 px-2 py-1 text-right border border-[#e8ebe5] rounded text-xs outline-none focus:border-[#416f54]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Split Preview */}
          <div className="border-t border-[#e8ebe5] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#20241f]">{t.splitPreview}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#777e75]">
                  {lang === 'zh' ? `总计 ¥${parsedAmount.toFixed(2)}` : `Total ¥${parsedAmount.toFixed(2)}`}
                </span>
                {isBalanced ? (
                  <span className="text-[10px] text-[#416f54] bg-[#edf4ee] px-2 py-0.5 rounded-[5px] font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {t.balancedBadge}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#c87943] bg-[#f8efe8] px-2 py-0.5 rounded-[5px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t.unbalancedBadge}: ¥{Math.abs(balanceDifference).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Split member rows matching mockup */}
            <div className="divide-y divide-[#f2f4f0] bg-white border border-[#e8ebe5] rounded-xl overflow-hidden">
              {calculatedSplits.map((split) => {
                const member = members.find((m) => m.id === split.memberId);
                if (!member) return null;
                const isPayer = split.memberId === payerId;

                return (
                  <div
                    key={split.memberId}
                    className="grid grid-cols-[24px_1fr_auto_80px] gap-2.5 items-center p-2.5 text-xs"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                      style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                    >
                      {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-[#20241f] truncate">
                        {lang === 'zh' ? member.nameZh : member.nameEn}
                      </span>
                      {isPayer && (
                        <span className="text-[9px] bg-[#edf4ee] text-[#416f54] px-1.5 py-0.2 rounded font-medium">
                          {t.payerBadge}
                        </span>
                      )}
                    </div>

                    <div className="text-right font-semibold text-[#20241f]">
                      {formatCurrency(split.shareAmount)}
                    </div>

                    <div className="text-right">
                      {isPayer ? (
                        <span className="text-[10px] text-[#416f54] font-medium">
                          {t.iConfirmed}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#c87943] font-medium">
                          {t.pendingConfirm}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirmation Notice Card matching screenshot */}
          <div className="p-3 bg-[#f8efe8] rounded-xl flex items-start gap-2.5 text-[11px] text-[#20241f] border border-[#efa576]/30">
            <span className="text-[#c87943] text-sm leading-none shrink-0 mt-0.5">◉</span>
            <div>
              <div className="font-semibold text-[#20241f] leading-snug">
                {t.noticeTitle}
              </div>
              <div className="text-[10px] text-[#777e75] mt-0.5">
                {t.noticeDesc}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-[12px_24px_14px] bg-[#fafbfa] border-t border-[#e8ebe5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="hidden sm:inline-block text-[10px] text-[#777e75]">
            {t.createdNotice}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg border border-[#e8ebe5] bg-white hover:bg-[#f6f7f4] text-xs text-[#20241f] font-medium transition-colors cursor-pointer"
            >
              {t.saveDraft}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#416f54] hover:bg-[#365c46] text-xs text-white font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {t.saveAndRequest}
            </button>
          </div>
        </div>

        {/* Flow Explanation */}
        <div className="px-4 sm:px-6 pb-2.5 bg-[#fafbfa] text-right text-[9px] text-[#777e75]">
          {t.workflowFooter}
        </div>
      </div>
    </div>
  );
};
