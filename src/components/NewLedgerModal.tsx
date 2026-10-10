import React, { useState } from 'react';
import { Language, Ledger } from '../types';
import { translations } from '../locales/i18n';
import { X } from 'lucide-react';

interface NewLedgerModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onCreateLedger: (ledger: Ledger) => void;
}

export const NewLedgerModal: React.FC<NewLedgerModalProps> = ({
  lang,
  isOpen,
  onClose,
  onCreateLedger,
}) => {
  const t = translations[lang];
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [iconColor, setIconColor] = useState('#416f54');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameZh && !nameEn) return;

    const newLedger: Ledger = {
      id: `ledger_${Date.now()}`,
      nameZh: nameZh || nameEn,
      nameEn: nameEn || nameZh,
      iconColor,
    };

    onCreateLedger(newLedger);
    setNameZh('');
    setNameEn('');
    onClose();
  };

  const colors = ['#416f54', '#c87943', '#7e74a8', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#e8ebe5] rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#e8ebe5] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#20241f] m-0">
            {t.newLedgerTitle}
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
              {lang === 'zh' ? '账本中文名称' : 'Ledger name (Chinese)'}
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              placeholder="例如：合租日常、羽毛球聚会..."
              className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[#777e75] mb-1">
              {lang === 'zh' ? '账本英文名称' : 'Ledger name (English)'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Apartment bills, Badminton..."
              className="w-full bg-white border border-[#e8ebe5] rounded-lg px-3 py-2 text-xs text-[#20241f] outline-none focus:border-[#416f54]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#777e75] mb-1">
              {lang === 'zh' ? '账本主题色' : 'Theme color'}
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setIconColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    iconColor === c ? 'border-[#20241f] scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              {t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
