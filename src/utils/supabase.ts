import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Expense, Ledger, Member } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export interface WorkspaceData {
  currentUser: Member;
  members: Member[];
  ledgers: Ledger[];
  expenses: Expense[];
}

const profileToMember = (row: any, currentUserId: string, memberLedgerIds: string[] = []): Member => ({
  id: row.id,
  nameZh: row.display_name || row.email?.split('@')[0] || '新成员',
  nameEn: row.display_name || row.email?.split('@')[0] || 'Member',
  avatarLetterZh: (row.display_name || '新').slice(0, 1),
  avatarLetterEn: (row.display_name || 'M').slice(0, 1).toUpperCase(),
  faceBg: row.avatar_bg || '#dce8df',
  faceColor: row.avatar_color || '#42644c',
  isCurrentUser: row.id === currentUserId,
  friendCode: row.friend_code,
  memberLedgerIds,
});

export async function ensureProfile(user: User) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '新成员',
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function loadWorkspace(user: User): Promise<WorkspaceData> {
  if (!supabase) throw new Error('Supabase 尚未配置');
  await ensureProfile(user);

  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  if (profileError) throw profileError;

  const { data: relations, error: relationError } = await supabase
    .from('friendships').select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');
  if (relationError) throw relationError;

  const friendIds = (relations || []).map((r: any) => r.requester_id === user.id ? r.addressee_id : r.requester_id);
  const memberIds = [...new Set([user.id, ...friendIds])];
  const { data: memberships, error: membershipError } = await supabase
    .from('ledger_members').select('ledger_id').eq('user_id', user.id);
  if (membershipError) throw membershipError;
  const ledgerIds = [...new Set((memberships || []).map((m: any) => m.ledger_id))];

  let ledgerRows: any[] = [];
  let ledgerMembershipRows: any[] = [];
  let expenseRows: any[] = [];
  if (ledgerIds.length) {
    const { data, error } = await supabase.from('ledgers').select('*').in('id', ledgerIds).order('created_at');
    if (error) throw error;
    ledgerRows = data || [];
    const { data: allMembers, error: allMembersError } = await supabase.from('ledger_members').select('ledger_id, user_id').in('ledger_id', ledgerIds);
    if (allMembersError) throw allMembersError;
    ledgerMembershipRows = allMembers || [];
    const { data: bills, error: billsError } = await supabase
      .from('expenses').select('*').in('ledger_id', ledgerIds).order('created_at', { ascending: false });
    if (billsError) throw billsError;
    expenseRows = bills || [];
  }

  const workspaceMemberIds = [...new Set([...memberIds, ...ledgerMembershipRows.map((m: any) => m.user_id)])];
  const { data: profileRows, error: membersError } = await supabase
    .from('profiles').select('*').in('id', workspaceMemberIds);
  if (membersError) throw membersError;
  const memberLedgerIds = new Map<string, string[]>();
  for (const row of ledgerMembershipRows) memberLedgerIds.set(row.user_id, [...(memberLedgerIds.get(row.user_id) || []), row.ledger_id]);

  return {
    currentUser: profileToMember(profile, user.id),
    members: (profileRows || []).map((row: any) => profileToMember(row, user.id, memberLedgerIds.get(row.id) || [])),
    ledgers: ledgerRows.map((row: any) => ({
      id: row.id, nameZh: row.name_zh, nameEn: row.name_en, iconColor: row.icon_color,
      isDefault: row.is_default,
      memberIds: ledgerMembershipRows.filter((m: any) => m.ledger_id === row.id).map((m: any) => m.user_id),
    })),
    expenses: expenseRows.map((row: any) => ({
      ...row.data, id: row.id, ledgerId: row.ledger_id, createdBy: row.created_by,
      createdAt: row.created_at,
    })),
  };
}

export async function saveExpenseCloud(expense: Expense) {
  if (!supabase) return;
  const { error } = await supabase.from('expenses').upsert({
    id: expense.id,
    ledger_id: expense.ledgerId,
    created_by: expense.createdBy,
    data: expense,
  });
  if (error) throw error;
}

export async function saveLedgerCloud(ledger: Ledger, userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from('ledgers').insert({
    name_zh: ledger.nameZh, name_en: ledger.nameEn,
    icon_color: ledger.iconColor || '#416f54', owner_id: userId,
  }).select('id').single();
  if (error) throw error;
  const { error: memberError } = await supabase.from('ledger_members').insert({
    ledger_id: data.id, user_id: userId, role: 'owner',
  });
  if (memberError) throw memberError;
  return { ...ledger, id: data.id };
}

export async function sendFriendRequestByCode(code: string) {
  if (!supabase) throw new Error('Supabase 尚未配置');
  const { error } = await supabase.rpc('send_friend_request_by_code', { friend_code_input: code.trim().toUpperCase() });
  if (error) throw error;
}

export async function loadFriendRequests() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('friendships')
    .select('id, requester_id, addressee_id, status, created_at')
    .eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  const requests = data || [];
  const { data: authData } = await supabase.auth.getUser();
  const ownId = authData.user?.id;
  const otherIds = requests.map((r: any) => r.requester_id === ownId ? r.addressee_id : r.requester_id);
  const profileIds = [...new Set(otherIds)];
  const { data: people, error: peopleError } = profileIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', profileIds)
    : { data: [], error: null };
  if (peopleError) throw peopleError;
  return requests.map((request: any) => {
    const otherId = request.requester_id === ownId ? request.addressee_id : request.requester_id;
    return { ...request, other_name: people?.find((p: any) => p.id === otherId)?.display_name || 'TabMate 用户' };
  });
}

export async function answerFriendRequest(id: string, accept: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from('friendships')
    .update({ status: accept ? 'accepted' : 'declined' }).eq('id', id);
  if (error) throw error;
}

export async function addFriendToLedger(ledgerId: string, friendId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('ledger_members').insert({ ledger_id: ledgerId, user_id: friendId, role: 'member' });
  if (error) throw error;
}
