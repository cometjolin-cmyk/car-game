/**
 * 碰撞檢測與極限擦身（Near-Miss）判定模組
 * 處理：
 * 1. 快遞晶片收集與漏接偵測（驅動 Combo 連擊與倍率重置）
 * 2. 高聳固定路障、低矮型可跳躍路障與移動巡邏無人機碰撞
 * 3. 未開啟護盾時的極限擦身（Near-Miss）火花與技能減冷卻判定
 */

import { CYBER_COLORS } from './constants';
import { WorldObjectPool } from './pool';

export type NearMissSide = 'left' | 'right' | 'top';

export interface CollisionCallbacks {
  onChipCollected: (x: number, y: number, z: number) => void;
  onChipMissed: () => void;
  onObstacleHit: (x: number, y: number, z: number) => void;
  onShieldAbsorb: (x: number, y: number, z: number) => void;
  onNearMiss: (side: NearMissSide, x: number, y: number, z: number) => void;
}

const PLAYER_Z = 0;

export function checkCollisions(
  playerX: number,
  playerY: number,
  pool: WorldObjectPool,
  shieldActive: boolean,
  invincibleTimer: number,
  callbacks: CollisionCallbacks
): void {
  // 1. 快遞晶片收集與漏接判定
  for (const chip of pool.chips) {
    if (!chip.active || chip.collected) continue;

    const dz = Math.abs(chip.z - PLAYER_Z);
    const dx = Math.abs(chip.x - playerX);
    const dy = Math.abs(chip.y - playerY);

    if (dz < 1.85 && dx < 1.35 && dy < 1.5) {
      chip.collected = true;
      chip.active = false;
      chip.group.visible = false;
      pool.emitBurst(chip.x, 1.0 + chip.y, chip.z, CYBER_COLORS.NEON_CYAN, 18);
      callbacks.onChipCollected(chip.x, 1.0 + chip.y, chip.z);
    } else if (!chip.missedTriggered && chip.z > 2.4) {
      chip.missedTriggered = true;
      callbacks.onChipMissed();
    }
  }

  // 2. 低矮型路障判定（跳躍 >= 0.82m 飛越；未開護盾緊貼閃過觸發 Near-Miss）
  for (const lb of pool.lowBarriers) {
    if (!lb.active) continue;

    const dz = Math.abs(lb.z - PLAYER_Z);
    const dx = Math.abs(lb.x - playerX);

    if (dz < 1.55 && dx < 1.42 && playerY < 0.82) {
      if (shieldActive) {
        lb.active = false;
        lb.group.visible = false;
        pool.emitBurst(lb.x, 0.7, lb.z, CYBER_COLORS.NEON_CYAN, 26);
        pool.emitBurst(lb.x, 0.7, lb.z, CYBER_COLORS.LOW_BARRIER_AMBER, 16);
        callbacks.onShieldAbsorb(lb.x, 0.7, lb.z);
        return;
      } else if (invincibleTimer <= 0) {
        lb.active = false;
        lb.group.visible = false;
        pool.emitBurst(lb.x, 0.7, lb.z, CYBER_COLORS.LOW_BARRIER_AMBER, 24);
        callbacks.onObstacleHit(lb.x, 0.7, lb.z);
        return;
      }
    }

    if (!lb.nearMissTriggered && lb.z > -0.35 && lb.z < 1.95) {
      if (!shieldActive && invincibleTimer <= 0) {
        const lateralGraze = dx >= 1.42 && dx < 2.65 && playerY < 1.25;
        const jumpGraze = dx < 1.42 && playerY >= 0.82 && playerY < 2.25;
        if (lateralGraze || jumpGraze) {
          lb.nearMissTriggered = true;
          const side: NearMissSide = jumpGraze ? 'top' : lb.x < playerX ? 'left' : 'right';
          const sx = side === 'top' ? playerX : playerX + (side === 'left' ? -0.95 : 0.95);
          const sy = side === 'top' ? playerY + 0.35 : 0.65 + playerY;
          pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.AMBER_SPARK, 16);
          pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.NEON_CYAN, 8);
          callbacks.onNearMiss(side, sx, sy, 0.25);
        }
      } else if (lb.z > 1.75) {
        lb.nearMissTriggered = true;
      }
    }
  }

  // 3. 高聳固定路障判定
  for (const barrier of pool.barriers) {
    if (!barrier.active) continue;

    const dz = Math.abs(barrier.z - PLAYER_Z);
    const dx = Math.abs(barrier.x - playerX);

    if (dz < 1.65 && dx < 1.45) {
      if (shieldActive) {
        barrier.active = false;
        barrier.group.visible = false;
        pool.emitBurst(barrier.x, 1.1, barrier.z, CYBER_COLORS.NEON_CYAN, 28);
        pool.emitBurst(barrier.x, 1.1, barrier.z, CYBER_COLORS.WARNING_MAGENTA, 16);
        callbacks.onShieldAbsorb(barrier.x, 1.1, barrier.z);
        return;
      } else if (invincibleTimer <= 0) {
        barrier.active = false;
        barrier.group.visible = false;
        pool.emitBurst(barrier.x, 1.1, barrier.z, CYBER_COLORS.WARNING_MAGENTA, 26);
        callbacks.onObstacleHit(barrier.x, 1.1, barrier.z);
        return;
      }
    }

    if (!barrier.nearMissTriggered && barrier.z > -0.35 && barrier.z < 1.95) {
      if (!shieldActive && invincibleTimer <= 0 && dx >= 1.45 && dx < 2.65) {
        barrier.nearMissTriggered = true;
        const side: NearMissSide = barrier.x < playerX ? 'left' : 'right';
        const sx = playerX + (side === 'left' ? -0.95 : 0.95);
        const sy = 0.72 + playerY;
        pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.AMBER_SPARK, 18);
        pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.WARNING_MAGENTA, 8);
        callbacks.onNearMiss(side, sx, sy, 0.25);
      } else if (barrier.z > 1.75) {
        barrier.nearMissTriggered = true;
      }
    }
  }

  // 4. 移動巡邏無人機判定
  for (const drone of pool.drones) {
    if (!drone.active) continue;

    const dz = Math.abs(drone.z - PLAYER_Z);
    const dx = Math.abs(drone.x - playerX);

    if (dz < 1.75 && dx < 1.45 && playerY < 1.9) {
      if (shieldActive) {
        drone.active = false;
        drone.rig.root.visible = false;
        pool.emitBurst(drone.x, 1.15, drone.z, CYBER_COLORS.NEON_CYAN, 28);
        pool.emitBurst(drone.x, 1.15, drone.z, CYBER_COLORS.ELECTRIC_PURPLE, 18);
        callbacks.onShieldAbsorb(drone.x, 1.15, drone.z);
        return;
      } else if (invincibleTimer <= 0) {
        drone.active = false;
        drone.rig.root.visible = false;
        pool.emitBurst(drone.x, 1.15, drone.z, CYBER_COLORS.WARNING_MAGENTA, 28);
        callbacks.onObstacleHit(drone.x, 1.15, drone.z);
        return;
      }
    }

    if (!drone.nearMissTriggered && drone.z > -0.35 && drone.z < 1.95) {
      if (!shieldActive && invincibleTimer <= 0) {
        const lateralGraze = dx >= 1.45 && dx < 2.7 && playerY < 2.0;
        const jumpGraze = dx < 1.45 && playerY >= 1.9 && playerY < 2.95;
        if (lateralGraze || jumpGraze) {
          drone.nearMissTriggered = true;
          const side: NearMissSide = jumpGraze ? 'top' : drone.x < playerX ? 'left' : 'right';
          const sx = side === 'top' ? playerX : playerX + (side === 'left' ? -0.95 : 0.95);
          const sy = side === 'top' ? playerY + 0.2 : 0.85 + playerY;
          pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.AMBER_SPARK, 18);
          pool.emitBurst(sx, sy, 0.25, CYBER_COLORS.ELECTRIC_PURPLE, 8);
          callbacks.onNearMiss(side, sx, sy, 0.25);
        }
      } else if (drone.z > 1.75) {
        drone.nearMissTriggered = true;
      }
    }
  }
}

/** 限制目標車道索引在 [0, 2] 範圍內 */
export function clampLaneIndex(index: number): number {
  return Math.max(0, Math.min(2, index));
}
