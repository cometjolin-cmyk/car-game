/**
 * 物件生成池與三階段動態難度排程模組（Object Pooling）
 * 支援：
 * - 巡航期（90-60s）、警戒期（60-30s）、超載衝刺期（30-0s）波次組合
 * - 低矮型可跳躍路障 + 空中弧線晶片誘導陣型
 * - 渦輪加速期間 3D 速度線隧道特效（InstancedMesh）
 */

import * as THREE from 'three';
import { CYBER_COLORS, DifficultyStage, GAME_CONFIG } from './constants';
import { GameMaterialLibrary } from './materials';
import {
  createDeliveryChip,
  createLowBarrier,
  createPatrolDrone,
  createRoadSegment,
  createSkyscraper,
  createStaticBarrier,
  PatrolDroneRig,
} from './models';

export interface ActiveBarrier {
  active: boolean;
  nearMissTriggered: boolean;
  lane: number;
  x: number;
  z: number;
  group: THREE.Group;
  dispose: () => void;
}

export interface ActiveLowBarrier {
  active: boolean;
  nearMissTriggered: boolean;
  lane: number;
  x: number;
  z: number;
  group: THREE.Group;
  dispose: () => void;
}

export interface ActiveDrone {
  active: boolean;
  nearMissTriggered: boolean;
  z: number;
  x: number;
  phase: number;
  speed: number;
  amplitude: number;
  rig: PatrolDroneRig;
}

export interface ActiveChip {
  active: boolean;
  collected: boolean;
  missedTriggered: boolean;
  lane: number;
  x: number;
  y: number;
  z: number;
  phase: number;
  group: THREE.Group;
  innerCrystal: THREE.Mesh;
  outerRing: THREE.Mesh;
  dispose: () => void;
}

interface BurstParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface SpeedStreak {
  x: number;
  y: number;
  z: number;
  speedScale: number;
}

interface SkyscraperItem {
  group: THREE.Group;
  z: number;
  dispose: () => void;
}

const MAX_BARRIERS = 16;
const MAX_LOW_BARRIERS = 18;
const MAX_DRONES = 6;
const MAX_CHIPS = 42;
const MAX_BURST_PARTICLES = 180;
const SPEED_LINE_COUNT = 68;
const BUILDING_PAIRS = 14;
const BUILDING_SPACING = 22;

const _dummy = new THREE.Object3D();

export class WorldObjectPool {
  private roadSegments: THREE.Group[] = [];
  private buildings: SkyscraperItem[] = [];
  public barriers: ActiveBarrier[] = [];
  public lowBarriers: ActiveLowBarrier[] = [];
  public drones: ActiveDrone[] = [];
  public chips: ActiveChip[] = [];

  private particleMesh: THREE.InstancedMesh;
  private particles: BurstParticle[] = [];

  private speedLinesMesh: THREE.InstancedMesh;
  private speedLinesMat: THREE.MeshBasicMaterial;
  private speedStreaks: SpeedStreak[] = [];

  private ambientDustPoints: THREE.Points;
  private ambientDustCount = 240;

  private disposables: Array<() => void> = [];

  private spawnDistanceAccum = 0;
  private nextSpawnGap = 24;
  private rowCounter = 0;

