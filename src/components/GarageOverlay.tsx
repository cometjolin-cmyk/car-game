/**
 * 3D 互動改裝車庫覆蓋介面（Zero-Occlusion Collapsible Bottom Dock）
 * 支援：
 * - 外觀塗裝即時更換與預覽
 * - 賽道微縮主題即時切換（賽博夜城／極光白模測試場／赤紅警戒工業區）
 * - 技能強化與 3D 實體套件進化（Lv.2／Lv.3 解鎖實體外觀）
 * - 模型分解（Exploded View）、展示盒外罩開關與 360° 視角切換
 */

import React, { useState } from 'react';
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Flame,
  Layers,
  Lock,
  Map,
  Palette,
  RotateCcw,
  Shield,
  Wrench,
} from 'lucide-react';
import { GarageCameraPreset, GaragePreviewState } from '../game/engine';
import {
  PlayerSaveData,
  SHIELD_COOLDOWN_UPGRADES,
  TRACK_THEMES,
  TrackThemeId,
  TURBO_DURATION_UPGRADES,
  VEHICLE_SKINS,
  VehicleSkinId,
} from '../game/saveSystem';

interface GarageOverlayProps {
  saveData: PlayerSaveData;
  preview: GaragePreviewState;
  onSelectOrUnlockSkin: (skinId: VehicleSkinId) => void;
  onSelectOrUnlockTheme: (themeId: TrackThemeId) => void;
  onUpgradeShieldCooldown: () => void;
  onUpgradeTurboDuration: () => void;
  onExplodedChange: (value: number) => void;
  onToggleShieldPreview: () => void;
  onToggleTurboPreview: () => void;
  onToggleShowcaseBox: () => void;
  onCameraPresetChange: (preset: GarageCameraPreset) => void;
  onClose: () => void;
}

type GarageTab = 'PAINT' | 'THEME' | 'UPGRADES' | 'INSPECT';

