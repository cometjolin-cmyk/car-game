/**
 * 「模型收藏銘牌風」電子貨運簽收單結算介面
 * 結合粒子透明質感、模型規格銘牌頭標、S / A / B / C 全息等級印章與完整快遞飛行數據
 */

import React from 'react';
import { Award, Coins, Home, RotateCcw, Wrench } from 'lucide-react';
import { GameHUDState } from '../game/constants';
import { getSkinConfig, getTrackThemeConfig } from '../game/saveSystem';

interface ResultModalProps {
  hud: GameHUDState;
  onRetry: () => void;
  onOpenGarage: () => void;
  onReturnMenu: () => void;
}

type GradeRank = 'S' | 'A' | 'B' | 'C';

function computeDeliveryGrade(hud: GameHUDState): {
  rank: GradeRank;
  title: string;
  stampClass: string;
} {
  if (hud.phase !== 'VICTORY') {
    return {
      rank: 'C',
      title: '配送異常中止',
      stampClass: 'border-[#FF0055] text-[#FF0055] bg-[#FF0055]/12',
    };
  }
  if (
    hud.score >= 6000 ||
    (hud.score >= 4500 && hud.health === hud.maxHealth && hud.maxCombo >= 10)
  ) {
    return {
      rank: 'S',
      title: '特級傳奇簽收',
      stampClass: 'border-[#ffb703] text-[#ffb703] bg-[#ffb703]/15',
    };
  }
  if (hud.score >= 4200) {
    return {
      rank: 'A',
      title: '菁英極速簽收',
      stampClass: 'border-[#00F5D4] text-[#00F5D4] bg-[#00F5D4]/15',
    };
  }
  return {
    rank: 'B',
    title: '標準合格簽收',
    stampClass: 'border-[#38bdf8] text-[#38bdf8] bg-[#38bdf8]/15',
  };
}

export const ResultModal: React.FC<ResultModalProps> = ({
  hud,
  onRetry,
  onOpenGarage,
  onReturnMenu,
}) => {
  const isVictory = hud.phase === 'VICTORY';
  const skin = getSkinConfig(hud.selectedSkin);
  const theme = getTrackThemeConfig(hud.selectedTheme);
  const grade = computeDeliveryGrade(hud);

  const subtitle = isVictory
    ? '貨運晶片已完整抵達天際線終端，以下為本趟電子貨運簽收明細。'
    : hud.defeatReason === 'HEALTH_DEPLETED'
    ? '反重力車能量核心已耗盡，配送貨櫃已啟動緊急迫降保護。'
    : `90 秒時限已屆，配送分數未達簽收門檻（目標 ${hud.targetScore.toLocaleString()} 分）。`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#050b16]/46">
      <div
        className={`relative w-full max-w-lg rounded-2xl p-6 sm:p-7 ${
          isVictory ? 'cyber-glass-modal' : 'cyber-glass-danger'
        }`}
      >
        {/* 模型收藏銘牌頂欄 */}
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-white/20 pb-3.5">
          <div className="text-left">
            <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-[#00F5D4]">
              ELECTRONIC FREIGHT MANIFEST · {skin.code}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-300">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-white/40"
                style={{ backgroundColor: skin.previewHex }}
              />
              <span>{skin.name}</span>
              <span aria-hidden="true">·</span>
              <span>{theme.name}</span>
            </div>
          </div>

          {/* S / A / B / C 全息等級印章 */}
          <div
            className={`shrink-0 w-16 h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center -rotate-6 select-none ${grade.stampClass}`}
          >
            <span className="font-display text-3xl font-black leading-none">{grade.rank}</span>
            <span className="text-[9px] font-bold tracking-tight mt-0.5 whitespace-nowrap">
              {grade.title}
            </span>
          </div>
        </div>

        {/* 任務結果標題 */}
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <h2
              className={`font-display text-2xl sm:text-3xl font-bold ${
                isVictory ? 'text-[#00F5D4]' : 'text-[#FF0055]'
              }`}
            >
              {isVictory ? '電子貨運簽收完成' : '貨運任務失敗'}
            </h2>
            {hud.isNewBest && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#ffb703] whitespace-nowrap">
                <Award className="w-4 h-4" />
                新紀錄
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">{subtitle}</p>
        </div>

        {/* 電子貨運簽收明細單 */}
        <div className="mt-4 cyber-subcard rounded-xl p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">最終任務評分</span>
            <span className="font-mono-tabular text-lg font-bold text-white">
              {hud.score.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">
                / {hud.targetScore.toLocaleString()}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-dashed border-white/15 py-2.5 text-center">
            <div>
              <div className="text-[11px] text-slate-400">總行駛距離</div>
              <div className="font-mono-tabular text-base font-bold text-white mt-0.5">
                {hud.distanceMeters.toLocaleString()} m
              </div>
            </div>
            <div className="border-x border-dashed border-white/15">
              <div className="text-[11px] text-slate-400">最高連擊</div>
              <div className="font-mono-tabular text-base font-bold text-[#00F5D4] mt-0.5">
                {hud.maxCombo} 連擊
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">極限擦身</div>
              <div className="font-mono-tabular text-base font-bold text-[#ffb703] mt-0.5">
                {hud.nearMissCount} 次
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">簽收晶片 / 剩餘時間</span>
            <span className="font-mono-tabular font-bold text-slate-200">
              {hud.chipsCollected} 枚 · {hud.timeRemaining.toFixed(1)} 秒
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-slate-400">核發信用點數</span>
            <span className="font-mono-tabular font-bold text-[#ffb703] inline-flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              +{hud.lastEarnedCredits.toLocaleString()}
              <span className="text-xs text-slate-400 font-normal ml-1">
                (餘額 {hud.credits.toLocaleString()})
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-slate-400">歷史最高紀錄</span>
            <span className="font-mono-tabular font-bold text-white">
              {hud.bestScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-5 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00F5D4] text-[#071324] font-bold text-sm hover:bg-[#38ffe5] transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新挑戰</span>
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#ffb703]/60 bg-[#ffb703]/15 text-[#ffd166] font-semibold text-sm hover:bg-[#ffb703]/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" />
              <span>改裝車庫</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onReturnMenu}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-slate-300 font-medium text-sm hover:bg-white/10 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>返回展示台主畫面</span>
          </button>
        </div>
      </div>
    </div>
  );
};
