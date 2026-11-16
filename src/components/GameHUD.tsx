/**
 * 遊戲內 HUD 資訊介面模組
 * 顯示剩餘時間與難度階段、能量核心、分數進度、晶片連擊（Combo）倍率粒子條、
 * 極限擦身（Near-Miss）全息浮動提示與雙主動技能狀態。
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Flame,
  Pause,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GAME_CONFIG, GameHUDState } from '../game/constants';

interface GameHUDProps {
  hud: GameHUDState;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
  onActivateShield: () => void;
  onActivateTurbo: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  onToggleMute,
  onTogglePause,
  onMoveLeft,
  onMoveRight,
  onJumpStart,
  onJumpEnd,
  onActivateShield,
  onActivateTurbo,
}) => {
  const [hitFlashActive, setHitFlashActive] = useState(false);
  const [shieldFlashActive, setShieldFlashActive] = useState(false);
  const [nearMissVisible, setNearMissVisible] = useState(false);

  useEffect(() => {
    if (hud.hitFlashKey === 0) return;
    setHitFlashActive(true);
    const t = window.setTimeout(() => setHitFlashActive(false), 380);
    return () => window.clearTimeout(t);
  }, [hud.hitFlashKey]);

  useEffect(() => {
    if (hud.shieldBlockFlashKey === 0) return;
    setShieldFlashActive(true);
    const t = window.setTimeout(() => setShieldFlashActive(false), 320);
    return () => window.clearTimeout(t);
  }, [hud.shieldBlockFlashKey]);

  useEffect(() => {
    if (hud.nearMissFlashKey === 0) return;
    setNearMissVisible(true);
    const t = window.setTimeout(() => setNearMissVisible(false), 1050);
    return () => window.clearTimeout(t);
  }, [hud.nearMissFlashKey]);

  const isLowTime = hud.timeRemaining <= 10.0 && hud.phase === 'PLAYING';
  const scorePercent = Math.min(100, (hud.score / hud.targetScore) * 100);
  const targetReached = hud.score >= hud.targetScore;
  const turboActive = hud.turboPhase === 'ACTIVE';

  // Combo 粒子進度條計算（每 5 連擊升 1 階，最高 x4）
  const isMaxComboMult = hud.comboMultiplier >= GAME_CONFIG.MAX_COMBO_MULTIPLIER;
  const comboStepRemainder = hud.comboCount % GAME_CONFIG.COMBO_STEP;
  const comboProgress = isMaxComboMult
    ? 100
    : hud.comboCount > 0 && comboStepRemainder === 0
    ? 100
    : (comboStepRemainder / GAME_CONFIG.COMBO_STEP) * 100;

  const comboTierColor =
    hud.comboMultiplier >= 4
      ? 'text-[#ffb703]'
      : hud.comboMultiplier === 3
      ? 'text-[#c084fc]'
      : hud.comboMultiplier === 2
      ? 'text-[#00F5D4]'
      : 'text-slate-300';

  const stageMeta =
    hud.difficultyStage === 'CRUISE'
      ? { label: '巡航期', color: 'text-[#00F5D4]' }
      : hud.difficultyStage === 'ALERT'
      ? { label: '警戒期 · 加速 +25%', color: 'text-[#ffb703]' }
      : { label: '超載衝刺 · 加速 +50%', color: 'text-[#FF0055]' };

  let shieldProgress = 100;
  let shieldLabel = '護盾就緒';
  let shieldSub = 'Shift / E';
  if (hud.shieldPhase === 'ACTIVE') {
    shieldProgress = Math.max(0, (hud.shieldTimer / GAME_CONFIG.SHIELD_DURATION) * 100);
    shieldLabel = '護盾啟動';
    shieldSub = `${hud.shieldTimer.toFixed(1)}s`;
  } else if (hud.shieldPhase === 'COOLDOWN') {
    shieldProgress =
      ((hud.shieldMaxCooldown - hud.shieldCooldownTimer) / hud.shieldMaxCooldown) * 100;
    shieldLabel = '護盾冷卻';
    shieldSub = `${hud.shieldCooldownTimer.toFixed(1)}s`;
  }

  let turboProgress = 100;
  let turboLabel = '渦輪就緒';
  let turboSub = 'Space';
  if (hud.turboPhase === 'ACTIVE') {
    turboProgress = Math.max(0, (hud.turboTimer / hud.turboMaxDuration) * 100);
    turboLabel = '渦輪極速 2X';
    turboSub = `${hud.turboTimer.toFixed(1)}s`;
  } else if (hud.turboPhase === 'COOLDOWN') {
    turboProgress =
      ((GAME_CONFIG.TURBO_COOLDOWN - hud.turboCooldownTimer) / GAME_CONFIG.TURBO_COOLDOWN) * 100;
    turboLabel = '渦輪冷卻';
    turboSub = `${hud.turboCooldownTimer.toFixed(1)}s`;
  }

  const nearMissAlignClass =
    hud.nearMissSide === 'left'
      ? 'left-[22%] sm:left-[28%]'
      : hud.nearMissSide === 'right'
      ? 'right-[22%] sm:right-[28%]'
      : 'left-1/2 -translate-x-1/2';

  return (
    <>
      {/* 受傷紅光邊緣閃爍 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-20 transition-opacity duration-300 ${
          hitFlashActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 110px 38px rgba(255, 0, 85, 0.72)',
          background:
            'radial-gradient(circle at center, transparent 55%, rgba(255, 0, 85, 0.28) 100%)',
        }}
      />

      {/* 護盾抵擋成功青光閃爍 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-20 transition-opacity duration-200 ${
          shieldFlashActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 90px 26px rgba(0, 245, 212, 0.55)',
        }}
      />

      {/* 極限擦身全息浮動字樣（NEAR MISS! +50） */}
      {nearMissVisible && hud.phase === 'PLAYING' && (
        <div
          key={hud.nearMissFlashKey}
          aria-live="polite"
          className={`pointer-events-none fixed top-[34%] z-30 ${nearMissAlignClass} animate-near-miss`}
        >
          <div className="cyber-glass rounded-xl px-4 py-2 text-center border-[#ffb703]/70">
            <div className="flex items-center justify-center gap-1.5 font-display text-sm sm:text-base font-bold tracking-wider text-[#ffb703] whitespace-nowrap">
              <Sparkles className="w-4 h-4" />
              <span>NEAR MISS! +50</span>
            </div>
            <div className="font-mono-tabular text-[11px] font-semibold text-[#00F5D4] whitespace-nowrap">
              技能冷卻 -1.0s
            </div>
          </div>
        </div>
      )}

      {/* 頂部三區 HUD：確保中央 3D 視野完全無遮擋 */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between gap-2 sm:gap-3 p-3 sm:p-5">
        {/* 左上：生命核心、分數進度 & 連擊 Combo 倍率粒子條 */}
        <div className="pointer-events-auto cyber-glass rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 min-w-[195px] sm:min-w-[260px]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-medium text-slate-300">能量核心</span>
            <div className="flex items-center gap-1.5" aria-label={`生命值 ${hud.health} / ${hud.maxHealth}`}>
              {Array.from({ length: hud.maxHealth }).map((_, idx) => {
                const active = idx < hud.health;
                return (
                  <div
                    key={idx}
                    className={`w-6 h-5 rounded flex items-center justify-center border transition-colors ${
                      active
                        ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4]'
                        : 'bg-slate-900/80 border-slate-700 text-slate-600'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>晶片 {hud.chipsCollected}</span>
              {turboActive && (
                <span className="text-[11px] font-bold text-[#ffb703] ml-1">2X</span>
              )}
            </div>
            <div className="font-mono-tabular text-sm sm:text-base font-bold">
              <span className={targetReached ? 'text-[#00F5D4]' : 'text-white'}>
                {hud.score.toLocaleString()}
              </span>
              <span className="text-slate-400 text-xs font-normal">
                {' '}
                / {hud.targetScore.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-150 ${
                targetReached
                  ? 'bg-[#00F5D4]'
                  : 'bg-gradient-to-r from-[#7B2CBF] to-[#00F5D4]'
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {/* 晶片連擊（Combo）進度條 */}
          <div className="mt-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold text-slate-300">
                晶片連擊
              </span>
              <div className="flex items-center gap-2 font-mono-tabular text-xs font-bold">
                <span className="text-white">{hud.comboCount} 連擊</span>
                <span className={comboTierColor}>x{hud.comboMultiplier}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-950/90 overflow-hidden border border-white/10">
              <div
                className="h-full combo-particle-fill transition-all duration-150"
                style={{ width: `${hud.comboCount === 0 ? 0 : comboProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 中上：90 秒剩餘時間、難度階段與行駛里程 */}
        <div
          className={`pointer-events-auto rounded-xl px-4 sm:px-5 py-2 text-center transition-colors ${
            isLowTime ? 'cyber-glass-danger' : 'cyber-glass'
          }`}
        >
          <div className={`text-[11px] font-semibold tracking-wide whitespace-nowrap ${stageMeta.color}`}>
            {stageMeta.label}
          </div>
          <div
            className={`font-mono-tabular text-2xl sm:text-3xl font-bold leading-tight mt-0.5 ${
              isLowTime ? 'text-[#FF0055]' : 'text-white'
            }`}
          >
            {hud.timeRemaining.toFixed(1)}
            <span className="text-xs sm:text-sm font-medium ml-1 opacity-75">s</span>
          </div>
          <div className="font-mono-tabular text-[11px] text-slate-300 whitespace-nowrap">
            {hud.speedKmh} km/h · {hud.distanceMeters.toLocaleString()} m
            {hud.isGliding ? ' · 滑翔中' : hud.isAirborne ? ' · 滯空' : ''}
          </div>
        </div>

        {/* 右上：能量護盾 + 渦輪加速 + 系統控制 */}
        <div className="pointer-events-auto flex items-start gap-2">
          <div className="flex flex-col gap-2">
            {/* 能量護盾狀態 */}
            <div
              className={`rounded-xl px-3.5 py-2 min-w-[160px] sm:min-w-[195px] ${
                hud.shieldPhase === 'ACTIVE'
                  ? 'cyber-glass border-[#00F5D4]'
                  : hud.shieldPhase === 'COOLDOWN'
                  ? 'cyber-glass-purple'
                  : 'cyber-glass'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Shield
                    className={`w-3.5 h-3.5 ${
                      hud.shieldPhase === 'COOLDOWN' ? 'text-[#a855f7]' : 'text-[#00F5D4]'
                    }`}
                  />
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {shieldLabel}
                  </span>
                </div>
                <span className="font-mono-tabular text-[11px] text-slate-300 whitespace-nowrap">
                  {shieldSub}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    hud.shieldPhase === 'COOLDOWN' ? 'bg-[#7B2CBF]' : 'bg-[#00F5D4]'
                  }`}
                  style={{ width: `${shieldProgress}%` }}
                />
              </div>
            </div>

            {/* 渦輪加速狀態 */}
            <div
              className={`rounded-xl px-3.5 py-2 min-w-[160px] sm:min-w-[195px] ${
                hud.turboPhase === 'ACTIVE'
                  ? 'cyber-glass border-[#ffb703]'
                  : hud.turboPhase === 'COOLDOWN'
                  ? 'cyber-glass-purple'
                  : 'cyber-glass'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Flame
                    className={`w-3.5 h-3.5 ${
                      hud.turboPhase === 'COOLDOWN' ? 'text-slate-400' : 'text-[#ffb703]'
                    }`}
                  />
                  <span className="text-xs font-semibold text-white whitespace-nowrap">
                    {turboLabel}
                  </span>
                </div>
                <span className="font-mono-tabular text-[11px] text-slate-300 whitespace-nowrap">
                  {turboSub}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    hud.turboPhase === 'COOLDOWN' ? 'bg-slate-500' : 'bg-[#ffb703]'
                  }`}
                  style={{ width: `${turboProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onTogglePause}
              title="暫停遊戲 (ESC / P)"
              className="cyber-glass w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-[#00F5D4] hover:border-[#00F5D4]/60 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? '開啟音效' : '靜音'}
              className="cyber-glass w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-[#00F5D4] hover:border-[#00F5D4]/60 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-[#FF0055]" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 觸控／行動裝置專用底部操作控制 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex items-center justify-between px-4 md:hidden">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onMoveLeft}
            aria-label="向左切換車道"
            className="cyber-glass w-13 h-13 rounded-xl flex items-center justify-center text-[#00F5D4] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            aria-label="向右切換車道"
            className="cyber-glass w-13 h-13 rounded-xl flex items-center justify-center text-[#00F5D4] active:scale-95 transition-transform"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onPointerDown={onJumpStart}
            onPointerUp={onJumpEnd}
            onPointerLeave={onJumpEnd}
            onPointerCancel={onJumpEnd}
            className="cyber-glass px-3.5 h-13 rounded-xl flex items-center gap-1.5 font-semibold text-xs text-white active:scale-95 transition-transform"
          >
            <ArrowUp className="w-4 h-4 text-[#00F5D4]" />
            <span>跳躍</span>
          </button>

          <button
            type="button"
            onClick={onActivateTurbo}
            disabled={hud.turboPhase !== 'READY'}
            className={`cyber-glass px-3.5 h-13 rounded-xl flex items-center gap-1.5 font-semibold text-xs active:scale-95 transition-all ${
              hud.turboPhase === 'READY'
                ? 'text-[#ffb703] border-[#ffb703]/70'
                : 'text-slate-400 opacity-60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>渦輪</span>
          </button>

          <button
            type="button"
            onClick={onActivateShield}
            disabled={hud.shieldPhase !== 'READY'}
            className={`cyber-glass px-3.5 h-13 rounded-xl flex items-center gap-1.5 font-semibold text-xs active:scale-95 transition-all ${
              hud.shieldPhase === 'READY'
                ? 'text-[#00F5D4] border-[#00F5D4]/70'
                : 'text-slate-400 opacity-60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>護盾</span>
          </button>
        </div>
      </div>
    </>
  );
};
