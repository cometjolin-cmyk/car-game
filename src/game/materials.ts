/**
 * 程序化貼圖與玩具模型質感 PBR 材質庫
 * 支援：
 * - 亮面 ABS 烤漆與消光軟膠粗糙度對比
 * - 三種可切換「賽道微縮主題」（賽博夜城／極光白模測試場／赤紅警戒工業區）
 * - 透明粒子壓克力展示盒、雙層護盾材質與實體改裝套件材質
 */

import * as THREE from 'three';
import { CYBER_COLORS } from './constants';
import {
  getSkinConfig,
  getTrackThemeConfig,
  TrackThemeConfig,
  TrackThemeId,
  VehicleSkinId,
} from './saveSystem';

export interface GameMaterialLibrary {
  roadSurface: THREE.MeshStandardMaterial;
  roadSideDeck: THREE.MeshStandardMaterial;
  guardrailBody: THREE.MeshStandardMaterial;
  guardrailNeonCyan: THREE.MeshStandardMaterial;
  guardrailNeonPurple: THREE.MeshStandardMaterial;
  vehicleHull: THREE.MeshPhysicalMaterial;
  vehicleTrimMatte: THREE.MeshStandardMaterial;
  vehicleWhiteAccent: THREE.MeshPhysicalMaterial;
  vehicleMetalUpgrade: THREE.MeshStandardMaterial;
  vehicleCanopy: THREE.MeshPhysicalMaterial;
  vehicleAccentNeon: THREE.MeshStandardMaterial;
  vehicleThruster: THREE.MeshBasicMaterial;
  vehicleUnderglow: THREE.MeshBasicMaterial;
  shieldDome: THREE.MeshBasicMaterial;
  shieldWire: THREE.MeshBasicMaterial;
  shieldOuterDome: THREE.MeshBasicMaterial;
  shieldOuterRing: THREE.MeshBasicMaterial;
  dioramaAcrylicPanel: THREE.MeshPhysicalMaterial;
  dioramaAcrylicEdge: THREE.LineBasicMaterial;
  barrierPillar: THREE.MeshStandardMaterial;
  barrierBeam: THREE.MeshStandardMaterial;
  lowBarrierBase: THREE.MeshStandardMaterial;
  lowBarrierBeam: THREE.MeshStandardMaterial;
  droneChassis: THREE.MeshPhysicalMaterial;
  droneRotor: THREE.MeshStandardMaterial;
  droneCoreGlow: THREE.MeshStandardMaterial;
  droneTrackRail: THREE.MeshBasicMaterial;
  chipCrystal: THREE.MeshPhysicalMaterial;
  chipRing: THREE.MeshStandardMaterial;
  buildingBase: THREE.MeshStandardMaterial;
  buildingRoofCap: THREE.MeshStandardMaterial;
  buildingNeonCyan: THREE.MeshBasicMaterial;
  buildingNeonPurple: THREE.MeshBasicMaterial;
  buildingNeonMagenta: THREE.MeshBasicMaterial;
  applyVehicleSkin: (skinId: VehicleSkinId) => void;
  applyTrackTheme: (themeId: TrackThemeId) => void;
  dispose: () => void;
}

