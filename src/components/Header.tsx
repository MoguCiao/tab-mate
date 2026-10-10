import React, { useState } from 'react';
import { Language, Member } from '../types';
import { translations } from '../locales/i18n';
import { RotateCcw, Search, Menu, X, ArrowUpRight, UsersRound, LogOut } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  currentUser: Member;
  onResetDemo: () => void;
  onSearch: (query: string) => void;
  onOpenMobileNav: () => void;
  onOpenFriends?: () => void;
  onSignOut?: () => void;
  showReset?: boolean;
  cloudMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  currentUser,
  onResetDemo,
  onSearch,
  onOpenMobileNav,
  onOpenFriends,
  onSignOut,
  showReset = true,
  cloudMode = false,
}) => {
  const t = translations[lang];
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header className="h-[58px] bg-white border-b border-[#e8ebe5] flex items-center justify-between px-4 sm:px-6 select-none shrink-0">
      <div className="flex items-center gap-3">
        {showReset && <button
          onClick={onOpenMobileNav}
          className="md:hidden p-1.5 text-[#777e75] hover:text-[#20241f] rounded-lg hover:bg-[#edf4ee] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>}

        <div className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight text-[#20241f]">
          <span className="w-[27px] h-[27px] rounded-[9px] bg-[#476f53] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            <ArrowUpRight className="w-4 h-4" />
          </span>
          <span>{t.brandName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#777e75]">
        {onOpenFriends && <button onClick={onOpenFriends} className="inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-[#edf4ee] hover:text-[#416f54]" title={lang === 'zh' ? '好友' : 'Friends'}><UsersRound className="w-4 h-4" /><span className="hidden sm:inline">{lang === 'zh' ? '好友' : 'Friends'}</span></button>}
        {/* Local storage badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f6f7f4] text-[#777e75] text-[11px] border border-[#e8ebe5]">
          <span className="w-2 h-2 rounded-full bg-[#416f54] animate-pulse" />
          {cloudMode ? (lang === 'zh' ? '云端同步' : 'Cloud sync') : t.storageBadge}
        </span>

        {/* Quick search input */}
        <div className="relative flex items-center">
          {showSearchInput ? (
            <div className="flex items-center bg-[#f6f7f4] border border-[#e8ebe5] rounded-lg px-2.5 py-1 text-xs animate-in fade-in duration-150">
              <Search className="w-3.5 h-3.5 text-[#777e75] mr-1.5 shrink-0" />
              <input
                type="text"
                value={searchVal}
                onChange={handleSearchChange}
                placeholder={t.searchPlaceholder}
                className="bg-transparent border-0 outline-none text-[#20241f] text-xs w-36 sm:w-48 placeholder:text-[#a5aca1]"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  setSearchVal('');
                  onSearch('');
                }}
                className="text-[#777e75] hover:text-[#20241f] ml-1 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="p-1.5 rounded-lg text-[#777e75] hover:text-[#20241f] hover:bg-[#f6f7f4] transition-colors"
              title={t.searchTooltip}
              aria-label={t.searchTooltip}
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Reset Demo Data */}
        <button
          onClick={() => {
            if (window.confirm(t.resetConfirm)) {
              onResetDemo();
            }
          }}
          className="p-1.5 rounded-lg text-[#777e75] hover:text-[#c87943] hover:bg-[#f8efe8] transition-colors"
          title={t.resetDemo}
          aria-label={t.resetDemo}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Language switcher */}
        <div className="flex border border-[#e8ebe5] rounded-[7px] p-[2px] bg-white text-[11px] font-medium">
          <button
            onClick={() => onToggleLang('en')}
            className={`px-2 py-0.5 rounded-[5px] transition-all ${
              lang === 'en'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold shadow-xs'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onToggleLang('zh')}
            className={`px-2 py-0.5 rounded-[5px] transition-all ${
              lang === 'zh'
                ? 'bg-[#edf4ee] text-[#416f54] font-semibold shadow-xs'
                : 'text-[#777e75] hover:text-[#20241f]'
            }`}
          >
            中文
          </button>
        </div>

        {/* Current User Avatar */}
        <div
          className="w-[27px] h-[27px] rounded-full flex items-center justify-center font-semibold text-xs border border-[#e8ebe5] shadow-xs cursor-default select-none"
          style={{ backgroundColor: currentUser.faceBg, color: currentUser.faceColor }}
          title={lang === 'zh' ? `${currentUser.nameZh}（当前使用者）` : `${currentUser.nameEn} (Current user)`}
        >
          {lang === 'zh' ? currentUser.avatarLetterZh : currentUser.avatarLetterEn}
        </div>
        {onSignOut && <button onClick={onSignOut} className="p-1.5 rounded-lg hover:bg-[#f8efe8] hover:text-[#c87943]" title={lang === 'zh' ? '退出登录' : 'Sign out'} aria-label={lang === 'zh' ? '退出登录' : 'Sign out'}><LogOut className="w-4 h-4" /></button>}
      </div>
    </header>
  );
};
