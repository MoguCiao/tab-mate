export type Language = 'zh' | 'en';

export type SplitMethod = 'equal' | 'shares' | 'custom';

export type ExpenseStatus = 'pending' | 'confirmed' | 'settled' | 'draft';

export type ExpenseCategory = 'dining' | 'shopping' | 'transport' | 'entertainment' | 'other';

export interface Member {
  id: string;
  nameZh: string;
  nameEn: string;
  avatarLetterZh: string;
  avatarLetterEn: string;
  faceBg: string;
  faceColor: string;
  isCurrentUser?: boolean;
  friendCode?: string;
  memberLedgerIds?: string[];
}

export interface Ledger {
  id: string;
  nameZh: string;
  nameEn: string;
  iconColor?: string;
  isDefault?: boolean;
  memberIds?: string[];
}

export interface MemberSplit {
  memberId: string;
  shareAmount: number;
  sharesCount?: number; // e.g. 1 share, 2 shares in 'shares' mode
  confirmed: boolean;
  confirmedAt?: string;
  note?: string;
}

export interface Expense {
  id: string;
  nameZh: string;
  nameEn: string;
  amount: number;
  date: string; // ISO date-time string e.g. '2026-10-09T19:20'
  ledgerId: string;
  category: ExpenseCategory;
  payerId: string;
  participantIds: string[];
  splitMethod: SplitMethod;
  splits: MemberSplit[];
  status: ExpenseStatus;
  createdBy: string;
  createdAt: string;
  isPersonal?: boolean;
  note?: string;
  proposedChanges?: {
    proposedBy: string;
    proposedAt: string;
    proposedAmount: number;
    reason: string;
  }[];
}

export type ViewType = 'overview' | 'add_expense' | 'all_expenses' | 'analytics';

export type PeriodType = 'day' | 'month' | 'year';
