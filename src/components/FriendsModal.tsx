import React, { useEffect, useState } from 'react';
import { Check, Copy, Plus, UserRoundPlus, X } from 'lucide-react';
import type { Language, Ledger, Member } from '../types';
import { addFriendToLedger, answerFriendRequest, loadFriendRequests, sendFriendRequestByCode } from '../utils/supabase';

interface Props {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  members: Member[];
  ledgers: Ledger[];
  onChanged: () => Promise<void>;
}

export const FriendsModal: React.FC<Props> = ({ lang, isOpen, onClose, currentUser, members, ledgers, onChanged }) => {
  const zh = lang === 'zh';
  const [code, setCode] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [ledgerByFriend, setLedgerByFriend] = useState<Record<string, string>>({});

  const refresh = async () => {
    try { setRequests(await loadFriendRequests()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load friend requests'); }
  };
  useEffect(() => { if (isOpen) { setError(''); void refresh(); } }, [isOpen]);
  if (!isOpen) return null;

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await onChanged(); await refresh(); setNotice(success); }
    catch (e) { setError(e instanceof Error ? e.message : (zh ? '操作失败' : 'Action failed')); }
    finally { setBusy(false); }
  };

  const incoming = requests.filter(r => r.addressee_id === currentUser.id);
  const outgoing = requests.filter(r => r.requester_id === currentUser.id);

  return <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-white rounded-2xl border border-[#e8ebe5] shadow-2xl">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#e8ebe5]"><div><h2 className="font-semibold text-base">{zh ? '好友与邀请' : 'Friends & invites'}</h2><p className="text-xs text-[#777e75] mt-1">{zh ? '好友申请被接受后，还要在下方选择账本并点击 +，才会加入共同账本。' : 'After a request is accepted, choose a ledger below and click + to add your friend to it.'}</p></div><button onClick={onClose} className="p-1.5 text-[#777e75] hover:bg-[#f6f7f4] rounded-lg"><X className="w-4 h-4" /></button></header>
      <div className="p-5 space-y-5">
        <div className="rounded-xl bg-[#f6f7f4] border border-[#e8ebe5] p-4"><div className="text-xs text-[#777e75] mb-2">{zh ? '你的好友码' : 'Your friend code'}</div><div className="flex items-center justify-between gap-2"><strong className="text-xl tracking-[0.18em] text-[#416f54]">{currentUser.friendCode || (zh ? '加载中' : 'Loading')}</strong><button onClick={() => currentUser.friendCode && navigator.clipboard?.writeText(currentUser.friendCode)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#e8ebe5] text-xs"><Copy className="w-3.5 h-3.5" />{zh ? '复制' : 'Copy'}</button></div></div>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { await sendFriendRequestByCode(code); setCode(''); }, zh ? '好友申请已发送' : 'Friend request sent'); }}><input required value={code} onChange={e => setCode(e.target.value)} placeholder={zh ? '输入好友码' : 'Enter friend code'} className="min-w-0 flex-1 rounded-lg border border-[#e3e7e0] px-3 py-2 text-sm outline-none focus:border-[#416f54]" /><button disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 bg-[#416f54] text-white text-xs font-semibold disabled:opacity-50"><UserRoundPlus className="w-4 h-4" />{zh ? '添加好友' : 'Add friend'}</button></form>
        {!!incoming.length && <div><h3 className="text-xs font-semibold mb-2">{zh ? '收到的申请' : 'Incoming requests'}</h3><div className="space-y-2">{incoming.map(r => <div key={r.id} className="flex items-center justify-between gap-3 border border-[#e8ebe5] rounded-lg p-3"><span className="text-sm">{r.other_name}</span><div className="flex gap-2"><button disabled={busy} onClick={() => void run(() => answerFriendRequest(r.id, false), zh ? '已忽略申请' : 'Request declined')} className="text-xs text-[#777e75] px-2 py-1">{zh ? '忽略' : 'Decline'}</button><button disabled={busy} onClick={() => void run(() => answerFriendRequest(r.id, true), zh ? '已成为好友' : 'Friend added')} className="inline-flex items-center gap-1 text-xs rounded-md bg-[#edf4ee] text-[#416f54] px-2 py-1"><Check className="w-3.5 h-3.5" />{zh ? '接受' : 'Accept'}</button></div></div>)}</div></div>}
        {!!outgoing.length && <div><h3 className="text-xs font-semibold mb-2">{zh ? '等待对方确认' : 'Waiting for response'}</h3><div className="space-y-1">{outgoing.map(r => <div key={r.id} className="text-xs text-[#777e75] border border-[#e8ebe5] rounded-lg px-3 py-2">{r.other_name} · {zh ? '待确认' : 'Pending'}</div>)}</div></div>}
        {members.filter(m => !m.isCurrentUser).length > 0 && ledgers.length > 0 && <div><h3 className="text-xs font-semibold mb-2">{zh ? '邀请好友加入账本' : 'Add friends to a ledger'}</h3><div className="space-y-2">{members.filter(m => !m.isCurrentUser).map(friend => <div key={friend.id} className="flex gap-2"><span className="flex-1 text-sm py-2 truncate">{lang === 'zh' ? friend.nameZh : friend.nameEn}</span><select value={ledgerByFriend[friend.id] || ledgers[0].id} onChange={e => setLedgerByFriend(prev => ({ ...prev, [friend.id]: e.target.value }))} className="max-w-[48%] text-xs border border-[#e3e7e0] rounded-lg px-2">{ledgers.map(ledger => <option key={ledger.id} value={ledger.id}>{lang === 'zh' ? ledger.nameZh : ledger.nameEn}</option>)}</select><button disabled={busy} onClick={() => void run(() => addFriendToLedger(ledgerByFriend[friend.id] || ledgers[0].id, friend.id), zh ? '已加入账本' : 'Added to ledger')} className="text-xs px-2.5 rounded-lg bg-[#edf4ee] text-[#416f54]"><Plus className="w-4 h-4" /></button></div>)}</div></div>}
        {notice && <p role="status" className="text-xs text-[#416f54] bg-[#edf4ee] rounded-lg px-3 py-2">{notice}</p>}{error && <p role="alert" className="text-xs text-[#b34c3d] bg-[#fbefed] rounded-lg px-3 py-2">{error}</p>}
      </div>
    </section>
  </div>;
};
