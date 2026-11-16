/**
 * 本機存檔與車庫改裝系統模組（LocalStorage）
 * 管理信用點數（Credits）、個人歷史最高分、車輛塗裝、賽道微縮主題與技能等級升級
 */

export type VehicleSkinId = 'cyber_cyan' | 'blaze_magenta' | 'midnight_gold';

export type TrackThemeId = 'cyber_night' | 'aurora_white' | 'crimson_sector';

export interface VehicleSkinConfig {
  id: VehicleSkinId;
  code: string;
  name: string;
  description: string;
  cost: number;
  hullColor: number;
  accentColor: number;
  thrusterColor: number;
  previewHex: string;
  accentHex: string;
}

export interface TrackThemeConfig {
  id: TrackThemeId;
  name: string;
  subtitle: string;
  description: string;
  cost: number;
  skyColor: number;
  overdriveSkyColor: number;
  fogDensity: number;
  roadBgHex: string;
  roadGridHex: string;
  laneLineHex: string;
  sideStripHex: string;
  sideDeckColor: number;
  guardrailColor: number;
  guardrailNeonA: number;
  guardrailNeonB: number;
  buildingBaseColor: number;
  buildingRoofColor: number;
  buildingBgHex: string;
  buildingWindowPalette: string[];
  hemiSkyColor: number;
  hemiGroundColor: number;
  rimColor: number;
  rimOverdriveColor: number;
  previewHex: string;
  accentHex: string;
}

export const VEHICLE_SKINS: VehicleSkinConfig[] = [
  {
    id: 'cyber_cyan',
    code: 'MK-90C',
    name: '預設賽博青',
    description: '標準特種快遞塗裝，亮澤賽博藍車殼搭配霓虹青電漿光條。',
    cost: 0,
    hullColor: 0x1b6ca8,
    accentColor: 0x00f5d4,
    thrusterColor: 0x80fff0,
    previewHex: '#1b6ca8',
    accentHex: '#00F5D4',
  },
  {
    id: 'blaze_magenta',
    code: 'MK-90M',
    name: '烈焰洋紅',
    description: '街頭競速塗裝，飽滿洋紅烤漆車殼搭配亮紫電光光條。',
    cost: 300,
    hullColor: 0x9e1946,
    accentColor: 0xff2a85,
    thrusterColor: 0xff85b8,
    previewHex: '#9e1946',
    accentHex: '#FF2A85',
  },
  {
    id: 'midnight_gold',
    code: 'MK-90G',
    name: '暗夜鎏金',
    description: '企業特仕塗裝，緞面炭黑模型外殼搭配亮金電鍍光條。',
    cost: 600,
    hullColor: 0x23293a,
    accentColor: 0xffbe0b,
    thrusterColor: 0xffe66d,
    previewHex: '#23293a',
    accentHex: '#FFBE0B',
  },
];

export const TRACK_THEMES: TrackThemeConfig[] = [
  {
    id: 'cyber_night',
    name: '賽博夜城',
    subtitle: 'NEON SKYLINE',
    description: '深邃賽博藍夜空與霓虹青紫光軌，經典微縮夜景天際線。',
    cost: 0,
    skyColor: 0x0b192c,
    overdriveSkyColor: 0x260b2c,
    fogDensity: 0.0115,
    roadBgHex: '#0e1b30',
    roadGridHex: 'rgba(148, 197, 255, 0.1)',
    laneLineHex: '#22ffe2',
    sideStripHex: '#8b3dff',
    sideDeckColor: 0x162947,
    guardrailColor: 0x223a5e,
    guardrailNeonA: 0x00f5d4,
    guardrailNeonB: 0x7b2cbf,
    buildingBaseColor: 0x172b4a,
    buildingRoofColor: 0x26426e,
    buildingBgHex: '#11213a',
    buildingWindowPalette: ['#00F5D4', '#9d4edd', '#38BDF8', '#FF2A85', '#FFE066'],
    hemiSkyColor: 0x7dd3fc,
    hemiGroundColor: 0x132038,
    rimColor: 0x7b2cbf,
    rimOverdriveColor: 0xff0055,
    previewHex: '#0b192c',
    accentHex: '#00F5D4',
  },
  {
    id: 'aurora_white',
    name: '極光白模測試場',
    subtitle: 'AURORA PROTOTYPE LAB',
    description: '純白建築級玩具原型軌道，極光冰藍導光線搭配柔和棚拍霧氣。',
    cost: 350,
    skyColor: 0x21446b,
    overdriveSkyColor: 0x3b2358,
    fogDensity: 0.0102,
    roadBgHex: '#dce8f5',
    roadGridHex: 'rgba(15, 55, 102, 0.16)',
    laneLineHex: '#00d9c0',
    sideStripHex: '#0284c7',
    sideDeckColor: 0xcbdcf0,
    guardrailColor: 0xeaf2fb,
    guardrailNeonA: 0x00f5d4,
    guardrailNeonB: 0x38bdf8,
    buildingBaseColor: 0xdbeafe,
    buildingRoofColor: 0xf8fafc,
    buildingBgHex: '#d5e4f5',
    buildingWindowPalette: ['#0ea5e9', '#00d9c0', '#6366f1', '#38bdf8', '#94a3b8'],
    hemiSkyColor: 0xe0f2fe,
    hemiGroundColor: 0x476b94,
    rimColor: 0x38bdf8,
    rimOverdriveColor: 0xc084fc,
    previewHex: '#dce8f5',
    accentHex: '#38BDF8',
  },
  {
    id: 'crimson_sector',
    name: '赤紅警戒工業區',
    subtitle: 'CRIMSON FOUNDRY',
    description: '高熱熔爐紅霧籠罩的重工高架道，搭配置頂琥珀與赤紅雷射護欄。',
    cost: 500,
    skyColor: 0x1d0812,
    overdriveSkyColor: 0x3a0514,
    fogDensity: 0.0118,
    roadBgHex: '#1a0c14',
    roadGridHex: 'rgba(255, 110, 90, 0.14)',
    laneLineHex: '#ffb703',
    sideStripHex: '#ff0055',
    sideDeckColor: 0x2c111d,
    guardrailColor: 0x3b1725,
    guardrailNeonA: 0xffb703,
    guardrailNeonB: 0xff0055,
    buildingBaseColor: 0x2a1019,
    buildingRoofColor: 0x451a28,
    buildingBgHex: '#1f0b12',
    buildingWindowPalette: ['#ff2a55', '#ffb703', '#fb7185', '#f97316', '#fde047'],
    hemiSkyColor: 0xfda4af,
    hemiGroundColor: 0x260912,
    rimColor: 0xff0055,
    rimOverdriveColor: 0xffb703,
    previewHex: '#2c111d',
    accentHex: '#FF2A55',
  },
];

