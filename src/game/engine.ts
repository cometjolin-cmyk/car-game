/**
 * 3D 遊戲主引擎模組
 * 整合 Three.js 場景、全息玩具展示盒開場儀式、微縮賽道主題、3D 實體改裝套件進化、
 * 極限擦身（Near-Miss）、晶片連擊倍率（Combo）與 3D 互動改裝車庫
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CyberAudioEngine } from './audio';
import { checkCollisions, clampLaneIndex, NearMissSide } from './collision';
import {
  CYBER_COLORS,
  DefeatReason,
  DifficultyStage,
  GAME_CONFIG,
  GameHUDState,
  GamePhase,
  SkillPhase,
} from './constants';
import { createGameMaterials, GameMaterialLibrary } from './materials';
import {
  createHoverVehicle,
  createToyBoxDiorama,
  HoverVehicleRig,
  ToyBoxDioramaRig,
  VehiclePartRole,
} from './models';
import { WorldObjectPool } from './pool';
import {
  calculateEarnedCredits,
  getEffectiveShieldCooldown,
  getEffectiveTurboDuration,
  getSkinConfig,
  getTrackThemeConfig,
  loadSaveData,
  persistSaveData,
  PlayerSaveData,
  SHIELD_COOLDOWN_UPGRADES,
  TRACK_THEMES,
  TrackThemeId,
  TURBO_DURATION_UPGRADES,
  VehicleSkinId,
} from './saveSystem';

export type GarageCameraPreset = 'ORBIT' | 'SIDE' | 'REAR' | 'TOP';

export interface GaragePreviewState {
  exploded: number;
  shieldPreview: boolean;
  turboPreview: boolean;
  showcaseBoxVisible: boolean;
  cameraPreset: GarageCameraPreset;
  inspectedPartLabel: string | null;
}

const PART_LABELS: Record<VehiclePartRole, string> = {
  hull: '亮面烤漆車殼 · 切換塗裝可即時更換配色',
  canopy: '氣泡壓克力座艙 · 點擊測試能量護盾',
  nose: '前導流保桿與探照頭燈',
  wing: '反重力側莢安定翼',
  spoiler: '快遞貨艙大尾翼 · 點擊測試渦輪點火',
  thruster: '電漿噴射推進總成 · 點擊測試渦輪點火',
  chassis: '消光防撞軟膠底盤基座',
  shield_kit: '護盾強化擴充套件 · 點擊測試能量護盾',
};

const _skyBase = new THREE.Color(CYBER_COLORS.SKY_NAVY);
const _skyOverdrive = new THREE.Color(CYBER_COLORS.SKY_OVERDRIVE);
const _skyCurrent = new THREE.Color(CYBER_COLORS.SKY_NAVY);
const _rimBase = new THREE.Color(CYBER_COLORS.ELECTRIC_PURPLE);
const _rimOverdrive = new THREE.Color(CYBER_COLORS.WARNING_MAGENTA);
const _pointerNdc = new THREE.Vector2();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3(0, 0.72, 0);
const _raceLookAt = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class CyberRunnerEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private materials: GameMaterialLibrary;
  private vehicle: HoverVehicleRig;
  private diorama: ToyBoxDioramaRig;
  private pool: WorldObjectPool;
  public audio: CyberAudioEngine;

  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private horizonRingMat: THREE.MeshBasicMaterial;
  private vehicleUnderLight: THREE.PointLight;
  private raycaster = new THREE.Raycaster();

  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private simElapsed = 0;

  // 本機存檔與改裝數值
  private saveData: PlayerSaveData;

  // 遊戲狀態機
  private phase: GamePhase = 'START';
  private difficultyStage: DifficultyStage = 'CRUISE';
  private timeRemaining: number = GAME_CONFIG.DURATION_SECONDS;
  private score = 0;
  private chipsCollected = 0;
  private comboCount = 0;
  private comboMultiplier = 1;
  private maxCombo = 0;
  private nearMissCount = 0;
  private nearMissFlashKey = 0;
  private nearMissSide: NearMissSide = 'left';
  private distanceMeters = 0;
  private health: number = GAME_CONFIG.MAX_HEALTH;
  private lastEarnedCredits = 0;
  private isNewBest = false;
  private defeatReason: DefeatReason = null;

  // 展示盒開場出盒動畫計時
  private unboxTimer = 0;
  private readonly unboxDuration = 0.9;

  // 3D 互動改裝車庫狀態
  private garageMode = false;
  private garageExplodedTarget = 0;
  private garageExplodedCurrent = 0;
  private garageShieldPreview = false;
  private garageTurboPreview = false;
  private garageShowcaseBoxVisible = true;
  private garageCameraPreset: GarageCameraPreset = 'ORBIT';
  private garageTransitionActive = false;
  private garageInspectedPart: string | null = null;
  private pointerDownPos = { x: 0, y: 0 };

  // 車輛物理狀態
  private targetLaneIndex = 1;
  private vehicleX = 0;
  private vehicleRoll = 0;
  private vehicleY = 0;
  private vehicleVy = 0;
  private vehiclePitch = 0;
  private jumpKeyHeld = false;
  private isGliding = false;
  private glideFuel: number = GAME_CONFIG.MAX_GLIDE_FUEL;
  private currentSpeed: number = GAME_CONFIG.BASE_SPEED;

  // 主動技能：能量護盾（Shift / E）
  private shieldPhase: SkillPhase = 'READY';
  private shieldTimer = 0;
  private shieldCooldownTimer = 0;
  private shieldMaxCooldown: number = GAME_CONFIG.SHIELD_BASE_COOLDOWN;

  // 主動技能：渦輪加速（Space）
  private turboPhase: SkillPhase = 'READY';
  private turboTimer = 0;
  private turboCooldownTimer = 0;
  private turboMaxDuration: number = GAME_CONFIG.TURBO_BASE_DURATION;

  // 無敵與視覺回饋狀態
  private invincibleTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitFlashKey = 0;
  private shieldBlockFlashKey = 0;
  private hudThrottleAccum = 0;
  private atmosphereBlend = 0;

  private onHudUpdate: (state: GameHUDState) => void;
  private onSaveUpdate?: (save: PlayerSaveData) => void;
  private onGarageUpdate?: (state: GaragePreviewState) => void;
  private onContextLost?: (lost: boolean) => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHUDState) => void,
    onSaveUpdate?: (save: PlayerSaveData) => void,
    onGarageUpdate?: (state: GaragePreviewState) => void,
    onContextLost?: (lost: boolean) => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onSaveUpdate = onSaveUpdate;
    this.onGarageUpdate = onGarageUpdate;
    this.onContextLost = onContextLost;
    this.audio = new CyberAudioEngine();

    this.saveData = loadSaveData();
    this.shieldMaxCooldown = getEffectiveShieldCooldown(this.saveData.shieldCooldownLevel);
    this.turboMaxDuration = getEffectiveTurboDuration(this.saveData.turboDurationLevel);
    this.isSoftwareGl = detectSoftwareWebGL();

    // 1. 初始化 WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    // 2. 初始化場景與指數霧
    const initTheme = getTrackThemeConfig(this.saveData.selectedTheme);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initTheme.skyColor);
    this.scene.fog = new THREE.FogExp2(initTheme.skyColor, initTheme.fogDensity);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. 初始化透視攝影機與 3D 車庫 OrbitControls
    const aspect =
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 360);
    this.camera.position.set(3.2, 2.75, 5.4);
    this.camera.lookAt(0, 0.9, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 9.8;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minPolarAngle = 0.18;
    this.controls.target.set(0, 0.72, 0);
    this.controls.addEventListener('start', () => {
      this.garageTransitionActive = false;
    });

    // 4. 棚拍微縮模型三點式照明系統
    this.hemiLight = new THREE.HemisphereLight(
      initTheme.hemiSkyColor,
      initTheme.hemiGroundColor,
      1.18
    );
    this.scene.add(this.hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.85);
    keyLight.position.set(14, 26, 18);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 70;
      keyLight.shadow.camera.left = -14;
      keyLight.shadow.camera.right = 14;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    this.rimLight = new THREE.DirectionalLight(initTheme.rimColor, 1.65);
    this.rimLight.position.set(-12, 12, -24);
    this.scene.add(this.rimLight);

    const horizonRingGeo = new THREE.TorusGeometry(34, 0.65, 8, 48);
    this.horizonRingMat = new THREE.MeshBasicMaterial({
      color: initTheme.rimColor,
      transparent: true,
      opacity: 0.42,
      fog: false,
    });
    const horizonRing = new THREE.Mesh(horizonRingGeo, this.horizonRingMat);
    horizonRing.position.set(0, 22, -245);
    this.scene.add(horizonRing);

    // 5. 初始化材質庫、塗裝、主題、懸浮車、全息展示盒與物件池
    this.materials = createGameMaterials(this.renderer, this.isSoftwareGl);
    this.materials.applyVehicleSkin(this.saveData.selectedSkin);
    this.materials.applyTrackTheme(this.saveData.selectedTheme);

    this.vehicle = createHoverVehicle(this.materials);
    this.vehicle.applyUpgradeVisuals(
      this.saveData.shieldCooldownLevel,
      this.saveData.turboDurationLevel
    );
    this.scene.add(this.vehicle.root);

    this.diorama = createToyBoxDiorama(
      this.materials,
      this.renderer.capabilities.getMaxAnisotropy()
    );
    this.scene.add(this.diorama.group);
    this.refreshDioramaNameplate();

    const activeSkin = getSkinConfig(this.saveData.selectedSkin);
    this.vehicleUnderLight = new THREE.PointLight(activeSkin.accentColor, 2.2, 11, 2);
    this.vehicleUnderLight.position.set(0, 1.2, 0.4);
    this.vehicle.root.add(this.vehicleUnderLight);

    this.pool = new WorldObjectPool(this.scene, this.materials);
    this.pool.clearObstacles();
    this.applyAtmosphere(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handleCanvasPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.handleCanvasPointerMove);

    this.onSaveUpdate?.({ ...this.saveData });
    this.emitGarage();
    this.emitHud();
    this.startLoop();
  }

  public getSaveData(): PlayerSaveData {
    return { ...this.saveData };
  }

  private refreshDioramaNameplate(): void {
    const skin = getSkinConfig(this.saveData.selectedSkin);
    const theme = getTrackThemeConfig(this.saveData.selectedTheme);
    this.diorama.updateNameplate(
      skin,
      theme,
      this.saveData.shieldCooldownLevel,
      this.saveData.turboDurationLevel
    );
  }

  /** 進入 3D 互動改裝車庫模式 */
  public enterGarage(): void {
    this.audio.unlock();
    this.garageMode = true;
    this.unboxTimer = 0;
    this.garageExplodedTarget = 0;
    this.garageShieldPreview = false;
    this.garageTurboPreview = false;
    this.garageShowcaseBoxVisible = true;
    this.garageInspectedPart = null;

    this.pool.clearObstacles();
    this.vehicle.root.position.set(0, 0, 0);
    this.vehicle.root.visible = true;
    this.vehicle.bodyGroup.visible = true;
    this.vehicle.bodyGroup.rotation.set(0, 0, 0);
    this.vehicle.shieldGroup.visible = false;

    this.diorama.group.visible = true;
    this.diorama.turntableGroup.position.y = 0;
    this.diorama.setAcrylicVisibility(true, 1.0, 0);

    this.controls.enabled = true;
    this.controls.target.set(0, 0.72, 0);
    this.setGarageCameraPreset('ORBIT');
    this.emitGarage();
  }

  /** 離開 3D 改裝車庫模式 */
  public exitGarage(): void {
    this.garageMode = false;
    this.garageExplodedTarget = 0;
    this.garageExplodedCurrent = 0;
    this.garageShieldPreview = false;
    this.garageTurboPreview = false;
    this.garageTransitionActive = false;
    this.garageInspectedPart = null;

    for (const part of this.vehicle.explodableParts) {
      part.object.position.copy(part.basePos);
    }

    this.vehicle.shieldGroup.visible = false;
    this.controls.enabled = false;
    this.renderer.domElement.style.cursor = 'default';

    if (this.phase === 'START') {
      this.diorama.group.visible = true;
      this.diorama.turntableGroup.position.y = 0;
      this.diorama.setAcrylicVisibility(true, 1.0, 0);
    } else {
      this.diorama.group.visible = false;
      this.camera.position.set(0, 5.2, 8.5);
      this.camera.lookAt(0, 0.85, -15);
    }
    this.emitGarage();
  }

  public setGarageExploded(value: number): void {
    this.garageExplodedTarget = THREE.MathUtils.clamp(value, 0, 1);
    this.emitGarage();
  }

  public setGarageShowcaseBox(visible: boolean): void {
    this.garageShowcaseBoxVisible = visible;
    this.emitGarage();
  }

  public setGarageShieldPreview(active: boolean): void {
    this.audio.unlock();
    this.garageShieldPreview = active;
    this.vehicle.shieldGroup.visible = active;
    if (active) {
      this.audio.playShieldActivate();
    }
    this.emitGarage();
  }

  public setGarageTurboPreview(active: boolean): void {
    this.audio.unlock();
    this.garageTurboPreview = active;
    if (active) {
      this.audio.playTurboActivate();
      const skin = getSkinConfig(this.saveData.selectedSkin);
      this.pool.emitBurst(0, 0.7, 1.8, skin.accentColor, 20);
    }
    this.emitGarage();
  }

  public setGarageCameraPreset(preset: GarageCameraPreset): void {
    this.garageCameraPreset = preset;
    this.garageTransitionActive = true;
    this.emitGarage();
  }

  /** 車庫：選擇或購買解鎖車輛塗裝 */
  public selectOrUnlockSkin(skinId: VehicleSkinId): boolean {
    this.audio.unlock();
    const skin = getSkinConfig(skinId);
    const alreadyUnlocked = this.saveData.unlockedSkins.includes(skinId);

    if (!alreadyUnlocked) {
      if (this.saveData.credits < skin.cost) return false;
      this.saveData = {
        ...this.saveData,
        credits: this.saveData.credits - skin.cost,
        unlockedSkins: [...this.saveData.unlockedSkins, skinId],
        selectedSkin: skinId,
      };
      this.audio.playUpgradeSuccess();
    } else {
      this.saveData = {
        ...this.saveData,
        selectedSkin: skinId,
      };
      this.audio.playLaneSwitch();
    }

    persistSaveData(this.saveData);
    this.materials.applyVehicleSkin(skinId);
    this.vehicleUnderLight.color.setHex(skin.accentColor);
    this.refreshDioramaNameplate();
    this.pool.emitBurst(0, 0.9, 0, skin.accentColor, 26);

    this.onSaveUpdate?.({ ...this.saveData });
    this.emitHud();
    return true;
  }

  /** 車庫：選擇或購買解鎖賽道微縮主題 */
  public selectOrUnlockTheme(themeId: TrackThemeId): boolean {
    this.audio.unlock();
    const theme = TRACK_THEMES.find((t) => t.id === themeId) || TRACK_THEMES[0];
    const alreadyUnlocked = this.saveData.unlockedThemes.includes(themeId);

    if (!alreadyUnlocked) {
      if (this.saveData.credits < theme.cost) return false;
      this.saveData = {
        ...this.saveData,
        credits: this.saveData.credits - theme.cost,
        unlockedThemes: [...this.saveData.unlockedThemes, themeId],
        selectedTheme: themeId,
      };
      this.audio.playUpgradeSuccess();
    } else {
      this.saveData = {
        ...this.saveData,
        selectedTheme: themeId,
      };
      this.audio.playLaneSwitch();
    }

    persistSaveData(this.saveData);
    this.materials.applyTrackTheme(themeId);
    this.applyAtmosphere(0);
    this.refreshDioramaNameplate();
    this.pool.emitBurst(0, 1.4, 0, theme.guardrailNeonA, 28);

    this.onSaveUpdate?.({ ...this.saveData });
    this.emitHud();
    return true;
  }

  public upgradeShieldCooldown(): boolean {
    this.audio.unlock();
    const nextLevel = this.saveData.shieldCooldownLevel + 1;
    if (nextLevel > 3) return false;
    const cost = SHIELD_COOLDOWN_UPGRADES[nextLevel].cost;
    if (this.saveData.credits < cost) return false;

    this.saveData = {
      ...this.saveData,
      credits: this.saveData.credits - cost,
      shieldCooldownLevel: nextLevel,
    };
    this.shieldMaxCooldown = getEffectiveShieldCooldown(nextLevel);
    persistSaveData(this.saveData);
    this.vehicle.applyUpgradeVisuals(
      this.saveData.shieldCooldownLevel,
      this.saveData.turboDurationLevel
    );
    this.refreshDioramaNameplate();
    this.audio.playUpgradeSuccess();
    this.pool.emitBurst(0, 1.1, 0, CYBER_COLORS.NEON_CYAN, 26);
    this.onSaveUpdate?.({ ...this.saveData });
    this.emitHud();
    return true;
  }

  public upgradeTurboDuration(): boolean {
    this.audio.unlock();
    const nextLevel = this.saveData.turboDurationLevel + 1;
    if (nextLevel > 3) return false;
    const cost = TURBO_DURATION_UPGRADES[nextLevel].cost;
    if (this.saveData.credits < cost) return false;

    this.saveData = {
      ...this.saveData,
      credits: this.saveData.credits - cost,
      turboDurationLevel: nextLevel,
    };
    this.turboMaxDuration = getEffectiveTurboDuration(nextLevel);
    persistSaveData(this.saveData);
    this.vehicle.applyUpgradeVisuals(
      this.saveData.shieldCooldownLevel,
      this.saveData.turboDurationLevel
    );
    this.refreshDioramaNameplate();
    this.audio.playUpgradeSuccess();
    this.pool.emitBurst(0, 0.8, 1.6, CYBER_COLORS.AMBER_SPARK, 26);
    this.onSaveUpdate?.({ ...this.saveData });
    this.emitHud();
    return true;
  }

  /** 開始或重新開始 90 秒任務（觸發「玩具展示盒解鎖出盒」儀式） */
  public startGame(): void {
    const wasInStart = this.phase === 'START' && !this.garageMode;
    if (this.garageMode) {
      this.exitGarage();
    }

    this.audio.unlock();
    this.shieldMaxCooldown = getEffectiveShieldCooldown(this.saveData.shieldCooldownLevel);
    this.turboMaxDuration = getEffectiveTurboDuration(this.saveData.turboDurationLevel);

    this.phase = 'PLAYING';
    this.difficultyStage = 'CRUISE';
    this.timeRemaining = GAME_CONFIG.DURATION_SECONDS;
    this.score = 0;
    this.chipsCollected = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.maxCombo = 0;
    this.nearMissCount = 0;
    this.nearMissFlashKey = 0;
    this.distanceMeters = 0;
    this.health = GAME_CONFIG.MAX_HEALTH;
    this.lastEarnedCredits = 0;
    this.isNewBest = false;
    this.defeatReason = null;

    this.targetLaneIndex = 1;
    this.vehicleX = 0;
    this.vehicleRoll = 0;
    this.vehicleY = 0;
    this.vehicleVy = 0;
    this.vehiclePitch = 0;
    this.jumpKeyHeld = false;
    this.isGliding = false;
    this.glideFuel = GAME_CONFIG.MAX_GLIDE_FUEL;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;
    this.atmosphereBlend = 0;

    this.shieldPhase = 'READY';
    this.shieldTimer = 0;
    this.shieldCooldownTimer = 0;

    this.turboPhase = 'READY';
    this.turboTimer = 0;
    this.turboCooldownTimer = 0;

    this.invincibleTimer = 0;
    this.shakeTimer = 0;

    this.vehicle.root.position.set(0, 0, 0);
    this.vehicle.bodyGroup.position.y = 0.68;
    this.vehicle.bodyGroup.rotation.set(0, 0, 0);
    this.vehicle.root.visible = true;
    this.vehicle.shieldGroup.visible = false;

    this.applyAtmosphere(0);
    this.pool.reset();

    // 若從開始畫面出盒啟動，播放展示盒上浮消散 + 推進起跑儀式
    if (wasInStart || this.diorama.group.visible) {
      this.unboxTimer = this.unboxDuration;
      this.diorama.group.visible = true;
      this.diorama.turntableGroup.position.y = 0;
      this.diorama.setAcrylicVisibility(true, 1.0, 0);
      this.audio.playUnboxingLaunch();

      const skin = getSkinConfig(this.saveData.selectedSkin);
      this.pool.emitBurst(-2.4, 2.2, 2.4, skin.accentColor, 14);
      this.pool.emitBurst(2.4, 2.2, 2.4, skin.accentColor, 14);
      this.pool.emitBurst(0, 2.6, -2.4, CYBER_COLORS.NEON_CYAN, 16);
    } else {
      this.unboxTimer = 0;
      this.diorama.group.visible = false;
    }

    this.clock.getDelta();
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'PLAYING') {
      this.phase = 'PAUSED';
      this.jumpKeyHeld = false;
      this.emitHud();
    } else if (this.phase === 'PAUSED') {
      this.audio.unlock();
      this.phase = 'PLAYING';
      this.clock.getDelta();
      this.emitHud();
    }
  }

  public returnToMenu(): void {
    if (this.garageMode) {
      this.exitGarage();
    }
    this.phase = 'START';
    this.difficultyStage = 'CRUISE';
    this.unboxTimer = 0;
    this.targetLaneIndex = 1;
    this.vehicleX = 0;
    this.vehicleRoll = 0;
    this.vehicleY = 0;
    this.vehicleVy = 0;
    this.vehiclePitch = 0;
    this.jumpKeyHeld = false;
    this.isGliding = false;
    this.atmosphereBlend = 0;
    this.applyAtmosphere(0);
    this.pool.clearObstacles();

    this.vehicle.root.position.set(0, 0, 0);
    this.vehicle.root.visible = true;
    this.vehicle.bodyGroup.visible = true;
    this.vehicle.bodyGroup.rotation.set(0, 0, 0);
    this.vehicle.shieldGroup.visible = false;

    this.diorama.group.visible = true;
    this.diorama.turntableGroup.position.y = 0;
    this.diorama.setAcrylicVisibility(true, 1.0, 0);
    this.emitHud();
  }

  public moveLeft(): void {
    if (this.phase !== 'PLAYING' || this.garageMode) return;
    const next = clampLaneIndex(this.targetLaneIndex - 1);
    if (next !== this.targetLaneIndex) {
      this.targetLaneIndex = next;
      this.audio.playLaneSwitch();
    }
  }

  public moveRight(): void {
    if (this.phase !== 'PLAYING' || this.garageMode) return;
    const next = clampLaneIndex(this.targetLaneIndex + 1);
    if (next !== this.targetLaneIndex) {
      this.targetLaneIndex = next;
      this.audio.playLaneSwitch();
    }
  }

  public triggerJump(): void {
    if (this.phase !== 'PLAYING' || this.garageMode) return;
    this.audio.unlock();
    this.jumpKeyHeld = true;
    if (this.vehicleY <= 0.04 && this.vehicleVy <= 0.1) {
      this.vehicleVy = GAME_CONFIG.JUMP_VELOCITY;
      this.glideFuel = GAME_CONFIG.MAX_GLIDE_FUEL;
      this.audio.playJump();
    }
  }

  public releaseJump(): void {
    this.jumpKeyHeld = false;
  }

  public activateShield(): void {
    if (this.phase !== 'PLAYING' || this.garageMode) return;
    if (this.shieldPhase !== 'READY') return;

    this.audio.unlock();
    this.shieldPhase = 'ACTIVE';
    this.shieldTimer = GAME_CONFIG.SHIELD_DURATION;
    this.vehicle.shieldGroup.visible = true;
    this.audio.playShieldActivate();
    this.emitHud();
  }

  public activateTurbo(): void {
    if (this.phase !== 'PLAYING' || this.garageMode) return;
    if (this.turboPhase !== 'READY') return;

    this.audio.unlock();
    this.turboPhase = 'ACTIVE';
    this.turboTimer = this.turboMaxDuration;
    this.shakeTimer = 0.18;
    this.shakeIntensity = 0.12;
    this.audio.playTurboActivate();
    this.emitHud();
  }

  public setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
  }

  private getCanvasNdc(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleCanvasPointerDown = (e: PointerEvent): void => {
    if (!this.garageMode) return;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handleCanvasPointerMove = (e: PointerEvent): void => {
    if (!this.garageMode) return;
    this.getCanvasNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(_pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.vehicle.interactiveMeshes, true);
    this.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  };

  private handleCanvasPointerUp = (e: PointerEvent): void => {
    if (!this.garageMode) return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (dx * dx + dy * dy > 36) return;

    this.getCanvasNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(_pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.vehicle.interactiveMeshes, true);
    if (hits.length === 0) return;

    const role = hits[0].object.userData.partRole as VehiclePartRole | undefined;
    if (!role) return;

    this.garageInspectedPart = PART_LABELS[role];

    if (role === 'thruster' || role === 'spoiler') {
      this.setGarageTurboPreview(!this.garageTurboPreview);
    } else if (role === 'canopy' || role === 'shield_kit') {
      this.setGarageShieldPreview(!this.garageShieldPreview);
    } else {
      const skin = getSkinConfig(this.saveData.selectedSkin);
      this.pool.emitBurst(hits[0].point.x, hits[0].point.y, hits[0].point.z, skin.accentColor, 14);
      this.audio.playLaneSwitch();
      this.emitGarage();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.garageMode) return;
    const code = e.code;

    if (!e.repeat && (code === 'Escape' || code === 'KeyP')) {
      if (this.phase === 'PLAYING' || this.phase === 'PAUSED') {
        e.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (this.phase !== 'PLAYING') return;

    if (code === 'KeyW' || code === 'ArrowUp') {
      e.preventDefault();
      if (!e.repeat) {
        this.triggerJump();
      } else {
        this.jumpKeyHeld = true;
      }
      return;
    }

    if (e.repeat) return;

    if (code === 'KeyA' || code === 'ArrowLeft') {
      e.preventDefault();
      this.moveLeft();
    } else if (code === 'KeyD' || code === 'ArrowRight') {
      e.preventDefault();
      this.moveRight();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') {
      e.preventDefault();
      this.activateShield();
    } else if (code === 'Space') {
      e.preventDefault();
      this.activateTurbo();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      this.jumpKeyHeld = false;
    }
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    if (this.phase === 'PLAYING') {
      this.phase = 'PAUSED';
      this.emitHud();
    }
    this.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLost?.(false);
  };

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const rawDelta = this.clock.getDelta();
      const delta = Math.min(rawDelta, 0.05);

      this.update(delta);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private applyAtmosphere(blend: number): void {
    const theme = getTrackThemeConfig(this.saveData.selectedTheme);
    _skyBase.setHex(theme.skyColor);
    _skyOverdrive.setHex(theme.overdriveSkyColor);
    _rimBase.setHex(theme.rimColor);
    _rimOverdrive.setHex(theme.rimOverdriveColor);

    _skyCurrent.copy(_skyBase).lerp(_skyOverdrive, blend);
    (this.scene.background as THREE.Color).copy(_skyCurrent);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_skyCurrent);
      this.scene.fog.density = theme.fogDensity;
    }

    this.hemiLight.color.setHex(theme.hemiSkyColor);
    this.hemiLight.groundColor.setHex(theme.hemiGroundColor);

    this.rimLight.color.copy(_rimBase).lerp(_rimOverdrive, blend);
    this.rimLight.intensity = THREE.MathUtils.lerp(1.65, 2.35, blend);
    this.horizonRingMat.color.copy(_rimBase).lerp(_rimOverdrive, blend);
  }

  private updateShieldAnimation(delta: number): void {
    if (!this.vehicle.shieldGroup.visible) return;
    this.vehicle.shieldDome.rotation.y += delta * 1.6;
    this.vehicle.shieldWire.rotation.y -= delta * 1.1;
    this.vehicle.shieldWire.rotation.x += delta * 0.7;

    if (this.vehicle.hasShieldLv3) {
      this.vehicle.shieldOuterDome.rotation.y -= delta * 1.25;
      this.vehicle.shieldOuterRing.rotation.z += delta * 1.9;
      this.vehicle.shieldParticleRing.rotation.y += delta * 2.2;
      this.vehicle.shieldParticleRing.rotation.z -= delta * 0.85;
    }

    const pulse = 1 + Math.sin(this.simElapsed * 10) * 0.025;
    this.vehicle.shieldGroup.scale.setScalar(pulse);
  }

  private updateGarageShowcase(delta: number): void {
    this.simElapsed += delta;

    // 1. 旋轉展示轉盤與懸浮微幅律動
    this.diorama.outerRing.rotation.z += delta * 0.45;
    this.diorama.innerRing.rotation.z -= delta * 0.65;

    this.vehicleX = THREE.MathUtils.damp(this.vehicleX, 0, 10, delta);
    this.vehicle.root.position.set(this.vehicleX, 0, 0);
    const hoverY = Math.sin(this.simElapsed * 3.4) * 0.065;
    this.vehicle.bodyGroup.position.y = 0.72 + hoverY;
    this.vehicle.bodyGroup.rotation.set(0, 0, 0);

    // 2. 模型分解動畫，展開零件時自動隱藏壓克力罩以免視覺穿模
    this.garageExplodedCurrent = THREE.MathUtils.damp(
      this.garageExplodedCurrent,
      this.garageExplodedTarget,
      8.5,
      delta
    );
    for (const part of this.vehicle.explodableParts) {
      part.object.position
        .copy(part.basePos)
        .addScaledVector(part.explodeOffset, this.garageExplodedCurrent);
    }

    const boxOpacity = this.garageShowcaseBoxVisible
      ? Math.max(0, 1 - this.garageExplodedCurrent * 3.2)
      : 0;
    this.diorama.setAcrylicVisibility(boxOpacity > 0.02, boxOpacity, 0);

    // 3. 噴射尾焰（含 Lv.3 四出電漿尾焰加長）與護盾展示動畫
    const lv3Bonus = this.vehicle.hasTurboLv3 ? 0.35 : 0;
    const flameBoost = (this.garageTurboPreview ? 1.15 : 0.0) + lv3Bonus;
    const flameScale = 0.75 + Math.sin(this.simElapsed * 32) * 0.14 + flameBoost;
    for (const flame of this.vehicle.thrusterFlames) {
      flame.scale.set(
        this.garageTurboPreview ? 1.35 : 0.9,
        flameScale,
        this.garageTurboPreview ? 1.35 : 0.9
      );
    }

    this.updateShieldAnimation(delta);

    // 4. 環境粒子與速度線測試
    this.pool.update(
      delta,
      this.simElapsed,
      this.garageTurboPreview ? 38 : 3.5,
      'CRUISE',
      this.garageTurboPreview,
      false
    );

    // 5. 平滑切換攝影機預設角度
    if (this.garageTransitionActive) {
      if (this.garageCameraPreset === 'ORBIT') {
        _targetCamPos.set(3.55, 2.65, 4.65);
      } else if (this.garageCameraPreset === 'SIDE') {
        _targetCamPos.set(5.5, 1.55, 0.2);
      } else if (this.garageCameraPreset === 'REAR') {
        _targetCamPos.set(1.75, 2.0, 5.05);
      } else {
        _targetCamPos.set(0.01, 5.9, 1.85);
      }

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _targetCamPos.x, 7.5, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _targetCamPos.y, 7.5, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _targetCamPos.z, 7.5, delta);
      this.controls.target.lerp(_targetLookAt, Math.min(1, delta * 8));

      if (this.camera.position.distanceTo(_targetCamPos) < 0.04) {
        this.garageTransitionActive = false;
      }
    }

    const targetFov = this.garageTurboPreview ? 56 : 46;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, delta);
      this.camera.updateProjectionMatrix();
    }

    this.controls.update();
  }

  private update(delta: number): void {
    if (this.garageMode) {
      this.updateGarageShowcase(delta);
      return;
    }

    if (this.phase === 'PAUSED') return;

    this.simElapsed += delta;
    const isPlaying = this.phase === 'PLAYING';
    const isStart = this.phase === 'START';
    const turboActive = isPlaying && this.turboPhase === 'ACTIVE';

    // 更新玩具展示盒出盒解鎖儀式（START -> PLAYING）
    if (this.unboxTimer > 0) {
      this.unboxTimer = Math.max(0, this.unboxTimer - delta);
      const progress = 1 - this.unboxTimer / this.unboxDuration;
      const liftY = progress * progress * 6.8;
      const opacityRatio = Math.max(0, 1 - progress * 1.35);
      this.diorama.setAcrylicVisibility(true, opacityRatio, liftY);
      this.diorama.turntableGroup.position.y = -progress * 1.45;
      this.diorama.outerRing.rotation.z += delta * 2.4;
      this.diorama.innerRing.rotation.z -= delta * 2.8;
      if (this.unboxTimer <= 0) {
        this.diorama.group.visible = false;
        this.diorama.turntableGroup.position.y = 0;
      }
    } else if (isStart) {
      this.diorama.group.visible = true;
      this.diorama.setAcrylicVisibility(true, 1.0, 0);
      this.diorama.outerRing.rotation.z += delta * 0.45;
      this.diorama.innerRing.rotation.z -= delta * 0.65;
    }

    if (isPlaying) {
      this.timeRemaining = Math.max(0, this.timeRemaining - delta);
      if (this.timeRemaining > 60) {
        this.difficultyStage = 'CRUISE';
      } else if (this.timeRemaining > 30) {
        this.difficultyStage = 'ALERT';
      } else {
        this.difficultyStage = 'OVERDRIVE';
      }

      const stageBaseSpeed =
        this.difficultyStage === 'CRUISE'
          ? GAME_CONFIG.BASE_SPEED
          : this.difficultyStage === 'ALERT'
          ? GAME_CONFIG.ALERT_SPEED
          : GAME_CONFIG.OVERDRIVE_SPEED;

      const targetSpeed =
        stageBaseSpeed * (turboActive ? GAME_CONFIG.TURBO_SPEED_MULTIPLIER : 1.0);
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 7.5, delta);
      this.distanceMeters += this.currentSpeed * delta;

      const targetBlend = this.difficultyStage === 'OVERDRIVE' ? 1.0 : 0.0;
      if (Math.abs(this.atmosphereBlend - targetBlend) > 0.002) {
        this.atmosphereBlend = THREE.MathUtils.damp(this.atmosphereBlend, targetBlend, 1.8, delta);
        this.applyAtmosphere(this.atmosphereBlend);
      }

      if (this.timeRemaining <= 0) {
        this.finishMission();
        return;
      }

      if (this.shieldPhase === 'ACTIVE') {
        this.shieldTimer -= delta;
        if (this.shieldTimer <= 0) {
          this.shieldTimer = 0;
          this.shieldPhase = 'COOLDOWN';
          this.shieldCooldownTimer = this.shieldMaxCooldown;
          this.vehicle.shieldGroup.visible = false;
        }
      } else if (this.shieldPhase === 'COOLDOWN') {
        this.shieldCooldownTimer -= delta;
        if (this.shieldCooldownTimer <= 0) {
          this.shieldCooldownTimer = 0;
          this.shieldPhase = 'READY';
        }
      }

      if (this.turboPhase === 'ACTIVE') {
        this.turboTimer -= delta;
        if (this.turboTimer <= 0) {
          this.turboTimer = 0;
          this.turboPhase = 'COOLDOWN';
          this.turboCooldownTimer = GAME_CONFIG.TURBO_COOLDOWN;
        }
      } else if (this.turboPhase === 'COOLDOWN') {
        this.turboCooldownTimer -= delta;
        if (this.turboCooldownTimer <= 0) {
          this.turboCooldownTimer = 0;
          this.turboPhase = 'READY';
        }
      }

      if (this.vehicleY > 0 || this.vehicleVy > 0) {
        const canGlide =
          this.jumpKeyHeld && this.vehicleVy < 0.25 && this.glideFuel > 0 && this.vehicleY > 0.08;

        if (canGlide) {
          this.isGliding = true;
          this.glideFuel = Math.max(0, this.glideFuel - delta);
          this.vehicleVy -= GAME_CONFIG.GLIDE_GRAVITY * delta;
          if (this.vehicleVy < GAME_CONFIG.GLIDE_MAX_FALL_SPEED) {
            this.vehicleVy = GAME_CONFIG.GLIDE_MAX_FALL_SPEED;
          }
        } else {
          this.isGliding = false;
          this.vehicleVy -= GAME_CONFIG.GRAVITY * delta;
        }

        this.vehicleY += this.vehicleVy * delta;
        if (this.vehicleY <= 0) {
          this.vehicleY = 0;
          this.vehicleVy = 0;
          this.isGliding = false;
        }
      } else {
        this.isGliding = false;
      }

      if (this.invincibleTimer > 0) {
        this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);
        const blinkOn = Math.floor(this.invincibleTimer * 18) % 2 === 0;
        this.vehicle.bodyGroup.visible = blinkOn;
        if (this.invincibleTimer <= 0) {
          this.vehicle.bodyGroup.visible = true;
        }
      } else {
        this.vehicle.bodyGroup.visible = true;
      }
    } else {
      this.currentSpeed = isStart ? 6.5 : 16;
      this.vehicleY = 0;
      this.vehicleVy = 0;
      this.isGliding = false;
      this.vehicle.bodyGroup.visible = true;
    }

    const targetX = GAME_CONFIG.LANE_POSITIONS[this.targetLaneIndex];
    const prevX = this.vehicleX;
    this.vehicleX = THREE.MathUtils.damp(this.vehicleX, targetX, 13.5, delta);
    const maxSafeX = GAME_CONFIG.GUARDRAIL_X - 1.35;
    this.vehicleX = THREE.MathUtils.clamp(this.vehicleX, -maxSafeX, maxSafeX);

    const lateralVel = delta > 0 ? (this.vehicleX - prevX) / delta : 0;
    const targetRoll = THREE.MathUtils.clamp(-lateralVel * 0.038, -0.36, 0.36);
    this.vehicleRoll = THREE.MathUtils.damp(this.vehicleRoll, targetRoll, 14, delta);

    const targetPitch = this.isGliding
      ? 0.08
      : THREE.MathUtils.clamp(this.vehicleVy * 0.026, -0.22, 0.28);
    this.vehiclePitch = THREE.MathUtils.damp(this.vehiclePitch, targetPitch, 12, delta);

    const hoverY = this.vehicleY > 0.05 ? 0 : Math.sin(this.simElapsed * 5.2) * 0.085;
    this.vehicle.root.position.x = this.vehicleX;
    this.vehicle.bodyGroup.position.y = 0.68 + this.vehicleY + hoverY;
    this.vehicle.bodyGroup.rotation.z = this.vehicleRoll;
    this.vehicle.bodyGroup.rotation.x = this.vehiclePitch;

    this.materials.vehicleUnderglow.opacity =
      0.78 * Math.max(0.18, 1 - this.vehicleY * 0.25);

    const lv3Bonus = this.vehicle.hasTurboLv3 ? 0.38 : 0;
    const flameBoost = (turboActive ? 0.95 : this.isGliding ? 0.35 : 0) + lv3Bonus;
    const flameScale = 0.85 + Math.sin(this.simElapsed * 38) * 0.18 + flameBoost;
    for (const flame of this.vehicle.thrusterFlames) {
      flame.scale.set(turboActive ? 1.3 : 1, flameScale, turboActive ? 1.3 : 1);
    }

    this.updateShieldAnimation(delta);

    this.pool.update(
      delta,
      this.simElapsed,
      this.currentSpeed,
      this.difficultyStage,
      turboActive,
      isPlaying
    );

    if (isPlaying) {
      checkCollisions(
        this.vehicleX,
        this.vehicleY,
        this.pool,
        this.shieldPhase === 'ACTIVE',
        this.invincibleTimer,
        {
          onChipCollected: () => {
            this.comboCount += 1;
            if (this.comboCount > this.maxCombo) {
              this.maxCombo = this.comboCount;
            }
            this.comboMultiplier = Math.min(
              GAME_CONFIG.MAX_COMBO_MULTIPLIER,
              1 + Math.floor(this.comboCount / GAME_CONFIG.COMBO_STEP)
            );
            const turboMult = turboActive ? GAME_CONFIG.TURBO_SCORE_MULTIPLIER : 1;
            this.score += GAME_CONFIG.CHIP_SCORE * this.comboMultiplier * turboMult;
            this.chipsCollected += 1;
            if (this.score > this.saveData.bestScore) {
              this.isNewBest = true;
            }
            this.audio.playChipCollect(turboActive, this.comboMultiplier);
            this.emitHud();
          },
          onChipMissed: () => {
            if (this.comboCount > 0) {
              this.comboCount = 0;
              this.comboMultiplier = 1;
              this.emitHud();
            }
          },
          onNearMiss: (side) => {
            this.score += GAME_CONFIG.NEAR_MISS_BONUS;
            this.nearMissCount += 1;
            this.nearMissSide = side;
            this.nearMissFlashKey += 1;
            if (this.score > this.saveData.bestScore) {
              this.isNewBest = true;
            }

            // 縮短正在冷卻中的技能 1.0 秒
            if (this.shieldPhase === 'COOLDOWN') {
              this.shieldCooldownTimer = Math.max(
                0,
                this.shieldCooldownTimer - GAME_CONFIG.NEAR_MISS_COOLDOWN_REDUCTION
              );
              if (this.shieldCooldownTimer <= 0) {
                this.shieldPhase = 'READY';
              }
            }
            if (this.turboPhase === 'COOLDOWN') {
              this.turboCooldownTimer = Math.max(
                0,
                this.turboCooldownTimer - GAME_CONFIG.NEAR_MISS_COOLDOWN_REDUCTION
              );
              if (this.turboCooldownTimer <= 0) {
                this.turboPhase = 'READY';
              }
            }

            this.audio.playNearMiss();
            this.emitHud();
          },
          onShieldAbsorb: () => {
            this.shieldPhase = 'COOLDOWN';
            this.shieldTimer = 0;
            this.shieldCooldownTimer = this.shieldMaxCooldown;
            this.vehicle.shieldGroup.visible = false;
            this.shakeTimer = 0.22;
            this.shakeIntensity = 0.18;
            this.shieldBlockFlashKey += 1;
            this.audio.playShieldBlock();
            this.emitHud();
          },
          onObstacleHit: () => {
            this.comboCount = 0;
            this.comboMultiplier = 1;
            this.health = Math.max(0, this.health - 1);
            this.invincibleTimer = GAME_CONFIG.INVINCIBLE_DURATION;
            this.shakeTimer = 0.38;
            this.shakeIntensity = 0.42;
            this.hitFlashKey += 1;
            this.audio.playHit();

            if (this.health <= 0) {
              this.concludeDefeat('HEALTH_DEPLETED');
              return;
            }
            this.emitHud();
          },
        }
      );
    }

    // 攝影機運鏡：開始畫面環繞展示盒，開始任務時平滑推入賽道追尾視角
    if (isStart) {
      const orbitAngle = Math.sin(this.simElapsed * 0.35) * 0.42 + 0.52;
      _targetCamPos.set(Math.sin(orbitAngle) * 5.8, 2.75, Math.cos(orbitAngle) * 5.8);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _targetCamPos.x, 4.5, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _targetCamPos.y, 4.5, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _targetCamPos.z, 4.5, delta);
      _raceLookAt.set(0, 0.92, 0);
      this.camera.lookAt(_raceLookAt);

      if (Math.abs(this.camera.fov - 46) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 46, 6, delta);
        this.camera.updateProjectionMatrix();
      }
    } else {
      const targetCamX = this.vehicleX * 0.48;
      const stageFovBonus =
        this.difficultyStage === 'ALERT' ? 2.5 : this.difficultyStage === 'OVERDRIVE' ? 5 : 0;
      const turboFovBonus = turboActive ? 12 : 0;
      const targetFov = isPlaying ? 54 + stageFovBonus + turboFovBonus : 50;

      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, delta);
        this.camera.updateProjectionMatrix();
      }

      let shakeX = 0;
      let shakeY = 0;
      if (this.shakeTimer > 0) {
        this.shakeTimer = Math.max(0, this.shakeTimer - delta);
        const decay = this.shakeTimer / 0.38;
        shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
        shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
      }

      const targetCamY = 5.15 + this.vehicleY * 0.44;
      const dampRate = this.unboxTimer > 0 ? 5.2 : 8.5;
      this.camera.position.x =
        THREE.MathUtils.damp(this.camera.position.x, targetCamX, dampRate, delta) + shakeX;
      this.camera.position.y =
        THREE.MathUtils.damp(this.camera.position.y, targetCamY, dampRate, delta) + shakeY;
      this.camera.position.z =
        THREE.MathUtils.damp(this.camera.position.z, 8.5, dampRate, delta);
      _raceLookAt.set(this.vehicleX * 0.25, 0.85 + this.vehicleY * 0.3, -15);
      this.camera.lookAt(_raceLookAt);
    }

    if (isPlaying) {
      this.hudThrottleAccum += delta;
      if (this.hudThrottleAccum >= 0.05) {
        this.hudThrottleAccum = 0;
        this.emitHud();
      }
    }
  }

  private concludeDefeat(reason: DefeatReason): void {
    this.phase = 'DEFEAT';
    this.defeatReason = reason;
    this.vehicle.bodyGroup.visible = true;
    this.jumpKeyHeld = false;
    this.saveRunResults(false);
    this.audio.playDefeat();
    this.emitHud();
  }

  private finishMission(): void {
    this.vehicle.bodyGroup.visible = true;
    this.jumpKeyHeld = false;
    const isVictory = this.health > 0 && this.score >= GAME_CONFIG.TARGET_SCORE;
    if (isVictory) {
      this.phase = 'VICTORY';
      this.defeatReason = null;
      this.saveRunResults(true);
      this.audio.playVictory();
    } else {
      this.phase = 'DEFEAT';
      this.defeatReason = 'SCORE_NOT_REACHED';
      this.saveRunResults(false);
      this.audio.playDefeat();
    }
    this.emitHud();
  }

  private saveRunResults(isVictory: boolean): void {
    const earned = calculateEarnedCredits(this.score, isVictory);
    this.lastEarnedCredits = earned;
    const nextBest = Math.max(this.saveData.bestScore, this.score);
    if (this.score > this.saveData.bestScore) {
      this.isNewBest = true;
    }

    this.saveData = {
      ...this.saveData,
      bestScore: nextBest,
      credits: this.saveData.credits + earned,
    };
    persistSaveData(this.saveData);
    this.onSaveUpdate?.({ ...this.saveData });
  }

  private emitGarage(): void {
    this.onGarageUpdate?.({
      exploded: this.garageExplodedTarget,
      shieldPreview: this.garageShieldPreview,
      turboPreview: this.garageTurboPreview,
      showcaseBoxVisible: this.garageShowcaseBoxVisible,
      cameraPreset: this.garageCameraPreset,
      inspectedPartLabel: this.garageInspectedPart,
    });
  }

  private emitHud(): void {
    this.onHudUpdate({
      phase: this.phase,
      difficultyStage: this.difficultyStage,
      timeRemaining: this.timeRemaining,
      score: this.score,
      targetScore: GAME_CONFIG.TARGET_SCORE,
      chipsCollected: this.chipsCollected,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      maxCombo: this.maxCombo,
      nearMissCount: this.nearMissCount,
      nearMissFlashKey: this.nearMissFlashKey,
      nearMissSide: this.nearMissSide,
      distanceMeters: Math.round(this.distanceMeters),
      health: this.health,
      maxHealth: GAME_CONFIG.MAX_HEALTH,
      shieldPhase: this.shieldPhase,
      shieldTimer: this.shieldTimer,
      shieldCooldownTimer: this.shieldCooldownTimer,
      shieldMaxCooldown: this.shieldMaxCooldown,
      turboPhase: this.turboPhase,
      turboTimer: this.turboTimer,
      turboCooldownTimer: this.turboCooldownTimer,
      turboMaxDuration: this.turboMaxDuration,
      isAirborne: this.vehicleY > 0.08,
      isGliding: this.isGliding,
      speedKmh: Math.round(this.currentSpeed * 6.4),
      bestScore: Math.max(this.saveData.bestScore, this.score),
      credits: this.saveData.credits,
      lastEarnedCredits: this.lastEarnedCredits,
      isNewBest: this.isNewBest,
      defeatReason: this.defeatReason,
      hitFlashKey: this.hitFlashKey,
      shieldBlockFlashKey: this.shieldBlockFlashKey,
      selectedSkin: this.saveData.selectedSkin,
      selectedTheme: this.saveData.selectedTheme,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handleCanvasPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.handleCanvasPointerMove);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.controls.dispose();
    this.diorama.dispose();
    this.pool.dispose();
    this.vehicle.dispose();
    this.materials.dispose();
    this.audio.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
