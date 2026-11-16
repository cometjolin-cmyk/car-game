/**
 * 遊戲開始畫面模組
 * 呈現遊戲標題、模型展示規格、歷史最高分、信用點數餘額，以及開始任務／改裝車庫／操作說明按鈕
 */

import React from 'react';
import { BookOpen, Coins, Play, Trophy, Wrench } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';
import {
  getSkinConfig,
  getTrackThemeConfig,
  TrackThemeId,
  VehicleSkinId,
} from '../game/saveSystem';

interface StartScreenProps {
  bestScore: number;
  credits: number;
  selectedSkin: VehicleSkinId;
  selectedTheme: TrackThemeId;
  onStart: () => void;
  onOpenGarage: () => void;
  onOpenInstructions: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  bestScore,
  credits,
  selectedSkin,
  selectedTheme,
  onStart,
  onOpenGarage,
  onOpenInstructions,
}) => {
  const skin = getSkinConfig(selectedSkin);
  const theme = getTrackThemeConfig(selectedTheme);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 pb-6 bg-[#060f1d]/18">
      <div className="cyber-glass-modal w-full max-w-xl rounded-2xl p-6 sm:p-8 text-center">
        <p className="text-xs font-medium tracking-widest text-[#00F5D4] mb-1.5">
          {skin.code} · {skin.name} · {theme.name}
        </p>

        <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight text-balance">
          穿越賽博天際線的
          <span className="block text-[#00F5D4] mt-1">90 秒挑戰</span>
        </h1>

        <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
          解鎖全息展示盒即刻出盒馳騁！運用跳躍滑翔、能量護盾、渦輪加速與極限擦身突破三階段賽道。
        </p>

        {/* 任務核心指標、最高紀錄與信用點數 */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-white/10 py-3.5">
          <div>
            <div className="text-xs text-slate-400">挑戰時限</div>
            <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
              {GAME_CONFIG.DURATION_SECONDS.toFixed(0)} 秒
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">目標分數</div>
            <div className="font-mono-tabular text-lg font-bold text-[#00F5D4] mt-0.5">
              {GAME_CONFIG.TARGET_SCORE.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Trophy className="w-3.5 h-3.5 text-[#ffb703]" />
              <span>最高紀錄</span>
            </div>
            <div className="font-mono-tabular text-lg font-bold text-[#ffb703] mt-0.5">
              {bestScore.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Coins className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>信用點數</span>
            </div>
            <div className="font-mono-tabular text-lg font-bold text-white mt-0.5">
              {credits.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 主要行動按鈕 */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00F5D4] text-[#071324] font-bold text-base hover:bg-[#38ffe5] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            <span>開始任務</span>
          </button>

          <button
            type="button"
            onClick={onOpenGarage}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#ffb703]/60 bg-[#ffb703]/15 text-[#ffd166] font-semibold text-base hover:bg-[#ffb703]/25 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-5 h-5" />
            <span>3D 改裝車庫</span>
          </button>

          <button
            type="button"
            onClick={onOpenInstructions}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#7B2CBF]/70 bg-[#7B2CBF]/20 text-slate-100 font-semibold text-base hover:bg-[#7B2CBF]/35 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-5 h-5 text-[#c084fc]" />
            <span>操作說明</span>
          </button>
        </div>
      </div>
    </div>
  );
};