export const SHIELD_COOLDOWN_UPGRADES = [
  { level: 0, cooldown: 8.0, cost: 0 },
  { level: 1, cooldown: 7.0, cost: 200 },
  { level: 2, cooldown: 6.0, cost: 400 },
  { level: 3, cooldown: 5.0, cost: 700 },
] as const;

export const TURBO_DURATION_UPGRADES = [
  { level: 0, duration: 3.0, cost: 0 },
  { level: 1, duration: 3.6, cost: 200 },
  { level: 2, duration: 4.3, cost: 400 },
  { level: 3, duration: 5.0, cost: 700 },
] as const;

export interface PlayerSaveData {
  bestScore: number;
  credits: number;
  unlockedSkins: VehicleSkinId[];
  selectedSkin: VehicleSkinId;
  unlockedThemes: TrackThemeId[];
  selectedTheme: TrackThemeId;
  shieldCooldownLevel: number; // 0 ~ 3
  turboDurationLevel: number; // 0 ~ 3
}

const SAVE_STORAGE_KEY = 'cyber_skyline_90s_save_v1';
const LEGACY_BEST_KEY = 'cyber_skyline_90s_best_score';

const DEFAULT_SAVE: PlayerSaveData = {
  bestScore: 0,
  credits: 0,
  unlockedSkins: ['cyber_cyan'],
  selectedSkin: 'cyber_cyan',
  unlockedThemes: ['cyber_night'],
  selectedTheme: 'cyber_night',
  shieldCooldownLevel: 0,
  turboDurationLevel: 0,
};

export function loadSaveData(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
      return {
        bestScore: Math.max(0, Number(parsed.bestScore) || 0),
        credits: Math.max(0, Number(parsed.credits) || 0),
        unlockedSkins:
          Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
            ? (parsed.unlockedSkins as VehicleSkinId[])
            : ['cyber_cyan'],
        selectedSkin: parsed.selectedSkin || 'cyber_cyan',
        unlockedThemes:
          Array.isArray(parsed.unlockedThemes) && parsed.unlockedThemes.length > 0
            ? (parsed.unlockedThemes as TrackThemeId[])
            : ['cyber_night'],
        selectedTheme: parsed.selectedTheme || 'cyber_night',
        shieldCooldownLevel: Math.min(3, Math.max(0, Number(parsed.shieldCooldownLevel) || 0)),
        turboDurationLevel: Math.min(3, Math.max(0, Number(parsed.turboDurationLevel) || 0)),
      };
    }

    const legacyBest = localStorage.getItem(LEGACY_BEST_KEY);
    if (legacyBest) {
      return {
        ...DEFAULT_SAVE,
        bestScore: Math.max(0, parseInt(legacyBest, 10) || 0),
      };
    }
  } catch {
    // 忽略無痕模式或儲存權限異常
  }
  return { ...DEFAULT_SAVE };
}

export function persistSaveData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 忽略儲存異常
  }
}

export function getEffectiveShieldCooldown(level: number): number {
  const entry = SHIELD_COOLDOWN_UPGRADES[Math.min(3, Math.max(0, level))];
  return entry.cooldown;
}

export function getEffectiveTurboDuration(level: number): number {
  const entry = TURBO_DURATION_UPGRADES[Math.min(3, Math.max(0, level))];
  return entry.duration;
}

export function getSkinConfig(skinId: VehicleSkinId): VehicleSkinConfig {
  return VEHICLE_SKINS.find((s) => s.id === skinId) || VEHICLE_SKINS[0];
}

export function getTrackThemeConfig(themeId: TrackThemeId): TrackThemeConfig {
  return TRACK_THEMES.find((t) => t.id === themeId) || TRACK_THEMES[0];
}

/** 將單局分數換算為信用點數（每 10 分 = 1 信用點數，勝利額外獎勵 +150） */
export function calculateEarnedCredits(score: number, isVictory: boolean): number {
  const baseCredits = Math.floor(score / 10);
  const victoryBonus = isVictory ? 150 : 0;
  return baseCredits + victoryBonus;
}