export const GarageOverlay: React.FC<GarageOverlayProps> = ({
  saveData,
  preview,
  onSelectOrUnlockSkin,
  onSelectOrUnlockTheme,
  onUpgradeShieldCooldown,
  onUpgradeTurboDuration,
  onExplodedChange,
  onToggleShieldPreview,
  onToggleTurboPreview,
  onToggleShowcaseBox,
  onCameraPresetChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GarageTab>('PAINT');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const shieldLv = saveData.shieldCooldownLevel;
  const shieldCurrent = SHIELD_COOLDOWN_UPGRADES[shieldLv];
  const shieldNext = shieldLv < 3 ? SHIELD_COOLDOWN_UPGRADES[shieldLv + 1] : null;
  const canUpgradeShield = shieldNext !== null && saveData.credits >= shieldNext.cost;

  const turboLv = saveData.turboDurationLevel;
  const turboCurrent = TURBO_DURATION_UPGRADES[turboLv];
  const turboNext = turboLv < 3 ? TURBO_DURATION_UPGRADES[turboLv + 1] : null;
  const canUpgradeTurbo = turboNext !== null && saveData.credits >= turboNext.cost;

  const shieldKitHint =
    shieldLv === 0
      ? 'Lv.2 加裝電容鰭片 · Lv.3 雙層蜂巢力場'
      : shieldLv === 1
      ? '下階 Lv.2 將加裝兩側「全息電容鰭片」'
      : shieldLv === 2
      ? '下階 Lv.3 解鎖「雙層六角蜂巢力場產生器」'
      : '已配備雙層六角蜂巢力場產生器';

  const turboKitHint =
    turboLv === 0
      ? 'Lv.2 加長散熱尾管 · Lv.3 四出電漿推進器'
      : turboLv === 1
      ? '下階 Lv.2 尾管加長並增設金屬散熱環'
      : turboLv === 2
      ? '下階 Lv.3 升級為「四出電漿推進器」'
      : '已配備四出電漿推進器與加長尾焰';

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-5">
      {/* 頂部精簡狀態列 */}
      <header className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto cyber-glass rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="font-display text-base sm:text-lg font-bold text-white whitespace-nowrap">
              3D 反重力改裝車庫
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
            {preview.inspectedPartLabel
              ? preview.inspectedPartLabel
              : '拖曳旋轉 360° · 滾輪縮放 · 點擊座艙／尾管／套件可即時互動'}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="cyber-glass rounded-xl px-3.5 py-2 flex items-center gap-1.5 text-[#ffb703]">
            <Coins className="w-4 h-4" />
            <span className="font-mono-tabular text-sm font-bold">
              {saveData.credits.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#00F5D4] text-[#071324] font-bold text-xs sm:text-sm hover:bg-[#38ffe5] transition-colors cursor-pointer whitespace-nowrap"
          >
            完成改裝
          </button>
        </div>
      </header>

      {/* 底部可收合改裝控制台 */}
      <div className="flex flex-col items-center w-full">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="pointer-events-auto cyber-glass px-4 py-1.5 rounded-t-xl border-b-0 text-xs font-medium text-slate-200 hover:text-[#00F5D4] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>展開改裝面板</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>純粹賞車模式</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto cyber-glass-modal w-full max-w-4xl rounded-2xl p-4 sm:p-5">
            {/* 分頁切換列與快捷測試鈕 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('PAINT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'PAINT'
                      ? 'bg-[#00F5D4] text-[#071324]'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>外觀塗裝</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('THEME')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'THEME'
                      ? 'bg-[#00F5D4] text-[#071324]'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>賽道主題</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('UPGRADES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'UPGRADES'
                      ? 'bg-[#00F5D4] text-[#071324]'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>套件升級</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('INSPECT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'INSPECT'
                      ? 'bg-[#00F5D4] text-[#071324]'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>分解與視角</span>
                </button>
              </div>

              {/* 右側即時 3D 特效測試快捷鈕 */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleShieldPreview}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                    preview.shieldPreview
                      ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4]'
                      : 'border-white/20 text-slate-300 hover:border-white/40'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>護盾測試</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleTurboPreview}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                    preview.turboPreview
                      ? 'bg-[#ffb703]/20 border-[#ffb703] text-[#ffb703]'
                      : 'border-white/20 text-slate-300 hover:border-white/40'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>渦輪點火</span>
                </button>
              </div>
            </div>

            {/* 分頁內容區 */}
            <div className="mt-3.5">
              {activeTab === 'PAINT' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {VEHICLE_SKINS.map((skin) => {
                    const unlocked = saveData.unlockedSkins.includes(skin.id);
                    const selected = saveData.selectedSkin === skin.id;
                    const affordable = saveData.credits >= skin.cost;

                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => onSelectOrUnlockSkin(skin.id)}
                        disabled={!unlocked && !affordable}
                        className={`text-left rounded-xl px-3.5 py-3 border transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#00F5D4]/15 border-[#00F5D4]'
                            : unlocked
                            ? 'bg-[#071222]/40 border-white/25 border-dashed hover:border-white/55'
                            : affordable
                            ? 'bg-[#071222]/40 border-[#ffb703]/55 border-dashed hover:border-[#ffb703]'
                            : 'bg-[#071222]/25 border-white/15 border-dotted opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-md border border-white/30 shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${skin.previewHex} 45%, ${skin.accentHex} 100%)`,
                              }}
                            />
                            <span className="text-sm font-bold text-white whitespace-nowrap">
                              {skin.name}
                            </span>
                          </div>

                          {selected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00F5D4] whitespace-nowrap">
                              <Check className="w-3.5 h-3.5" />
                              裝備中
                            </span>
                          ) : unlocked ? (
                            <span className="text-xs text-slate-300 whitespace-nowrap">套用</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-mono-tabular text-xs font-bold whitespace-nowrap ${
                                affordable ? 'text-[#ffb703]' : 'text-slate-400'
                              }`}
                            >
                              <Lock className="w-3 h-3" />
                              {skin.cost}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-1">
                          {skin.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'THEME' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TRACK_THEMES.map((theme) => {
                    const unlocked = saveData.unlockedThemes.includes(theme.id);
                    const selected = saveData.selectedTheme === theme.id;
                    const affordable = saveData.credits >= theme.cost;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onSelectOrUnlockTheme(theme.id)}
                        disabled={!unlocked && !affordable}
                        className={`text-left rounded-xl px-3.5 py-3 border transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#00F5D4]/15 border-[#00F5D4]'
                            : unlocked
                            ? 'bg-[#071222]/40 border-white/25 border-dashed hover:border-white/55'
                            : affordable
                            ? 'bg-[#071222]/40 border-[#ffb703]/55 border-dashed hover:border-[#ffb703]'
                            : 'bg-[#071222]/25 border-white/15 border-dotted opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-md border border-white/30 shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${theme.previewHex} 50%, ${theme.accentHex} 100%)`,
                              }}
                            />
                            <span className="text-sm font-bold text-white whitespace-nowrap">
                              {theme.name}
                            </span>
                          </div>

                          {selected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00F5D4] whitespace-nowrap">
                              <Check className="w-3.5 h-3.5" />
                              套用中
                            </span>
                          ) : unlocked ? (
                            <span className="text-xs text-slate-300 whitespace-nowrap">切換</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-mono-tabular text-xs font-bold whitespace-nowrap ${
                                affordable ? 'text-[#ffb703]' : 'text-slate-400'
                              }`}
                            >
                              <Lock className="w-3 h-3" />
                              {theme.cost}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-1">
                          {theme.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'UPGRADES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 護盾冷卻縮減＋實體套件進化 */}
                  <div className="cyber-subcard rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#00F5D4] shrink-0" />
                        <span className="text-sm font-bold text-white whitespace-nowrap">
                          護盾冷卻縮減
                        </span>
                        <span className="font-mono-tabular text-xs text-[#00F5D4] font-bold">
                          Lv.{shieldLv}/3
                        </span>
                      </div>
                      <div className="text-xs text-slate-200 mt-1 font-mono-tabular">
                        冷卻 {shieldCurrent.cooldown.toFixed(1)}s
                        {shieldNext && (
                          <span className="text-[#00F5D4] ml-1.5">
                            → {shieldNext.cooldown.toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {shieldKitHint}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onUpgradeShieldCooldown}
                      disabled={!canUpgradeShield}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                        shieldNext === null
                          ? 'bg-slate-800/80 text-slate-400 cursor-default'
                          : canUpgradeShield
                          ? 'bg-[#00F5D4] text-[#071324] hover:bg-[#38ffe5] cursor-pointer'
                          : 'bg-slate-800/60 text-slate-400 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {shieldNext === null ? (
                        <span>已滿級</span>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span className="font-mono-tabular">{shieldNext.cost}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 渦輪持續延長＋四出推進套件進化 */}
                  <div className="cyber-subcard rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#ffb703] shrink-0" />
                        <span className="text-sm font-bold text-white whitespace-nowrap">
                          渦輪時間延長
                        </span>
                        <span className="font-mono-tabular text-xs text-[#ffb703] font-bold">
                          Lv.{turboLv}/3
                        </span>
                      </div>
                      <div className="text-xs text-slate-200 mt-1 font-mono-tabular">
                        持續 {turboCurrent.duration.toFixed(1)}s
                        {turboNext && (
                          <span className="text-[#ffb703] ml-1.5">
                            → {turboNext.duration.toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {turboKitHint}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onUpgradeTurboDuration}
                      disabled={!canUpgradeTurbo}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                        turboNext === null
                          ? 'bg-slate-800/80 text-slate-400 cursor-default'
                          : canUpgradeTurbo
                          ? 'bg-[#ffb703] text-[#071324] hover:bg-[#ffd14d] cursor-pointer'
                          : 'bg-slate-800/60 text-slate-400 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {turboNext === null ? (
                        <span>已滿級</span>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span className="font-mono-tabular">{turboNext.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'INSPECT' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* 模型零件分解滑桿 */}
                  <div className="cyber-subcard rounded-xl px-4 py-2.5 flex-1 flex items-center gap-3">
                    <Layers className="w-4 h-4 text-[#00F5D4] shrink-0" />
                    <span className="text-xs font-semibold text-white whitespace-nowrap">
                      模型分解展示
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(preview.exploded * 100)}
                      onChange={(e) => onExplodedChange(Number(e.target.value) / 100)}
                      aria-label="模型零件分解比例"
                      className="flex-1 accent-[#00F5D4] cursor-pointer"
                    />
                    <span className="font-mono-tabular text-xs font-bold text-[#00F5D4] w-10 text-right">
                      {Math.round(preview.exploded * 100)}%
                    </span>
                  </div>

                  {/* 展示盒外罩開關與攝影機預設視角切換 */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={onToggleShowcaseBox}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        preview.showcaseBoxVisible
                          ? 'bg-[#00F5D4]/15 border-[#00F5D4] text-[#00F5D4]'
                          : 'border-white/20 text-slate-300 hover:border-white/45'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>展示盒罩</span>
                    </button>

                    <Camera className="w-4 h-4 text-slate-300 mx-0.5 hidden sm:block" />
                    {(
                      [
                        { id: 'ORBIT', label: '斜角重置' },
                        { id: 'SIDE', label: '側面檢視' },
                        { id: 'REAR', label: '尾管特寫' },
                        { id: 'TOP', label: '頂部俯視' },
                      ] as const
                    ).map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => onCameraPresetChange(cam.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                          preview.cameraPreset === cam.id
                            ? 'bg-[#00F5D4]/20 border-[#00F5D4] text-[#00F5D4]'
                            : 'border-white/20 text-slate-200 hover:border-white/45'
                        }`}
                      >
                        {cam.id === 'ORBIT' && <RotateCcw className="w-3 h-3" />}
                        <span>{cam.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
