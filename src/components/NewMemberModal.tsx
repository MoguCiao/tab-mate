import React, { useState } from 'react';
import { Language, Member } from '../types';
import { translations } from '../locales/i18n';
import { X } from 'lucide-react';

interface NewMemberModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: Member) => void;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  lang,
  isOpen,
  onClose,
  onAddMember,
}) => {
  const t = translations[lang];
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameZh && !nameEn) return;

    const letterZh = (nameZh || nameEn).slice(0, 1);
    const letterEn = (nameEn || nameZh).slice(0, 1).toUpperCase();

    const colorPalettes = [
      { bg: '#f1e7d5', color: '#806238' },
      { bg: '#e0ebf5', color: '#385d80' },
      { bg: '#f2e1e7', color: '#803855' },
      { bg: '#e2f2e7', color: '#38804e' },
    ];
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

    const newMember: Member = {
      id: `member_${Date.now()}`,
      nameZh: nameZh || nameEn,
      nameEn: nameEn || nameZh,
      avatarLetterZh: letterZh,
      avatarLetterEn: letterEn,
      faceBg: palette.bg,
      faceColor: palette.color,
    };

    onAddMember(newMember);
    setNameZh('');
    setNameEn('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#e8ebe5] rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#e8ebe5] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#20241f] m-0">
            {t.addMemberTitle}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777e75] hover:text-[#20241f]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs text-[#777e75] mb-1">
              {lang === 'zh' ? '成员中文姓名' : 'Member name (Chinese)'}
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              placeholder="例如：赵雷、钱程..."
              className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[#777e75] mb-1">
              {lang === 'zh' ? '成员英文姓名 / 拼音' : 'Member name (English)'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Zhao Lei..."
              className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-[#e8ebe5] rounded-lg text-xs text-[#777e75] hover:text-[#20241f]"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#416f54] text-white rounded-lg text-xs font-semibold hover:bg-[#365c46]"
            >
              {t.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