  constructor(scene: THREE.Scene, mats: GameMaterialLibrary) {
    // 1. 初始化高架道路節段池
    const segCount = GAME_CONFIG.ROAD_SEGMENT_COUNT;
    const segLen = GAME_CONFIG.ROAD_SEGMENT_LENGTH;
    for (let i = 0; i < segCount; i++) {
      const seg = createRoadSegment(mats);
      seg.group.position.z = 20 - i * segLen;
      scene.add(seg.group);
      this.roadSegments.push(seg.group);
      this.disposables.push(seg.dispose);
    }

    // 2. 初始化摩天大樓視差池
    for (let i = 0; i < BUILDING_PAIRS; i++) {
      const zPos = 10 - i * BUILDING_SPACING;
      [-1, 1].forEach((side) => {
        const w = 8 + Math.random() * 7;
        const h = 38 + Math.random() * 58;
        const d = 9 + Math.random() * 7;
        const building = createSkyscraper(mats, w, h, d, i + (side > 0 ? 1 : 0));
        const xOffset = side * (13.5 + w / 2 + Math.random() * 14);
        building.group.position.set(xOffset, 0, zPos);
        scene.add(building.group);
        this.buildings.push({ group: building.group, z: zPos, dispose: building.dispose });
        this.disposables.push(building.dispose);
      });
    }

    // 3. 初始化高聳固定路障池
    for (let i = 0; i < MAX_BARRIERS; i++) {
      const b = createStaticBarrier(mats);
      b.group.visible = false;
      scene.add(b.group);
      this.barriers.push({
        active: false,
        nearMissTriggered: false,
        lane: 1,
        x: 0,
        z: -500,
        group: b.group,
        dispose: b.dispose,
      });
      this.disposables.push(b.dispose);
    }

    // 4. 初始化低矮型可跳躍路障池
    for (let i = 0; i < MAX_LOW_BARRIERS; i++) {
      const lb = createLowBarrier(mats);
      lb.group.visible = false;
      scene.add(lb.group);
      this.lowBarriers.push({
        active: false,
        nearMissTriggered: false,
        lane: 1,
        x: 0,
        z: -500,
        group: lb.group,
        dispose: lb.dispose,
      });
      this.disposables.push(lb.dispose);
    }

    // 5. 初始化移動巡邏無人機池
    for (let i = 0; i < MAX_DRONES; i++) {
      const rig = createPatrolDrone(mats);
      rig.root.visible = false;
      scene.add(rig.root);
      this.drones.push({
        active: false,
        nearMissTriggered: false,
        z: -500,
        x: 0,
        phase: 0,
        speed: 2.2,
        amplitude: 3.15,
        rig,
      });
      this.disposables.push(rig.dispose);
    }

    // 6. 初始化快遞晶片池
    for (let i = 0; i < MAX_CHIPS; i++) {
      const c = createDeliveryChip(mats);
      c.group.visible = false;
      scene.add(c.group);
      this.chips.push({
        active: false,
        collected: false,
        missedTriggered: false,
        lane: 1,
        x: 0,
        y: 0,
        z: -500,
        phase: 0,
        group: c.group,
        innerCrystal: c.innerCrystal,
        outerRing: c.outerRing,
        dispose: c.dispose,
      });
      this.disposables.push(c.dispose);
    }

    // 7. 初始化粒子爆裂池（InstancedMesh）
    const pGeo = new THREE.OctahedronGeometry(0.16, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_BURST_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    const initColor = new THREE.Color(CYBER_COLORS.NEON_CYAN);
    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, initColor);

      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color(CYBER_COLORS.NEON_CYAN),
      });
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    scene.add(this.particleMesh);
    this.disposables.push(() => {
      pGeo.dispose();
      pMat.dispose();
    });

    // 8. 初始化渦輪加速 3D 速度線隧道（InstancedMesh）
    const lineGeo = new THREE.BoxGeometry(0.045, 0.045, 5.2);
    this.speedLinesMat = new THREE.MeshBasicMaterial({
      color: 0x72fff0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.speedLinesMesh = new THREE.InstancedMesh(lineGeo, this.speedLinesMat, SPEED_LINE_COUNT);
    this.speedLinesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.speedLinesMesh.frustumCulled = false;
    this.speedLinesMesh.visible = false;

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.8 + Math.random() * 5.2;
      const streak: SpeedStreak = {
        x: Math.cos(angle) * radius,
        y: 1.5 + Math.sin(angle) * (radius * 0.55),
        z: -Math.random() * 75,
        speedScale: 0.8 + Math.random() * 0.6,
      };
      this.speedStreaks.push(streak);
      _dummy.position.set(streak.x, streak.y, streak.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.speedLinesMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.speedLinesMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.speedLinesMesh);
    this.disposables.push(() => {
      lineGeo.dispose();
      this.speedLinesMat.dispose();
    });

    // 9. 初始化環境漂浮微粒光點（強化 3D 空間與賽道邊框的粒子透明感）
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 64;
    dustCanvas.height = 64;
    const dCtx = dustCanvas.getContext('2d')!;
    const dGrad = dCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    dGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    dGrad.addColorStop(0.45, 'rgba(0, 245, 212, 0.55)');
    dGrad.addColorStop(1, 'rgba(0, 245, 212, 0)');
    dCtx.fillStyle = dGrad;
    dCtx.fillRect(0, 0, 64, 64);
    const dustTex = new THREE.CanvasTexture(dustCanvas);
    dustTex.colorSpace = THREE.SRGBColorSpace;

    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(this.ambientDustCount * 3);
    const dustColors = new Float32Array(this.ambientDustCount * 3);
    const palette = [
      new THREE.Color(CYBER_COLORS.NEON_CYAN),
      new THREE.Color(0x9d4edd),
      new THREE.Color(0xffffff),
    ];
    for (let i = 0; i < this.ambientDustCount; i++) {
      // 特別集中於道路兩側護欄邊界與空中
      const onBorder = i % 2 === 0;
      dustPositions[i * 3] = onBorder
        ? (Math.random() < 0.5 ? -1 : 1) * (4.6 + Math.random() * 2.2)
        : (Math.random() - 0.5) * 26;
      dustPositions[i * 3 + 1] = 0.25 + Math.random() * 7.5;
      dustPositions[i * 3 + 2] = 18 - Math.random() * 195;

      const c = palette[i % palette.length];
      dustColors[i * 3] = c.r;
      dustColors[i * 3 + 1] = c.g;
      dustColors[i * 3 + 2] = c.b;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.34,
      map: dustTex,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ambientDustPoints = new THREE.Points(dustGeo, dustMat);
    this.ambientDustPoints.frustumCulled = false;
    scene.add(this.ambientDustPoints);
    this.disposables.push(() => {
      dustGeo.dispose();
      dustMat.dispose();
      dustTex.dispose();
    });
  }

  /** 清除所有活動障礙與晶片（不預生成波次，供展示模式使用） */
  public clearObstacles(): void {
    for (const b of this.barriers) {
      b.active = false;
      b.nearMissTriggered = false;
      b.group.visible = false;
    }
    for (const lb of this.lowBarriers) {
      lb.active = false;
      lb.nearMissTriggered = false;
      lb.group.visible = false;
    }
    for (const d of this.drones) {
      d.active = false;
      d.nearMissTriggered = false;
      d.rig.root.visible = false;
    }
    for (const c of this.chips) {
      c.active = false;
      c.collected = false;
      c.missedTriggered = false;
      c.group.visible = false;
    }
  }

  /** 重置所有活動障礙物、晶片與粒子狀態 */
  public reset(): void {
    this.spawnDistanceAccum = 0;
    this.nextSpawnGap = 22;
    this.rowCounter = 0;

    this.clearObstacles();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.speedLinesMesh.visible = false;
    this.speedLinesMat.opacity = 0;

    // 預先生成安全引導晶片與第一批巡航波次（留出展示盒解鎖起跑緩衝距離）
    this.spawnChipLine(1, -66, 3, 0);
    this.spawnWave(-110, 'CRUISE');
    this.spawnWave(-152, 'CRUISE');
    this.spawnWave(-194, 'CRUISE');
  }

  /** 在指定座標觸發粒子消散／撞擊特效 */
  public emitBurst(x: number, y: number, z: number, hexColor: number, count = 20): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 8.5;
        p.vel.set(
          Math.cos(angle) * speed,
          2.0 + Math.random() * 6.5,
          Math.sin(angle) * speed * 0.8 + 4.0
        );
        p.maxLife = 0.35 + Math.random() * 0.28;
        p.life = p.maxLife;
        p.color.setHex(hexColor);
        this.particleMesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  /** 更新環境捲動、速度線特效、障礙物移動與動態波次生成 */
  public update(
    delta: number,
    elapsed: number,
    forwardSpeed: number,
    stage: DifficultyStage,
    turboActive: boolean,
    isPlaying: boolean
  ): void {
    const moveZ = forwardSpeed * delta;
    const segLen = GAME_CONFIG.ROAD_SEGMENT_LENGTH;
    const totalRoadLen = segLen * GAME_CONFIG.ROAD_SEGMENT_COUNT;

    // 1. 無限循環高架道路
    for (const seg of this.roadSegments) {
      seg.position.z += moveZ;
      if (seg.position.z > 30) {
        seg.position.z -= totalRoadLen;
      }
    }

    // 2. 無限循環摩天大樓背景
    const totalBuildingSpan = BUILDING_PAIRS * BUILDING_SPACING;
    for (const b of this.buildings) {
      b.z += moveZ;
      if (b.z > 28) {
        b.z -= totalBuildingSpan;
      }
      b.group.position.z = b.z;
    }

    // 2.5 更新環境漂浮微粒（營造賽道邊框粒子透明氛圍）
    const dustPosAttr = this.ambientDustPoints.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.ambientDustCount; i++) {
      let z = dustPosAttr.getZ(i) + moveZ * 0.85;
      if (z > 20) {
        z -= 195;
      }
      const baseY = dustPosAttr.getY(i);
      const floatY = baseY + Math.sin(elapsed * 2.2 + i) * 0.004;
      dustPosAttr.setY(i, floatY);
      dustPosAttr.setZ(i, z);
    }
    dustPosAttr.needsUpdate = true;

    // 3. 渦輪加速 3D 速度線更新
    const targetLineOpacity = turboActive && isPlaying ? 0.72 : 0;
    this.speedLinesMat.opacity = THREE.MathUtils.damp(
      this.speedLinesMat.opacity,
      targetLineOpacity,
      10,
      delta
    );
    this.speedLinesMesh.visible = this.speedLinesMat.opacity > 0.02;
    if (this.speedLinesMesh.visible) {
      for (let i = 0; i < SPEED_LINE_COUNT; i++) {
        const s = this.speedStreaks[i];
        s.z += forwardSpeed * 1.9 * s.speedScale * delta;
        if (s.z > 10) {
          s.z = -70 - Math.random() * 15;
        }
        _dummy.position.set(s.x, s.y, s.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, 1, 1.35);
        _dummy.updateMatrix();
        this.speedLinesMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.speedLinesMesh.instanceMatrix.needsUpdate = true;
    }

    // 4. 更新粒子爆裂動畫
    let particleUpdated = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      particleUpdated = true;
      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vel.y -= 16 * delta;
      p.pos.addScaledVector(p.vel, delta);
      const scale = Math.max(0.01, (p.life / p.maxLife) * 1.3);
      _dummy.position.copy(p.pos);
      _dummy.rotation.set(elapsed * 8 + i, elapsed * 6, 0);
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (particleUpdated) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }

    if (!isPlaying) return;

    // 5. 更新高聳固定路障
    for (const b of this.barriers) {
      if (!b.active) continue;
      b.z += moveZ;
      b.group.position.z = b.z;
      if (b.z > 14) {
        b.active = false;
        b.group.visible = false;
      }
    }

    // 6. 更新低矮型可跳躍路障
    for (const lb of this.lowBarriers) {
      if (!lb.active) continue;
      lb.z += moveZ;
      lb.group.position.z = lb.z;
      if (lb.z > 14) {
        lb.active = false;
        lb.group.visible = false;
      }
    }

    // 7. 更新移動巡邏無人機
    for (const d of this.drones) {
      if (!d.active) continue;
      d.z += moveZ;
      d.phase += delta * d.speed;
      d.x = Math.sin(d.phase) * d.amplitude;

      d.rig.root.position.z = d.z;
      d.rig.droneBody.position.x = d.x;
      d.rig.droneBody.position.y = 1.12 + Math.sin(elapsed * 5 + d.phase) * 0.12;
      d.rig.droneBody.rotation.z = -Math.cos(d.phase) * 0.18;
      for (const r of d.rig.rotors) {
        r.rotation.y += delta * 24;
      }

      if (d.z > 14) {
        d.active = false;
        d.rig.root.visible = false;
      }
    }

    // 8. 更新快遞晶片
    for (const c of this.chips) {
      if (!c.active) continue;
      c.z += moveZ;
      c.group.position.z = c.z;
      c.innerCrystal.rotation.y = elapsed * 3.2 + c.phase;
      c.innerCrystal.position.y = 0.95 + c.y + Math.sin(elapsed * 4.2 + c.phase) * 0.14;
      c.outerRing.rotation.x = elapsed * 2.1 + c.phase;
      c.outerRing.rotation.y = -elapsed * 1.8;
      c.outerRing.position.y = c.innerCrystal.position.y;

      if (c.z > 14) {
        c.active = false;
        c.group.visible = false;
      }
    }

    // 9. 依據難度階段生成前方波次
    this.spawnDistanceAccum += moveZ;
    if (this.spawnDistanceAccum >= this.nextSpawnGap) {
      this.spawnDistanceAccum = 0;
      this.spawnWave(-210, stage);

      if (stage === 'CRUISE') {
        this.nextSpawnGap = 27 + Math.random() * 5;
      } else if (stage === 'ALERT') {
        this.nextSpawnGap = 23.5 + Math.random() * 4.5;
      } else {
        this.nextSpawnGap = 20.5 + Math.random() * 4;
      }
    }
  }

  /** 三階段難度波次生成器 */
  private spawnWave(spawnZ: number, stage: DifficultyStage): void {
    this.rowCounter++;
    const lanes = [0, 1, 2];

    // A. 巡邏無人機波次（警戒期與超載期大幅增加出現頻率）
    const droneChance = stage === 'CRUISE' ? 0.16 : stage === 'ALERT' ? 0.34 : 0.38;
    if (this.rowCounter > 2 && Math.random() < droneChance) {
      const drone = this.drones.find((d) => !d.active);
      if (drone) {
        drone.active = true;
        drone.nearMissTriggered = false;
        drone.z = spawnZ;
        drone.phase = Math.random() * Math.PI * 2;
        drone.speed = stage === 'CRUISE' ? 1.8 : stage === 'ALERT' ? 2.4 : 3.0;
        drone.amplitude = 3.15;
        drone.rig.root.position.set(0, 0, spawnZ);
        drone.rig.root.visible = true;

        // 巡邏機後方或前方誘導晶片
        const chipLane = lanes[Math.floor(Math.random() * lanes.length)];
        this.spawnChipLine(chipLane, spawnZ + 8, stage === 'CRUISE' ? 2 : 3, 0);
        return;
      }
    }

    // B. 低矮型路障＋空中弧線晶片誘導組合（考驗跳躍與反重力滑翔）
    const lowHurdleChance = stage === 'CRUISE' ? 0.32 : stage === 'ALERT' ? 0.38 : 0.42;
    if (Math.random() < lowHurdleChance) {
      const isFullRoadHurdle = stage !== 'CRUISE' && Math.random() < 0.48;
      if (isFullRoadHurdle) {
        // 全三線道低矮路障：強制跳躍飛越，並於路障正上方擺放高空獎勵晶片
        for (const laneIdx of lanes) {
          this.activateLowBarrier(laneIdx, spawnZ);
        }
        const bonusLane = lanes[Math.floor(Math.random() * lanes.length)];
        this.spawnSingleChip(bonusLane, spawnZ, 1.55);
        this.spawnSingleChip(bonusLane, spawnZ - 4.2, 1.35);

        // 超載衝刺期偶爾出現雙連低矮路障，需要「跳躍＋長按滑翔」飛越
        if (stage === 'OVERDRIVE' && Math.random() < 0.5) {
          for (const laneIdx of lanes) {
            this.activateLowBarrier(laneIdx, spawnZ - 7.5);
          }
          this.spawnSingleChip(bonusLane, spawnZ - 7.5, 1.55);
        }
        return;
      } else {
        // 混合陣型：1 條高聳路障 + 1~2 條低矮路障（晶片誘導跳躍或切道）
        const shuffled = [...lanes].sort(() => Math.random() - 0.5);
        this.activateLowBarrier(shuffled[0], spawnZ);
        this.spawnSingleChip(shuffled[0], spawnZ, 1.5); // 路障正上方空中誘餌晶片

        if (stage !== 'CRUISE') {
          this.activateTallBarrier(shuffled[1], spawnZ);
          this.spawnChipLine(shuffled[2], spawnZ - 2, 3, 0);
        } else {
          this.spawnChipLine(shuffled[1], spawnZ - 2, 2, 0);
        }
        return;
      }
    }

    // C. 傳統固定高聳路障波次
    const doubleBlockChance = stage === 'CRUISE' ? 0.22 : stage === 'ALERT' ? 0.55 : 0.72;
    const blockCount = Math.random() < doubleBlockChance ? 2 : 1;
    const shuffled = [...lanes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < blockCount; i++) {
      this.activateTallBarrier(shuffled[i], spawnZ);
    }
    const safeLane = shuffled[blockCount];
    this.spawnChipLine(safeLane, spawnZ - 3.0, stage === 'CRUISE' ? 2 : 3, 0);
  }

  private activateTallBarrier(lane: number, z: number): void {
    const barrier = this.barriers.find((b) => !b.active);
    if (!barrier) return;
    const lx = GAME_CONFIG.LANE_POSITIONS[lane];
    barrier.active = true;
    barrier.nearMissTriggered = false;
    barrier.lane = lane;
    barrier.x = lx;
    barrier.z = z;
    barrier.group.position.set(lx, 0, z);
    barrier.group.visible = true;
  }

  private activateLowBarrier(lane: number, z: number): void {
    const lb = this.lowBarriers.find((item) => !item.active);
    if (!lb) return;
    const lx = GAME_CONFIG.LANE_POSITIONS[lane];
    lb.active = true;
    lb.nearMissTriggered = false;
    lb.lane = lane;
    lb.x = lx;
    lb.z = z;
    lb.group.position.set(lx, 0, z);
    lb.group.visible = true;
  }

  private spawnSingleChip(lane: number, z: number, yOffset: number): void {
    const chip = this.chips.find((c) => !c.active);
    if (!chip) return;
    const x = GAME_CONFIG.LANE_POSITIONS[lane];
    chip.active = true;
    chip.collected = false;
    chip.missedTriggered = false;
    chip.lane = lane;
    chip.x = x;
    chip.y = yOffset;
    chip.z = z;
    chip.phase = Math.random() * Math.PI;
    chip.group.position.set(x, 0, z);
    chip.group.visible = true;
  }

  private spawnChipLine(lane: number, startZ: number, count: number, yOffset: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnSingleChip(lane, startZ - i * 3.2, yOffset);
    }
  }

  public dispose(): void {
    this.disposables.forEach((fn) => fn());
    this.disposables = [];
  }
}
