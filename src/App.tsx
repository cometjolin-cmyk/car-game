/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 應用程式主入口模組
 * 負責掛載獨立的 Three.js WebGL 容器並協調遊戲狀態機、3D 互動改裝車庫與 React UI 層
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { GarageOverlay } from './components/GarageOverlay';
import { InstructionsModal } from './components/InstructionsModal';
import { PauseModal } from './components/PauseModal';
import { ResultModal } from './components/ResultModal';
import { StartScreen } from './components/StartScreen';
import { GAME_CONFIG, GameHUDState } from './game/constants';
import {
  CyberRunnerEngine,
  GarageCameraPreset,
  GaragePreviewState,
} from './game/engine';
import {
  loadSaveData,
  PlayerSaveData,
  TrackThemeId,
  VehicleSkinId,
} from './game/saveSystem';

const INITIAL_HUD_STATE: GameHUDState = {
  phase: 'START',
  difficultyStage: 'CRUISE',
  timeRemaining: GAME_CONFIG.DURATION_SECONDS,
  score: 0,
  targetScore: GAME_CONFIG.TARGET_SCORE,
  chipsCollected: 0,
  comboCount: 0,
  comboMultiplier: 1,
  maxCombo: 0,
  nearMissCount: 0,
  nearMissFlashKey: 0,
  nearMissSide: 'left',
  distanceMeters: 0,
  health: GAME_CONFIG.MAX_HEALTH,
  maxHealth: GAME_CONFIG.MAX_HEALTH,
  shieldPhase: 'READY',
  shieldTimer: 0,
  shieldCooldownTimer: 0,
  shieldMaxCooldown: GAME_CONFIG.SHIELD_BASE_COOLDOWN,
  turboPhase: 'READY',
  turboTimer: 0,
  turboCooldownTimer: 0,
  turboMaxDuration: GAME_CONFIG.TURBO_BASE_DURATION,
  isAirborne: false,
  isGliding: false,
  speedKmh: 192,
  bestScore: 0,
  credits: 0,
  lastEarnedCredits: 0,
  isNewBest: false,
  defeatReason: null,
  hitFlashKey: 0,
  shieldBlockFlashKey: 0,
  selectedSkin: 'cyber_cyan',
  selectedTheme: 'cyber_night',
};

