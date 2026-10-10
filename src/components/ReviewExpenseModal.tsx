import React, { useState } from 'react';
import { Expense, Language, Ledger, Member } from '../types';
import { translations } from '../locales/i18n';
import { formatCurrency } from '../utils/format';
import { X, Check, Clock, Edit3, Sparkles, CheckCircle2 } from 'lucide-react';

interface ReviewExpenseModalProps {
  lang: Language;
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  ledgers: Ledger[];
  onConfirmMember: (expenseId: string, memberId: string) => void;
  onConfirmAll: (expenseId: string) => void;
  onProposeChange: (expenseId: string, memberId: string, newAmount: number, reason: string) => void;
}

export const ReviewExpenseModal: React.FC<ReviewExpenseModalProps> = ({
  lang,
  expense,
  isOpen,
  onClose,
  members,
  ledgers,
  onConfirmMember,
  onConfirmAll,
  onProposeChange,
}) => {
  const t = translations[lang];
  const [proposingMemberId, setProposingMemberId] = useState<string | null>(null);
  const [proposedAmount, setProposedAmount] = useState<string>('');
  const [proposedReason, setProposedReason] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState(false);

  if (!isOpen || !expense) return null;

  const isAllConfirmed = expense.splits.every((s) => s.confirmed);
  const ledger = ledgers.find((l) => l.id === expense.ledgerId);
  const payer = members.find((m) => m.id === expense.payerId);

  const handleConfirmSingle = (memberId: string) => {
    onConfirmMember(expense.id, memberId);

    // Check if this was the last pending one
    const pendingOthers = expense.splits.filter((s) => s.memberId !== memberId && !s.confirmed);
    if (pendingOthers.length === 0) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
    }
  };

  const handleConfirmAllClick = () => {
    onConfirmAll(expense.id);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3500);
  };

  const handleProposeSubmit = (memberId: string) => {
    const amt = parseFloat(proposedAmount);
    if (!amt || amt <= 0) {
      alert(lang === 'zh' ? '请输入有效金额' : 'Please enter a valid amount');
      return;
    }
    onProposeChange(
      expense.id,
      memberId,
      amt,
      proposedReason || (lang === 'zh' ? '申请调整金额' : 'Adjustment requested')
    );
    setProposingMemberId(null);
    setProposedAmount('');
    setProposedReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#e8ebe5] rounded-2xl w-full max-w-[620px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e8ebe5] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#20241f] m-0">
                {t.reviewTitle}
              </h2>
              {isAllConfirmed ? (
                <span className="bg-[#edf4ee] text-[#416f54] text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.confirmedTag}
                </span>
              ) : (
                <span className="bg-[#f8efe8] text-[#c87943] text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#efa576]/30">
                  <Clock className="w-3 h-3 animate-spin" />
                  {t.pendingTag}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#777e75] mt-0.5">
              {t.reviewSubtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Celebration Banner when completed */}
        {showCelebration && (
          <div className="bg-[#edf4ee] border-b border-[#416f54]/30 p-3 flex items-center gap-2 text-xs text-[#416f54] font-medium animate-in slide-in-from-top duration-300">
            <Sparkles className="w-4 h-4 shrink-0 text-[#416f54]" />
            <span>{t.allConfirmedToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Bill summary overview card */}
          <div className="p-3.5 bg-[#f6f7f4] border border-[#e8ebe5] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#20241f]">
                {lang === 'zh' ? expense.nameZh : expense.nameEn}
              </div>
              <div className="text-[11px] text-[#777e75] mt-0.5">
                {expense.date.replace('T', ' ')} · {ledger ? (lang === 'zh' ? ledger.nameZh : ledger.nameEn) : ''} ·{' '}
                {lang === 'zh' ? '付款人：' : 'Payer: '}
                <strong className="text-[#20241f]">
                  {payer ? (lang === 'zh' ? payer.nameZh : payer.nameEn) : expense.payerId}
                </strong>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base sm:text-lg font-bold text-[#20241f]">
                {formatCurrency(expense.amount, true)}
              </div>
              <div className="text-[10px] text-[#777e75]">
                {expense.splitMethod === 'equal'
                  ? t.equalSplit
                  : expense.splitMethod === 'shares'
                  ? t.byShares
                  : t.customSplit}
              </div>
            </div>
          </div>

          {/* Workflow Status Info */}
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
              isAllConfirmed
                ? 'bg-[#edf4ee] border border-[#416f54]/20 text-[#416f54]'
                : 'bg-[#f8efe8] border border-[#efa576]/30 text-[#20241f]'
            }`}
          >
            {isAllConfirmed ? (
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#416f54]" />
            ) : (
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-[#c87943]" />
            )}
            <div>
              <div className="font-semibold">
                {isAllConfirmed ? t.reviewStatusApproved : t.reviewStatusPending}
              </div>
              <div className="text-[10px] text-[#777e75] mt-0.5">
                {isAllConfirmed
                  ? lang === 'zh'
                    ? '所有参与成员均已完成分摊确认，已正式计入各自账本与统计分析中。'
                    : 'All members confirmed their shares. This bill is officially included in personal ledgers and analytics.'
                  : lang === 'zh'
                    ? '新建账单先进入待确认状态；参与成员可逐一确认或提出修改。全部确认后才会计入各自账本与统计。'
                    : 'New bills stay pending until all participants approve. Below you can simulate approvals as members.'}
              </div>
            </div>
          </div>

          {/* Participants Review List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#20241f]">
                {lang === 'zh' ? '成员确认进度' : 'Member confirmation progress'}
              </span>
              {!isAllConfirmed && (
                <button
                  onClick={handleConfirmAllClick}
                  className="text-[11px] text-[#416f54] hover:text-[#365c46] hover:underline font-medium cursor-pointer"
                >
                  {lang === 'zh' ? '⚡ 一键全员确认' : '⚡ Confirm all'}
                </button>
              )}
            </div>

            <div className="divide-y divide-[#e8ebe5] bg-white border border-[#e8ebe5] rounded-xl overflow-hidden shadow-2xs">
              {expense.splits.map((split) => {
                const member = members.find((m) => m.id === split.memberId);
                if (!member) return null;
                const isPayer = split.memberId === expense.payerId;
                const isProposing = proposingMemberId === split.memberId;

                return (
                  <div key={split.memberId} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                          style={{ backgroundColor: member.faceBg, color: member.faceColor }}
                        >
                          {lang === 'zh' ? member.avatarLetterZh : member.avatarLetterEn}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#20241f]">
                            <span>{lang === 'zh' ? member.nameZh : member.nameEn}</span>
                            {isPayer && (
                              <span className="text-[9px] bg-[#edf4ee] text-[#416f54] px-1.5 py-0.2 rounded font-medium">
                                {t.payerBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#777e75]">
                            {lang === 'zh' ? '分摊额：' : 'Share: '}
                            <strong className="text-[#20241f]">
                              {formatCurrency(split.shareAmount)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2">
                        {split.confirmed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#416f54] bg-[#edf4ee] px-2.5 py-1 rounded-md font-medium">
                            <Check className="w-3 h-3" />
                            {t.alreadyConfirmed}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setProposingMemberId(
                                  isProposing ? null : split.memberId
                                );
                                setProposedAmount(split.shareAmount.toString());
                              }}
                              className="px-2 py-1 rounded-md border border-[#e8ebe5] text-[10px] text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4] transition-colors"
                              title={t.proposeChange}
                            >
                              <Edit3 className="w-3 h-3 inline mr-1" />
                              {t.proposeChange}
                            </button>
                            <button
                              onClick={() => handleConfirmSingle(split.memberId)}
                              className="px-2.5 py-1 rounded-md bg-[#416f54] hover:bg-[#365c46] text-white text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                            >
                              {lang === 'zh' ? `模拟 ${member.nameZh} 确认` : `Approve as ${member.nameEn}`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Propose Change Form Expansion */}
                    {isProposing && (
                      <div className="mt-2.5 p-2.5 bg-[#f6f7f4] rounded-lg border border-[#e8ebe5] space-y-2 animate-in fade-in duration-150">
                        <div className="text-[11px] font-semibold text-[#20241f]">
                          {t.proposeChangeTitle}（{lang === 'zh' ? member.nameZh : member.nameEn}）
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#777e75]">¥</span>
                          <input
                            type="number"
                            step="0.01"
                            value={proposedAmount}
                            onChange={(e) => setProposedAmount(e.target.value)}
                            className="w-24 bg-white border border-[#e8ebe5] rounded px-2 py-1 text-xs text-[#20241f] outline-none"
                            placeholder="新金额"
                          />
                          <input
                            type="text"
                            value={proposedReason}
                            onChange={(e) => setProposedReason(e.target.value)}
                            placeholder={lang === 'zh' ? '修改理由，如：没喝酒少算' : 'Reason for change'}
                            className="flex-1 bg-white border border-[#e8ebe5] rounded px-2 py-1 text-xs text-[#20241f] outline-none"
                          />
                          <button
                            onClick={() => handleProposeSubmit(split.memberId)}
                            className="px-2.5 py-1 bg-[#416f54] text-white rounded text-xs font-medium cursor-pointer"
                          >
                            {t.confirm}
                          </button>
                          <button
                            onClick={() => setProposingMemberId(null)}
                            className="px-2 py-1 text-[#777e75] hover:text-[#20241f] text-xs cursor-pointer"
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-[#fafbfa] border-t border-[#e8ebe5] flex items-center justify-between">
          <span className="text-[10px] text-[#777e75]">
            {isAllConfirmed
              ? lang === 'zh'
                ? '状态：已生效计入账本'
                : 'Status: Confirmed and active in ledgers'
              : lang === 'zh'
              ? '支持单人模拟确认或一键全员通过'
              : 'Support individual or batch simulated approvals'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[#e8ebe5] bg-white hover:bg-[#f6f7f4] text-xs text-[#20241f] font-medium transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
