/**
 * 操作說明彈窗模組
 * 更新跳躍／反重力滑翔（W / ↑）、能量護盾（Shift / E）與渦輪加速（Space）完整操作與階段說明
 */

import React from 'react';
import { ArrowUp, Cpu, Flame, Shield, TriangleAlert, Trophy, X } from 'lucide-react';
import { GAME_CONFIG } from '../game/constants';

interface InstructionsModalProps {
  onClose: () => void;
  onStartGame: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  onClose,
  onStartGame,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050b16]/44">
      <div className="cyber-glass-modal w-full max-w-2xl rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="font-display text-2xl font-bold text-white">任務操作說明</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉操作說明"
            className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-[#00F5D4]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. 車道切換 */}
          <div className="cyber-subcard rounded-xl p-4">
            <div className="text-sm font-bold text-[#00F5D4] mb-2">車道切換控制</div>
            <div className="flex items-center gap-2 mb-2.5">
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                A
              </kbd>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                D
              </kbd>
              <span className="text-xs text-slate-400">或</span>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                ←
              </kbd>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                →
              </kbd>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              於左、中、右三條霓虹車道間平滑切換閃避，不會超出兩側道路護欄邊界。
            </p>
          </div>

          {/* 2. 跳躍與反重力滑翔 */}
          <div className="cyber-subcard rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#00F5D4] mb-2">
              <ArrowUp className="w-4 h-4" />
              <span>跳躍與反重力滑翔</span>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                W
              </kbd>
              <span className="text-xs text-slate-400">或</span>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                ↑
              </kbd>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              點擊向上跳躍，於<strong className="text-white">空中長按</strong>可啟動反重力滑翔減緩下落，飛越琥珀色「低矮型路障」並收集高空晶片。
            </p>
          </div>

          {/* 3. 能量護盾 */}
          <div className="cyber-subcard rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#00F5D4] mb-2">
              <Shield className="w-4 h-4" />
              <span>主動技能：能量護盾</span>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                Shift
              </kbd>
              <span className="text-xs text-slate-400">或</span>
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                E
              </kbd>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              持續 {GAME_CONFIG.SHIELD_DURATION} 秒，可<strong className="text-white">抵擋一次碰撞並摧毀障礙</strong>，結束或抵擋後進入冷卻（可於車庫升級縮短）。
            </p>
          </div>

          {/* 4. 渦輪加速 */}
          <div className="cyber-subcard rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#ffb703] mb-2">
              <Flame className="w-4 h-4" />
              <span>主動技能：渦輪加速</span>
            </div>
            <div className="flex items-center gap-2 mb-2.5">
              <kbd className="px-2.5 py-1 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
                Space
              </kbd>
              <span className="text-xs text-slate-400">冷卻 {GAME_CONFIG.TURBO_COOLDOWN} 秒</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              前進速度提升 <strong className="text-white">1.6 倍</strong> 並觸發速度線特效，期間收集晶片獲得{' '}
              <span className="font-mono-tabular font-bold text-[#ffb703]">2 倍分數</span>。
            </p>
          </div>
        </div>

        {/* 障礙類型、極限擦身與連擊倍率說明 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="cyber-subcard rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#FF0055] mb-1.5">
              <TriangleAlert className="w-4 h-4" />
              <span>三類賽道障礙與極限擦身</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">高聳路障</strong>須切換車道；
              <strong className="text-white">低矮路障</strong>可跳躍飛越；
              <strong className="text-white">巡邏機</strong>橫向移動。未開護盾緊貼閃過可觸發{' '}
              <span className="font-semibold text-[#ffb703]">NEAR MISS! +50</span> 並縮短技能冷卻 1.0 秒！
            </p>
          </div>

          <div className="cyber-subcard rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#00F5D4] mb-1.5">
              <Cpu className="w-4 h-4" />
              <span>晶片連擊（Combo）與三階段加速</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              連續收集晶片每 <strong className="text-white">5 連擊</strong> 提升一次倍率（最高{' '}
              <span className="font-bold text-[#ffb703]">x4</span>），漏接或撞擊歸零。隨時間進入巡航、警戒（+25%）與超載衝刺期（+50%）。
            </p>
          </div>
        </div>

        {/* 過關條件摘要 */}
        <div className="mt-4 rounded-xl border border-[#00F5D4]/30 bg-[#00F5D4]/10 p-4 flex items-start gap-3">
          <Trophy className="w-5 h-5 text-[#00F5D4] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            <span className="font-bold text-white">過關與改裝：</span>在 {GAME_CONFIG.DURATION_SECONDS} 秒倒數歸零時存活且分數達到{' '}
            <span className="font-mono-tabular font-bold text-[#00F5D4]">
              {GAME_CONFIG.TARGET_SCORE.toLocaleString()} 分
            </span>
            。信用點數可於 3D 車庫解鎖塗裝、賽道主題與外觀進化的實體改裝套件！按{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 font-mono-tabular text-xs text-white">
              ESC / P
            </kbd>{' '}
            可隨時暫停。
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/20 text-slate-200 hover:bg-white/10 text-sm font-medium transition-colors cursor-pointer"
          >
            返回
          </button>
          <button
            type="button"
            onClick={onStartGame}
            className="px-6 py-2.5 rounded-xl bg-[#00F5D4] text-[#071324] font-bold text-sm hover:bg-[#38ffe5] transition-colors cursor-pointer"
          >
            立即開始任務
          </button>
        </div>
      </div>
    </div>
  );
};