const INITIAL_GARAGE_PREVIEW: GaragePreviewState = {
  exploded: 0,
  shieldPreview: false,
  turboPreview: false,
  showcaseBoxVisible: true,
  cameraPreset: 'ORBIT',
  inspectedPartLabel: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CyberRunnerEngine | null>(null);

  const [hud, setHud] = useState<GameHUDState>(INITIAL_HUD_STATE);
  const [saveData, setSaveData] = useState<PlayerSaveData>(() => loadSaveData());
  const [garagePreview, setGaragePreview] = useState<GaragePreviewState>(INITIAL_GARAGE_PREVIEW);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showGarage, setShowGarage] = useState(false);
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // 初始化 3D 遊戲引擎（單次掛載）
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CyberRunnerEngine(
      mount,
      (nextState) => {
        setHud(nextState);
      },
      (nextSave) => {
        setSaveData(nextSave);
      },
      (nextGarage) => {
        setGaragePreview(nextGarage);
      },
      (lost) => {
        setContextLost(lost);
      }
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleOpenGarage = useCallback(() => {
    setShowInstructions(false);
    setShowGarage(true);
    engineRef.current?.enterGarage();
  }, []);

  const handleCloseGarage = useCallback(() => {
    setShowGarage(false);
    engineRef.current?.exitGarage();
  }, []);

  const handleStartGame = useCallback(() => {
    setShowInstructions(false);
    setShowGarage(false);
    engineRef.current?.startGame();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnMenu = useCallback(() => {
    setShowGarage(false);
    engineRef.current?.returnToMenu();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleMoveLeft = useCallback(() => {
    engineRef.current?.moveLeft();
  }, []);

  const handleMoveRight = useCallback(() => {
    engineRef.current?.moveRight();
  }, []);

  const handleJumpStart = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleJumpEnd = useCallback(() => {
    engineRef.current?.releaseJump();
  }, []);

  const handleActivateShield = useCallback(() => {
    engineRef.current?.activateShield();
  }, []);

  const handleActivateTurbo = useCallback(() => {
    engineRef.current?.activateTurbo();
  }, []);

  const handleSelectOrUnlockSkin = useCallback((skinId: VehicleSkinId) => {
    engineRef.current?.selectOrUnlockSkin(skinId);
  }, []);

  const handleSelectOrUnlockTheme = useCallback((themeId: TrackThemeId) => {
    engineRef.current?.selectOrUnlockTheme(themeId);
  }, []);

  const handleUpgradeShieldCooldown = useCallback(() => {
    engineRef.current?.upgradeShieldCooldown();
  }, []);

  const handleUpgradeTurboDuration = useCallback(() => {
    engineRef.current?.upgradeTurboDuration();
  }, []);

  const handleExplodedChange = useCallback((value: number) => {
    engineRef.current?.setGarageExploded(value);
  }, []);

  const handleToggleShieldPreview = useCallback(() => {
    engineRef.current?.setGarageShieldPreview(!garagePreview.shieldPreview);
  }, [garagePreview.shieldPreview]);

  const handleToggleTurboPreview = useCallback(() => {
    engineRef.current?.setGarageTurboPreview(!garagePreview.turboPreview);
  }, [garagePreview.turboPreview]);

  const handleToggleShowcaseBox = useCallback(() => {
    engineRef.current?.setGarageShowcaseBox(!garagePreview.showcaseBoxVisible);
  }, [garagePreview.showcaseBoxVisible]);

  const handleCameraPresetChange = useCallback((preset: GarageCameraPreset) => {
    engineRef.current?.setGarageCameraPreset(preset);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B192C]">
      {/* 獨立 WebGL 畫布容器 */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="3D 賽博天際線跑酷遊戲視口"
      />

      {/* WebGL Context Lost 優雅降級提示 */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/90 p-6 text-center">
          <div className="cyber-glass-danger max-w-md rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-[#FF0055]">
              圖形渲染連線中斷
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              WebGL 畫布暫時失去連線，正在等待系統恢復顯示資源，或請重新整理頁面。
            </p>
          </div>
        </div>
      )}

      {/* 遊玩中與暫停時顯示 HUD 資訊介面 */}
      {(hud.phase === 'PLAYING' || hud.phase === 'PAUSED') && !showGarage && (
        <GameHUD
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onJumpStart={handleJumpStart}
          onJumpEnd={handleJumpEnd}
          onActivateShield={handleActivateShield}
          onActivateTurbo={handleActivateTurbo}
        />
      )}

      {/* 開始畫面 */}
      {hud.phase === 'START' && !showInstructions && !showGarage && (
        <StartScreen
          bestScore={saveData.bestScore}
          credits={saveData.credits}
          selectedSkin={saveData.selectedSkin}
          selectedTheme={saveData.selectedTheme}
          onStart={handleStartGame}
          onOpenGarage={handleOpenGarage}
          onOpenInstructions={() => setShowInstructions(true)}
        />
      )}

      {/* 操作說明彈窗 */}
      {showInstructions && (
        <InstructionsModal
          onClose={() => setShowInstructions(false)}
          onStartGame={handleStartGame}
        />
      )}

      {/* 3D 互動改裝車庫（無遮擋中央視口） */}
      {showGarage && (
        <GarageOverlay
          saveData={saveData}
          preview={garagePreview}
          onSelectOrUnlockSkin={handleSelectOrUnlockSkin}
          onSelectOrUnlockTheme={handleSelectOrUnlockTheme}
          onUpgradeShieldCooldown={handleUpgradeShieldCooldown}
          onUpgradeTurboDuration={handleUpgradeTurboDuration}
          onExplodedChange={handleExplodedChange}
          onToggleShieldPreview={handleToggleShieldPreview}
          onToggleTurboPreview={handleToggleTurboPreview}
          onToggleShowcaseBox={handleToggleShowcaseBox}
          onCameraPresetChange={handleCameraPresetChange}
          onClose={handleCloseGarage}
        />
      )}

      {/* 暫停選單 */}
      {hud.phase === 'PAUSED' && !showGarage && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={handleStartGame}
          onReturnMenu={handleReturnMenu}
        />
      )}

      {/* 模型收藏銘牌風電子貨運簽收單結算畫面 */}
      {(hud.phase === 'VICTORY' || hud.phase === 'DEFEAT') && !showGarage && (
        <ResultModal
          hud={hud}
          onRetry={handleStartGame}
          onOpenGarage={handleOpenGarage}
          onReturnMenu={handleReturnMenu}
        />
      )}
    </main>
  );
}
