/**
 * 遊戲核心常數與型別定義
 * 集中管理賽道幾何、跳躍與滑翔物理、渦輪加速、連擊倍數、極限擦身與 HUD 狀態
 */

import { TrackThemeId, VehicleSkinId } from './saveSystem';

export type GamePhase = 'START' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

export type DefeatReason = 'HEALTH_DEPLETED' | 'SCORE_NOT_REACHED' | null;

export type SkillPhase = 'READY' | 'ACTIVE' | 'COOLDOWN';

export type DifficultyStage = 'CRUISE' | 'ALERT' | 'OVERDRIVE';

export interface GameHUDState {
  phase: GamePhase;
  difficultyStage: DifficultyStage;
  timeRemaining: number;
  score: number;
  targetScore: number;
  chipsCollected: number;
  comboCount: number;
  comboMultiplier: number;
  maxCombo: number;
  nearMissCount: number;
  nearMissFlashKey: number;
  nearMissSide: 'left' | 'right' | 'top';
  distanceMeters: number;
  health: number;
  maxHealth: number;
  shieldPhase: SkillPhase;
  shieldTimer: number;
  shieldCooldownTimer: number;
  shieldMaxCooldown: number;
  turboPhase: SkillPhase;
  turboTimer: number;
  turboCooldownTimer: number;
  turboMaxDuration: number;
  isAirborne: boolean;
  isGliding: boolean;
  speedKmh: number;
  bestScore: number;
  credits: number;
  lastEarnedCredits: number;
  isNewBest: boolean;
  defeatReason: DefeatReason;
  hitFlashKey: number;
  shieldBlockFlashKey: number;
  selectedSkin: VehicleSkinId;
  selectedTheme: TrackThemeId;
}

export const GAME_CONFIG = {
  /** 總挑戰時間（秒） */
  DURATION_SECONDS: 90.0,
  /** 過關目標分數 */
  TARGET_SCORE: 3000,
  /** 單枚快遞晶片基礎分數 */
  CHIP_SCORE: 100,
  /** 連擊每累積 N 顆晶片提升 1 倍倍率（最高 4x） */
  COMBO_STEP: 5,
  MAX_COMBO_MULTIPLIER: 4,
  /** 極限擦身獎勵分數與技能冷卻縮短（秒） */
  NEAR_MISS_BONUS: 50,
  NEAR_MISS_COOLDOWN_REDUCTION: 1.0,
  /** 渦輪加速期間分數倍率 */
  TURBO_SCORE_MULTIPLIER: 2,
  /** 預設生命值（能量核心數） */
  MAX_HEALTH: 3,
  /** 能量護盾持續時間（秒） */
  SHIELD_DURATION: 5.0,
  /** 能量護盾基礎冷卻時間（秒） */
  SHIELD_BASE_COOLDOWN: 8.0,
  /** 渦輪加速基礎持續時間（秒） */
  TURBO_BASE_DURATION: 3.0,
  /** 渦輪加速冷卻時間（秒） */
  TURBO_COOLDOWN: 10.0,
  /** 渦輪加速速度倍率 */
  TURBO_SPEED_MULTIPLIER: 1.6,
  /** 跳躍初始垂直速度 */
  JUMP_VELOCITY: 12.2,
  /** 一般重力加速度 */
  GRAVITY: 30.0,
  /** 空中按住跳躍鍵的反重力滑翔減緩重力 */
  GLIDE_GRAVITY: 5.5,
  /** 反重力滑翔最大下落速度 */
  GLIDE_MAX_FALL_SPEED: -1.9,
  /** 單次滯空最長反重力滑翔時間（秒） */
  MAX_GLIDE_FUEL: 1.35,
  /** 受傷無敵閃爍時間（秒） */
  INVINCIBLE_DURATION: 1.5,
  /** 三線道 X 座標（左、中、右） */
  LANE_POSITIONS: [-3.0, 0.0, 3.0] as const,
  /** 高架道路總寬度 */
  ROAD_WIDTH: 10.6,
  /** 道路護欄邊界 X 座標 */
  GUARDRAIL_X: 5.15,
  /** 單節道路長度 */
  ROAD_SEGMENT_LENGTH: 40.0,
  /** 道路循環節數 */
  ROAD_SEGMENT_COUNT: 8,
  /** 巡航期（90s-60s）基礎速度 */
  BASE_SPEED: 30.0,
  /** 警戒期（60s-30s）基礎速度提升 25% */
  ALERT_SPEED: 37.5,
  /** 超載衝刺期（30s-0s）基礎速度提升 50% */
  OVERDRIVE_SPEED: 45.0,
} as const;

export const CYBER_COLORS = {
  /** 深邃夜空與賽博藍基底 */
  SKY_NAVY: 0x0b192c,
  /** 超載衝刺期（30s-0s）紅紫警示夜空 */
  SKY_OVERDRIVE: 0x260b2c,
  /** 道路深色瀝青 */
  ASPHALT_DARK: 0x091322,
  /** 霓虹青 */
  NEON_CYAN: 0x00f5d4,
  /** 電光紫 */
  ELECTRIC_PURPLE: 0x7b2cbf,
  /** 警示洋紅 */
  WARNING_MAGENTA: 0xff0055,
  /** 低矮障礙物琥珀警示色 */
  LOW_BARRIER_AMBER: 0xff9f1c,
  /** 暖金點綴 */
  AMBER_SPARK: 0xffb703,
} as const;
