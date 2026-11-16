/**
 * 暫停選單彈窗模組
 * 遊戲暫停時凍結時間與場景移動，提供繼續、重新開始或返回主畫面選項
 */

import React from 'react';
import { Home, Play, RotateCcw } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#050b16]/40">
      <div className="cyber-glass-modal w-full max-w-sm rounded-2xl p-6 sm:p-7 text-center">
        <p className="text-xs font-medium tracking-widest text-[#00F5D4]">系統暫停中</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
          任務已暫停
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2">
          按 ESC / P 或點擊下方按鈕恢復疾馳
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00F5D4] text-[#071324] font-bold text-sm hover:bg-[#38ffe5] transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            <span>繼續任務</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/5 text-white font-semibold text-sm hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新開始</span>
          </button>

          <button
            type="button"
            onClick={onReturnMenu}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-300 font-medium text-sm hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>返回主畫面</span>
          </button>
        </div>
      </div>
    </div>
  );
};