/** 繪製模組化模型軌道紋理 */
function createRoadTexture(theme: TrackThemeConfig, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = theme.roadBgHex;
  ctx.fillRect(0, 0, 512, 512);

  // 模組化軌道拼接格線
  ctx.strokeStyle = theme.roadGridHex;
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let x = 0; x < 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // 車道分隔線
  const laneDividers = [184, 328];
  laneDividers.forEach((dx) => {
    ctx.fillStyle = theme.laneLineHex;
    ctx.globalAlpha = 0.25;
    for (let y = 14; y < 512; y += 64) {
      ctx.fillRect(dx - 6, y, 12, 36);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.laneLineHex;
    for (let y = 18; y < 512; y += 64) {
      ctx.fillRect(dx - 3, y, 6, 28);
    }
  });

  // 兩側軌道邊緣飾條
  ctx.fillStyle = theme.sideStripHex;
  ctx.fillRect(8, 0, 10, 512);
  ctx.fillRect(494, 0, 10, 512);

  ctx.fillStyle = theme.laneLineHex;
  ctx.fillRect(22, 0, 4, 512);
  ctx.fillRect(486, 0, 4, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/** 繪製微縮模型工程警示條紋貼圖 */
function createHazardStripeTexture(
  stripeColor: string,
  baseColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = stripeColor;
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 144, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/** 繪製微縮城市大樓窗格紋理 */
function createBuildingWindowTexture(
  theme: TrackThemeConfig,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = theme.buildingBgHex;
  ctx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 20;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  const palette = theme.buildingWindowPalette;
  for (let r = 0; r < rows; r++) {
    const rowLitChance = Math.random() * 0.52 + 0.22;
    for (let c = 0; c < cols; c++) {
      if (Math.random() < rowLitChance) {
        const color = palette[Math.floor(Math.random() * palette.length)];
        ctx.globalAlpha = 0.42 + Math.random() * 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(c * cellW + 5, r * cellH + 5, cellW - 10, cellH - 10);
      }
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/** 繪製能量護盾六角蜂巢紋理 */
function createHexShieldTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
  ctx.lineWidth = 2.5;

  const r = 22;
  const dx = r * 1.5;
  const dy = r * Math.sqrt(3);

  for (let row = -1; row < 10; row++) {
    for (let col = -1; col < 10; col++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 === 0 ? 0 : dy / 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

/** 繪製透明壓克力展示罩微粒點陣貼圖 */
function createAcrylicParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(180, 255, 248, 0.45)';
  for (let y = 8; y < 256; y += 16) {
    for (let x = 8; x < 256; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 上下邊緣全息刻度條紋
  ctx.strokeStyle = 'rgba(0, 245, 212, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 248);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

function createUnderglowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.32)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGameMaterials(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): GameMaterialLibrary {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const defaultTheme = getTrackThemeConfig('cyber_night');

  let roadTex = createRoadTexture(defaultTheme, maxAniso);
  let buildingTex = createBuildingWindowTexture(defaultTheme, maxAniso);
  const tallStripeTex = createHazardStripeTexture('#ff2a85', '#1d2438', maxAniso);
  const lowStripeTex = createHazardStripeTexture('#ffb703', '#1e293b', maxAniso);
  const hexTex = createHexShieldTexture();
  const acrylicTex = createAcrylicParticleTexture();
  const underglowTex = createUnderglowTexture();

  const staticTextures = [tallStripeTex, lowStripeTex, hexTex, acrylicTex, underglowTex];

  const roadSurface = new THREE.MeshStandardMaterial({
    map: roadTex,
    emissiveMap: roadTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.42,
    roughness: 0.48,
    metalness: 0.18,
  });

  const roadSideDeck = new THREE.MeshStandardMaterial({
    color: defaultTheme.sideDeckColor,
    roughness: 0.42,
    metalness: 0.15,
  });

  const guardrailBody = new THREE.MeshStandardMaterial({
    color: defaultTheme.guardrailColor,
    roughness: 0.36,
    metalness: 0.15,
  });

  const guardrailNeonCyan = new THREE.MeshStandardMaterial({
    color: defaultTheme.guardrailNeonA,
    emissive: defaultTheme.guardrailNeonA,
    emissiveIntensity: 1.55,
    roughness: 0.16,
    metalness: 0.05,
    transparent: true,
    opacity: 0.76,
  });

  const guardrailNeonPurple = new THREE.MeshStandardMaterial({
    color: defaultTheme.guardrailNeonB,
    emissive: defaultTheme.guardrailNeonB,
    emissiveIntensity: 1.45,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.76,
  });

  const vehicleHull = new THREE.MeshPhysicalMaterial({
    color: 0x1b6ca8,
    roughness: 0.22,
    metalness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
  });

  const vehicleTrimMatte = new THREE.MeshStandardMaterial({
    color: 0x182235,
    roughness: 0.82,
    metalness: 0.06,
  });

  const vehicleWhiteAccent = new THREE.MeshPhysicalMaterial({
    color: 0xe6f1ff,
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  // 改裝升級金屬散熱環／電漿套件材質
  const vehicleMetalUpgrade = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.2,
    metalness: 0.85,
  });

  const vehicleCanopy = new THREE.MeshPhysicalMaterial({
    color: 0x134e6f,
    emissive: 0x006d77,
    emissiveIntensity: 0.35,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 1.0,
    transparent: true,
    opacity: isSoftwareGl ? 0.72 : 0.85,
  });

  const vehicleAccentNeon = new THREE.MeshStandardMaterial({
    color: CYBER_COLORS.NEON_CYAN,
    emissive: CYBER_COLORS.NEON_CYAN,
    emissiveIntensity: 1.9,
    roughness: 0.18,
    metalness: 0.05,
  });

  const vehicleThruster = new THREE.MeshBasicMaterial({
    color: 0x80fff0,
  });

  const vehicleUnderglow = new THREE.MeshBasicMaterial({
    color: CYBER_COLORS.NEON_CYAN,
    map: underglowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.78,
  });

  const shieldDome = new THREE.MeshBasicMaterial({
    color: CYBER_COLORS.NEON_CYAN,
    map: hexTex,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const shieldWire = new THREE.MeshBasicMaterial({
    color: 0x8afff0,
    wireframe: true,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  // Lv.3 雙層六角蜂巢外層力場材質
  const shieldOuterDome = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    map: hexTex,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const shieldOuterRing = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // 透明粒子壓克力展示盒材質
  const dioramaAcrylicPanel = new THREE.MeshPhysicalMaterial({
    color: 0xb8fff6,
    map: acrylicTex,
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const dioramaAcrylicEdge = new THREE.LineBasicMaterial({
    color: CYBER_COLORS.NEON_CYAN,
    transparent: true,
    opacity: 0.72,
  });

  const barrierPillar = new THREE.MeshStandardMaterial({
    map: tallStripeTex,
    roughness: 0.38,
    metalness: 0.18,
  });

  const barrierBeam = new THREE.MeshStandardMaterial({
    color: CYBER_COLORS.WARNING_MAGENTA,
    emissive: CYBER_COLORS.WARNING_MAGENTA,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  });

  const lowBarrierBase = new THREE.MeshStandardMaterial({
    map: lowStripeTex,
    roughness: 0.4,
    metalness: 0.15,
  });

  const lowBarrierBeam = new THREE.MeshStandardMaterial({
    color: CYBER_COLORS.LOW_BARRIER_AMBER,
    emissive: CYBER_COLORS.LOW_BARRIER_AMBER,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.84,
  });

  const droneChassis = new THREE.MeshPhysicalMaterial({
    color: 0x3b2263,
    roughness: 0.24,
    metalness: 0.22,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
  });

  const droneRotor = new THREE.MeshStandardMaterial({
    color: CYBER_COLORS.ELECTRIC_PURPLE,
    emissive: CYBER_COLORS.ELECTRIC_PURPLE,
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.15,
  });

  const droneCoreGlow = new THREE.MeshStandardMaterial({
    color: CYBER_COLORS.WARNING_MAGENTA,
    emissive: CYBER_COLORS.WARNING_MAGENTA,
    emissiveIntensity: 2.2,
    roughness: 0.12,
    metalness: 0.05,
  });

  const droneTrackRail = new THREE.MeshBasicMaterial({
    color: CYBER_COLORS.WARNING_MAGENTA,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  const chipCrystal = new THREE.MeshPhysicalMaterial({
    color: 0x00f5d4,
    emissive: 0x00c9b7,
    emissiveIntensity: 1.25,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
  });

  const chipRing = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.35,
  });

  const buildingBase = new THREE.MeshStandardMaterial({
    color: defaultTheme.buildingBaseColor,
    map: buildingTex,
    emissiveMap: buildingTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.68,
    roughness: 0.62,
    metalness: 0.15,
  });

  const buildingRoofCap = new THREE.MeshStandardMaterial({
    color: defaultTheme.buildingRoofColor,
    roughness: 0.35,
    metalness: 0.15,
  });

  const buildingNeonCyan = new THREE.MeshBasicMaterial({ color: defaultTheme.guardrailNeonA });
  const buildingNeonPurple = new THREE.MeshBasicMaterial({ color: defaultTheme.guardrailNeonB });
  const buildingNeonMagenta = new THREE.MeshBasicMaterial({ color: CYBER_COLORS.WARNING_MAGENTA });

  const allMaterials: THREE.Material[] = [
    roadSurface,
    roadSideDeck,
    guardrailBody,
    guardrailNeonCyan,
    guardrailNeonPurple,
    vehicleHull,
    vehicleTrimMatte,
    vehicleWhiteAccent,
    vehicleMetalUpgrade,
    vehicleCanopy,
    vehicleAccentNeon,
    vehicleThruster,
    vehicleUnderglow,
    shieldDome,
    shieldWire,
    shieldOuterDome,
    shieldOuterRing,
    dioramaAcrylicPanel,
    dioramaAcrylicEdge,
    barrierPillar,
    barrierBeam,
    lowBarrierBase,
    lowBarrierBeam,
    droneChassis,
    droneRotor,
    droneCoreGlow,
    droneTrackRail,
    chipCrystal,
    chipRing,
    buildingBase,
    buildingRoofCap,
    buildingNeonCyan,
    buildingNeonPurple,
    buildingNeonMagenta,
  ];

  const applyVehicleSkin = (skinId: VehicleSkinId): void => {
    const skin = getSkinConfig(skinId);
    vehicleHull.color.setHex(skin.hullColor);
    vehicleAccentNeon.color.setHex(skin.accentColor);
    vehicleAccentNeon.emissive.setHex(skin.accentColor);
    vehicleThruster.color.setHex(skin.thrusterColor);
    vehicleUnderglow.color.setHex(skin.accentColor);
    dioramaAcrylicEdge.color.setHex(skin.accentColor);
  };

  const applyTrackTheme = (themeId: TrackThemeId): void => {
    const theme = getTrackThemeConfig(themeId);
    const prevRoadTex = roadTex;
    const prevBuildingTex = buildingTex;

    roadTex = createRoadTexture(theme, maxAniso);
    buildingTex = createBuildingWindowTexture(theme, maxAniso);

    roadSurface.map = roadTex;
    roadSurface.emissiveMap = roadTex;
    roadSurface.emissiveIntensity = themeId === 'aurora_white' ? 0.25 : 0.44;
    roadSurface.needsUpdate = true;

    roadSideDeck.color.setHex(theme.sideDeckColor);
    guardrailBody.color.setHex(theme.guardrailColor);

    guardrailNeonCyan.color.setHex(theme.guardrailNeonA);
    guardrailNeonCyan.emissive.setHex(theme.guardrailNeonA);

    guardrailNeonPurple.color.setHex(theme.guardrailNeonB);
    guardrailNeonPurple.emissive.setHex(theme.guardrailNeonB);

    buildingBase.color.setHex(theme.buildingBaseColor);
    buildingBase.map = buildingTex;
    buildingBase.emissiveMap = buildingTex;
    buildingBase.emissiveIntensity = themeId === 'aurora_white' ? 0.35 : 0.68;
    buildingBase.needsUpdate = true;

    buildingRoofCap.color.setHex(theme.buildingRoofColor);
    buildingNeonCyan.color.setHex(theme.guardrailNeonA);
    buildingNeonPurple.color.setHex(theme.guardrailNeonB);
    buildingNeonMagenta.color.setHex(
      themeId === 'aurora_white' ? 0x38bdf8 : themeId === 'crimson_sector' ? 0xffb703 : CYBER_COLORS.WARNING_MAGENTA
    );

    prevRoadTex.dispose();
    prevBuildingTex.dispose();
  };

  return {
    roadSurface,
    roadSideDeck,
    guardrailBody,
    guardrailNeonCyan,
    guardrailNeonPurple,
    vehicleHull,
    vehicleTrimMatte,
    vehicleWhiteAccent,
    vehicleMetalUpgrade,
    vehicleCanopy,
    vehicleAccentNeon,
    vehicleThruster,
    vehicleUnderglow,
    shieldDome,
    shieldWire,
    shieldOuterDome,
    shieldOuterRing,
    dioramaAcrylicPanel,
    dioramaAcrylicEdge,
    barrierPillar,
    barrierBeam,
    lowBarrierBase,
    lowBarrierBeam,
    droneChassis,
    droneRotor,
    droneCoreGlow,
    droneTrackRail,
    chipCrystal,
    chipRing,
    buildingBase,
    buildingRoofCap,
    buildingNeonCyan,
    buildingNeonPurple,
    buildingNeonMagenta,
    applyVehicleSkin,
    applyTrackTheme,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
      staticTextures.forEach((t) => t.dispose());
      roadTex.dispose();
      buildingTex.dispose();
    },
  };
}
