import React, { useState, useEffect } from 'react';
import { Expense, Language, Ledger, Member, ViewType } from './types';
import {
  getStoredExpenses,
  saveStoredExpenses,
  getStoredMembers,
  saveStoredMembers,
  getStoredLedgers,
  saveStoredLedgers,
  getStoredLang,
  saveStoredLang,
  resetAllData,
  INITIAL_EXPENSES,
  INITIAL_MEMBERS,
  INITIAL_LEDGERS,
} from './utils/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './views/OverviewView';
import { AnalyticsView } from './views/AnalyticsView';
import { AllExpensesView } from './views/AllExpensesView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ReviewExpenseModal } from './components/ReviewExpenseModal';
import { NewLedgerModal } from './components/NewLedgerModal';
import { NewMemberModal } from './components/NewMemberModal';
import { translations } from './locales/i18n';
import { CheckCircle2, Clock } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { FriendsModal } from './components/FriendsModal';
import { supabase, loadWorkspace, saveExpenseCloud, saveLedgerCloud } from './utils/supabase';
import type { User } from '@supabase/supabase-js';

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);

  // Navigation & filtering state
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<Expense | null>(null);
  const [isNewLedgerOpen, setIsNewLedgerOpen] = useState(false);
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);

  // Toast banner state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const applyWorkspace = async (user: User) => {
    try {
      const workspace = await loadWorkspace(user);
      setMembers(workspace.members);
      setLedgers(workspace.ledgers);
      setExpenses(workspace.expenses);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load Supabase data', 'info');
    }
  };

  // Initialize the local demo or restore the Supabase session.
  useEffect(() => {
    setLang(getStoredLang());
    if (!supabase) {
      setExpenses(getStoredExpenses());
      setMembers(getStoredMembers());
      setLedgers(getStoredLedgers());
      setAuthLoading(false);
      return;
    }
    let alive = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const user = session?.user || null;
      setAuthUser(user);
      if (user) {
        setAuthLoading(true);
        window.setTimeout(() => {
          if (alive) void applyWorkspace(user).finally(() => { if (alive) setAuthLoading(false); });
        }, 0);
      } else {
        setExpenses([]); setMembers([]); setLedgers([]);
        setAuthLoading(false);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const user = data.session?.user || null;
      setAuthUser(user);
      if (user) {
        setAuthLoading(true);
        void applyWorkspace(user).finally(() => { if (alive) setAuthLoading(false); });
      }
      else setAuthLoading(false);
    }).catch(() => setAuthLoading(false));
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !authUser) return;
    let refreshTimer: number | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { void applyWorkspace(authUser); }, 250);
    };
    const channel = supabase.channel(`daybook-workspace-${authUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledgers' }, refresh)
      .subscribe();
    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  const t = translations[lang];

  // Save changes to storage
  const handleToggleLang = (newLang: Language) => {
    setLang(newLang);
    saveStoredLang(newLang);
  };

  const handleResetDemo = () => {
    resetAllData();
    setExpenses(INITIAL_EXPENSES);
    setMembers(INITIAL_MEMBERS);
    setLedgers(INITIAL_LEDGERS);
    showToast(
      lang === 'zh' ? '已恢复初始示例数据' : 'Restored initial demo data',
      'info'
    );
  };

  const handleSaveExpense = (newExpData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: supabase ? crypto.randomUUID() : `exp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: authUser?.id || newExpData.createdBy,
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    if (supabase) void saveExpenseCloud(newExpense).catch((error) => showToast(error.message, 'info'));
    else saveStoredExpenses(updated);

    if (newExpense.status === 'pending') {
      showToast(
        lang === 'zh'
          ? '账单已进入「待确认」状态，点击可在账单列表模拟成员确认。'
          : 'Expense entered "Pending" state. Click to simulate member reviews.',
        'info'
      );
    } else {
      showToast(
        lang === 'zh' ? '账单已成功保存！' : 'Expense successfully saved!'
      );
    }
  };

  const handleConfirmMember = (expenseId: string, memberId: string) => {
    if (supabase && authUser && memberId !== authUser.id) {
      showToast(lang === 'zh' ? '只能确认自己的分摊。' : 'You can only confirm your own share.', 'info');
      return;
    }
    const updated = expenses.map((exp) => {
      if (exp.id !== expenseId) return exp;

      const updatedSplits = exp.splits.map((s) => {
        if (s.memberId === memberId) {
          return {
            ...s,
            confirmed: true,
            confirmedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      const allConfirmed = updatedSplits.every((s) => s.confirmed);
      const newStatus = allConfirmed ? ('confirmed' as const) : exp.status;

      return {
        ...exp,
        splits: updatedSplits,
        status: newStatus,
      };
    });

    setExpenses(updated);
    if (supabase) { const changed = updated.find(e => e.id === expenseId); if (changed) void saveExpenseCloud(changed).catch(error => showToast(error.message, 'info')); }
    else saveStoredExpenses(updated);

    // Keep review modal in sync
    const currentActive = updated.find((e) => e.id === expenseId);
    if (currentActive) {
      setReviewExpense(currentActive);
      if (currentActive.status === 'confirmed') {
        showToast(t.allConfirmedToast, 'success');
      } else {
        showToast(t.singleConfirmedToast, 'info');
      }
    }
  };

  const handleConfirmAll = (expenseId: string) => {
    if (supabase && authUser) {
      handleConfirmMember(expenseId, authUser.id);
      return;
    }
    const updated = expenses.map((exp) => {
      if (exp.id !== expenseId) return exp;
      return {
        ...exp,
        status: 'confirmed' as const,
        splits: exp.splits.map((s) => ({
          ...s,
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        })),
      };
    });

    setExpenses(updated);
    if (supabase) { const changed = updated.find(e => e.id === expenseId); if (changed) void saveExpenseCloud(changed).catch(error => showToast(error.message, 'info')); }
    else saveStoredExpenses(updated);

    const currentActive = updated.find((e) => e.id === expenseId);
    if (currentActive) {
      setReviewExpense(currentActive);
      showToast(t.allConfirmedToast, 'success');
    }
  };

  const handleProposeChange = (
    expenseId: string,
    memberId: string,
    newAmount: number,
    reason: string
  ) => {
    if (supabase && authUser && memberId !== authUser.id) {
      showToast(lang === 'zh' ? '只能调整自己的分摊。' : 'You can only propose a change to your own share.', 'info');
      return;
    }
    const updated = expenses.map((exp) => {
      if (exp.id !== expenseId) return exp;
      const updatedSplits = exp.splits.map((s) => {
        if (s.memberId === memberId) {
          return {
            ...s,
            shareAmount: newAmount,
            confirmed: false,
            note: reason,
          };
        }
        return s;
      });

      return {
        ...exp,
        splits: updatedSplits,
        proposedChanges: [
          ...(exp.proposedChanges || []),
          {
            proposedBy: memberId,
            proposedAt: new Date().toISOString(),
            proposedAmount: newAmount,
            reason,
          },
        ],
      };
    });

    setExpenses(updated);
    if (supabase) { const changed = updated.find(e => e.id === expenseId); if (changed) void saveExpenseCloud(changed).catch(error => showToast(error.message, 'info')); }
    else saveStoredExpenses(updated);

    const currentActive = updated.find((e) => e.id === expenseId);
    if (currentActive) {
      setReviewExpense(currentActive);
      showToast(
        lang === 'zh'
          ? `已记录修改申请（建议调整为 ¥${newAmount.toFixed(2)}）`
          : `Adjustment recorded (proposed ¥${newAmount.toFixed(2)})`,
        'info'
      );
    }
  };

  const handleCreateLedger = (newLedger: Ledger) => {
    if (supabase && authUser) {
      void saveLedgerCloud(newLedger, authUser.id).then(saved => {
        if (saved) {
          void applyWorkspace(authUser);
          showToast(lang === 'zh' ? '新建账本成功！' : 'New ledger created!');
        }
      }).catch(error => showToast(error.message, 'info'));
      return;
    }
    const updated = [...ledgers, newLedger];
    setLedgers(updated);
    saveStoredLedgers(updated);
    showToast(lang === 'zh' ? '新建账本成功！' : 'New ledger created!');
  };

  const handleAddMember = (newMember: Member) => {
    const updated = [...members, newMember];
    setMembers(updated);
    saveStoredMembers(updated);
    showToast(lang === 'zh' ? '成员添加成功！' : 'Member added!');
  };

  const currentUser = members.find((m) => m.isCurrentUser) || members[0] || INITIAL_MEMBERS[0];
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  if (supabase && authLoading) return <div className="min-h-screen grid place-items-center bg-[#ededeb] text-sm text-[#777e75]">{lang === 'zh' ? '正在连接 Supabase…' : 'Connecting to Supabase…'}</div>;
  if (supabase && !authUser) return <AuthScreen lang={lang} />;

  return (
    <div className="min-h-screen bg-[#ededeb] flex items-center justify-center p-0 sm:p-4 lg:p-6 text-[#20241f]">
      {/* Toast floating banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#20241f] text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 max-w-[90vw]">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#91c9a2] shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-[#efa576] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Window Container matching reference style */}
      <div className="w-full max-w-[1080px] min-h-[100vh] sm:min-h-[720px] bg-[#f6f7f4] sm:border sm:border-[#e8ebe5] sm:rounded-[18px] overflow-hidden sm:shadow-[0_18px_50px_rgba(0,0,0,0.06)] flex flex-col">
        {/* Topbar */}
        <Header
          lang={lang}
          onToggleLang={handleToggleLang}
          currentUser={currentUser}
          onResetDemo={handleResetDemo}
          showReset={!supabase}
          cloudMode={Boolean(supabase)}
          onOpenFriends={supabase ? () => setIsFriendsOpen(true) : undefined}
          onSignOut={supabase ? () => { void supabase.auth.signOut(); } : undefined}
          onSearch={(query) => {
            setSearchQuery(query);
            if (query.trim() && currentView !== 'all_expenses') {
              setCurrentView('all_expenses');
            }
          }}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        {/* Body (Sidebar + Main Area) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            lang={lang}
            currentView={currentView}
            onSelectView={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            ledgers={ledgers}
            selectedLedgerId={selectedLedgerId}
            onSelectLedger={(id) => {
              setSelectedLedgerId(id);
              if (currentView === 'overview') {
                setCurrentView('analytics');
              }
            }}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenNewLedger={() => setIsNewLedgerOpen(true)}
            pendingCount={pendingCount}
            isOpenMobile={isMobileNavOpen}
            onCloseMobile={() => setIsMobileNavOpen(false)}
          />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#f6f7f4]">
            {currentView === 'overview' && (
              <OverviewView
                lang={lang}
                expenses={expenses}
                members={members}
                ledgers={ledgers}
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onOpenReview={(exp) => setReviewExpense(exp)}
                onNavigateToView={(view) => setCurrentView(view)}
              />
            )}

            {currentView === 'analytics' && (
              <AnalyticsView
                lang={lang}
                expenses={expenses}
                members={members}
                ledgers={ledgers}
                selectedLedgerId={selectedLedgerId}
                onSelectLedger={(id) => setSelectedLedgerId(id)}
              />
            )}

            {currentView === 'all_expenses' && (
              <AllExpensesView
                lang={lang}
                expenses={expenses}
                members={members}
                ledgers={ledgers}
                externalSearchQuery={searchQuery}
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onOpenReview={(exp) => setReviewExpense(exp)}
              />
            )}
          </main>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        lang={lang}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        members={members}
        ledgers={ledgers}
        onSaveExpense={handleSaveExpense}
        onOpenNewMemberModal={() => supabase ? setIsFriendsOpen(true) : setIsNewMemberOpen(true)}
      />

      {/* Review / Confirm Workflow Modal */}
      <ReviewExpenseModal
        lang={lang}
        expense={reviewExpense}
        isOpen={reviewExpense !== null}
        onClose={() => setReviewExpense(null)}
        members={members}
        ledgers={ledgers}
        onConfirmMember={handleConfirmMember}
        onConfirmAll={handleConfirmAll}
        onProposeChange={handleProposeChange}
      />

      {/* New Ledger Modal */}
      <NewLedgerModal
        lang={lang}
        isOpen={isNewLedgerOpen}
        onClose={() => setIsNewLedgerOpen(false)}
        onCreateLedger={handleCreateLedger}
      />

      {/* New Member Modal */}
      <NewMemberModal
        lang={lang}
        isOpen={isNewMemberOpen}
        onClose={() => setIsNewMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      {supabase && <FriendsModal
        lang={lang}
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        currentUser={currentUser}
        members={members}
        ledgers={ledgers}
        onChanged={() => authUser ? applyWorkspace(authUser) : Promise.resolve()}
      />}
    </div>
  );
}
