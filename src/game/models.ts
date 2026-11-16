/**
 * 複合式玩具模型風 3D 模型工廠（THREE.Group）
 * 支援：
 * - 圓潤倒角、分色卡榫件與可分解（Exploded View）懸浮車模型
 * - 改裝升級 3D 實體套件視覺進化（Lv.2 尾管加長與散熱環／全息電容鰭片；Lv.3 四出電漿推進器／雙層六角蜂巢力場產生器）
 * - 「全息玩具展示盒（Toy Box Diorama）」透明粒子壓克力展示罩與動態規格銘牌
 */

import * as THREE from 'three';
import { CYBER_COLORS, GAME_CONFIG } from './constants';
import { GameMaterialLibrary } from './materials';
import { TrackThemeConfig, VehicleSkinConfig } from './saveSystem';

export type VehiclePartRole =
  | 'hull'
  | 'canopy'
  | 'nose'
  | 'wing'
  | 'spoiler'
  | 'thruster'
  | 'chassis'
  | 'shield_kit';

export interface ExplodablePart {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

export interface HoverVehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  thrusterFlames: THREE.Mesh[];
  quadExtraFlames: THREE.Mesh[];
  shieldGroup: THREE.Group;
  shieldDome: THREE.Mesh;
  shieldWire: THREE.Mesh;
  shieldOuterDome: THREE.Mesh;
  shieldOuterRing: THREE.Mesh;
  shieldParticleRing: THREE.Points;
  underglow: THREE.Mesh;
  explodableParts: ExplodablePart[];
  interactiveMeshes: THREE.Object3D[];
  turboLv2Parts: THREE.Object3D[];
  turboLv3Parts: THREE.Object3D[];
  shieldLv2Parts: THREE.Object3D[];
  shieldLv3Parts: THREE.Object3D[];
  hasShieldLv3: boolean;
  hasTurboLv3: boolean;
  applyUpgradeVisuals: (shieldLv: number, turboLv: number) => void;
  dispose: () => void;
}

function tagRole(obj: THREE.Object3D, role: VehiclePartRole): void {
  obj.traverse((child) => {
    child.userData.partRole = role;
  });
}

/** 建立玩具模型風反重力懸浮車（含可分解分色零件與 Lv.1~Lv.3 實體改裝套件） */
export function createHoverVehicle(mats: GameMaterialLibrary): HoverVehicleRig {
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const explodableParts: ExplodablePart[] = [];
  const registerExplode = (object: THREE.Object3D, ox: number, oy: number, oz: number) => {
    explodableParts.push({
      object,
      basePos: object.position.clone(),
      explodeOffset: new THREE.Vector3(ox, oy, oz),
    });
  };

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.68;
  root.add(bodyGroup);

  // 1. 下層消光軟膠防撞底盤
  const baseSkirtGeo = trackGeo(new THREE.BoxGeometry(1.58, 0.24, 3.15));
  const baseSkirt = new THREE.Mesh(baseSkirtGeo, mats.vehicleTrimMatte);
  baseSkirt.position.set(0, -0.14, 0.08);
  baseSkirt.castShadow = true;
  baseSkirt.receiveShadow = true;
  tagRole(baseSkirt, 'chassis');
  bodyGroup.add(baseSkirt);
  registerExplode(baseSkirt, 0, -0.45, 0);

  // 2. 主車身亮面烤漆外殼
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-0.62, -1.45);
  hullShape.lineTo(0.62, -1.45);
  hullShape.lineTo(0.84, -0.35);
  hullShape.lineTo(0.66, 1.15);
  hullShape.lineTo(0.38, 1.52);
  hullShape.lineTo(-0.38, 1.52);
  hullShape.lineTo(-0.66, 1.15);
  hullShape.lineTo(-0.84, -0.35);
  hullShape.closePath();

  const hullGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.14,
      bevelSegments: 3,
    })
  );
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, mats.vehicleHull);
  hullMesh.position.set(0, 0.08, 0);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  tagRole(hullMesh, 'hull');
  bodyGroup.add(hullMesh);

  // 3. 車頭白色模型分色保桿＋雙圓形探照頭燈群組
  const noseGroup = new THREE.Group();
  const noseGuardGeo = trackGeo(new THREE.BoxGeometry(0.98, 0.18, 0.34));
  const noseGuard = new THREE.Mesh(noseGuardGeo, mats.vehicleWhiteAccent);
  noseGuard.position.set(0, 0.02, -1.62);
  noseGuard.castShadow = true;
  noseGroup.add(noseGuard);

  const headlampGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12));
  headlampGeo.rotateX(Math.PI / 2);
  [-0.48, 0.48].forEach((hx) => {
    const lamp = new THREE.Mesh(headlampGeo, mats.vehicleAccentNeon);
    lamp.position.set(hx, 0.09, -1.52);
    noseGroup.add(lamp);
  });
  tagRole(noseGroup, 'nose');
  bodyGroup.add(noseGroup);
  registerExplode(noseGroup, 0, 0.05, -0.65);

  // 4. 圓潤氣泡式壓克力座艙罩＋白色頂框群組
  const canopyGroup = new THREE.Group();
  const canopyGeo = trackGeo(new THREE.SphereGeometry(0.56, 18, 14));
  canopyGeo.scale(1.05, 0.62, 1.48);
  const canopyMesh = new THREE.Mesh(canopyGeo, mats.vehicleCanopy);
  canopyMesh.position.set(0, 0.36, -0.15);
  canopyGroup.add(canopyMesh);

  const roofCapGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.09, 0.62));
  const roofCap = new THREE.Mesh(roofCapGeo, mats.vehicleWhiteAccent);
  roofCap.position.set(0, 0.56, 0.25);
  canopyGroup.add(roofCap);

  tagRole(canopyGroup, 'canopy');
  bodyGroup.add(canopyGroup);
  registerExplode(canopyGroup, 0, 0.72, 0);

  // 5. 兩側粗短 Q 版反重力側莢與懸浮環（含護盾 Lv.2 全息電容鰭片掛載）
  const sidePodGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.22, 1.32));
  const podRimGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.12, 1.18));
  const capFinGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.48, 0.92));
  const capCoilGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 10));
  capCoilGeo.rotateX(Math.PI / 2);

  const shieldLv2Parts: THREE.Object3D[] = [];
  const wingPods: THREE.Object3D[] = [];

  [-1.02, 1.02].forEach((wx) => {
    const pod = new THREE.Mesh(sidePodGeo, mats.vehicleWhiteAccent);
    pod.position.set(wx, 0.0, 0.32);
    pod.rotation.z = wx < 0 ? 0.12 : -0.12;
    pod.castShadow = true;

    const trim = new THREE.Mesh(podRimGeo, mats.vehicleAccentNeon);
    trim.position.set(wx < 0 ? -0.28 : 0.28, 0.02, 0);
    pod.add(trim);

    tagRole(pod, 'wing');

    // 護盾 Lv.2 實體改裝：兩側「全息電容鰭片」
    const finGroup = new THREE.Group();
    const fin = new THREE.Mesh(capFinGeo, mats.vehicleCanopy);
    fin.position.set(wx < 0 ? -0.34 : 0.34, 0.24, 0.04);
    fin.rotation.z = wx < 0 ? 0.38 : -0.38;
    finGroup.add(fin);

    const finEdge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.05, 0.44, 0.1)),
      mats.vehicleAccentNeon
    );
    finEdge.position.set(wx < 0 ? -0.4 : 0.4, 0.36, -0.36);
    finEdge.rotation.z = wx < 0 ? 0.38 : -0.38;
    finGroup.add(finEdge);

    const coil = new THREE.Mesh(capCoilGeo, mats.vehicleMetalUpgrade);
    coil.position.set(wx < 0 ? -0.22 : 0.22, 0.18, 0.12);
    finGroup.add(coil);

    finGroup.visible = false;
    tagRole(finGroup, 'shield_kit');
    pod.add(finGroup);
    shieldLv2Parts.push(finGroup);

    bodyGroup.add(pod);
    wingPods.push(pod);
    registerExplode(pod, wx < 0 ? -0.7 : 0.7, 0.08, 0);
  });

  // 護盾 Lv.3 實體改裝：車背雙層六角蜂巢力場產生器核心
  const shieldLv3Parts: THREE.Object3D[] = [];
  const generatorGroup = new THREE.Group();
  generatorGroup.position.set(0, 0.44, 0.72);
  generatorGroup.visible = false;

  const genBaseGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.38, 0.18, 6));
  const genBase = new THREE.Mesh(genBaseGeo, mats.vehicleMetalUpgrade);
  generatorGroup.add(genBase);

  const genCoreGeo = trackGeo(new THREE.OctahedronGeometry(0.22, 0));
  const genCore = new THREE.Mesh(genCoreGeo, mats.vehicleAccentNeon);
  genCore.position.y = 0.2;
  generatorGroup.add(genCore);

  const genHaloGeo = trackGeo(new THREE.TorusGeometry(0.36, 0.035, 8, 6));
  genHaloGeo.rotateX(Math.PI / 2);
  const genHalo = new THREE.Mesh(genHaloGeo, mats.vehicleAccentNeon);
  genHalo.position.y = 0.12;
  generatorGroup.add(genHalo);

  tagRole(generatorGroup, 'shield_kit');
  bodyGroup.add(generatorGroup);
  registerExplode(generatorGroup, 0, 0.96, 0.12);
  shieldLv3Parts.push(generatorGroup);

  // 6. 後方快遞貨艙尾翼總成群組
  const spoilerGroup = new THREE.Group();
  const spoilerPillarGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.34, 0.28));
  [-0.56, 0.56].forEach((sx) => {
    const sp = new THREE.Mesh(spoilerPillarGeo, mats.vehicleTrimMatte);
    sp.position.set(sx, 0.36, 1.24);
    spoilerGroup.add(sp);
  });
  const spoilerWingGeo = trackGeo(new THREE.BoxGeometry(1.75, 0.11, 0.42));
  const spoilerWing = new THREE.Mesh(spoilerWingGeo, mats.vehicleHull);
  spoilerWing.position.set(0, 0.55, 1.28);
  spoilerWing.castShadow = true;
  spoilerGroup.add(spoilerWing);

  const spoilerNeonGeo = trackGeo(new THREE.BoxGeometry(1.62, 0.06, 0.08));
  const spoilerNeon = new THREE.Mesh(spoilerNeonGeo, mats.vehicleAccentNeon);
  spoilerNeon.position.set(0, 0.55, 1.5);
  spoilerGroup.add(spoilerNeon);

  tagRole(spoilerGroup, 'spoiler');
  bodyGroup.add(spoilerGroup);
  registerExplode(spoilerGroup, 0, 0.65, 0.28);

  // 7. 雙大口徑模型噴射尾管 + 渦輪 Lv.2/Lv.3 實體改裝推進器群組
  const thrusterGroup = new THREE.Group();
  const nacelleGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.34, 0.72, 14));
  nacelleGeo.rotateX(Math.PI / 2);
  const flameGeo = trackGeo(new THREE.ConeGeometry(0.22, 0.95, 12));
  flameGeo.rotateX(Math.PI / 2);
  const thrusterFlames: THREE.Mesh[] = [];
  const quadExtraFlames: THREE.Mesh[] = [];
  const turboLv2Parts: THREE.Object3D[] = [];
  const turboLv3Parts: THREE.Object3D[] = [];

  const extNozzleGeo = trackGeo(new THREE.CylinderGeometry(0.25, 0.3, 0.42, 14));
  extNozzleGeo.rotateX(Math.PI / 2);
  const heatRingGeo = trackGeo(new THREE.TorusGeometry(0.34, 0.045, 8, 18));

  [-0.42, 0.42].forEach((tx) => {
    const nacelle = new THREE.Mesh(nacelleGeo, mats.vehicleTrimMatte);
    nacelle.position.set(tx, 0.06, 1.38);
    nacelle.castShadow = true;
    thrusterGroup.add(nacelle);

    const ringGeo = trackGeo(new THREE.TorusGeometry(0.29, 0.055, 8, 16));
    const ring = new THREE.Mesh(ringGeo, mats.vehicleAccentNeon);
    ring.position.set(tx, 0.06, 1.72);
    thrusterGroup.add(ring);

    const flame = new THREE.Mesh(flameGeo, mats.vehicleThruster);
    flame.position.set(tx, 0.06, 2.22);
    thrusterGroup.add(flame);
    thrusterFlames.push(flame);

    // 渦輪 Lv.2：加長尾管與雙金屬散熱環
    const lv2Sleeve = new THREE.Group();
    const ext = new THREE.Mesh(extNozzleGeo, mats.vehicleMetalUpgrade);
    ext.position.set(tx, 0.06, 1.82);
    lv2Sleeve.add(ext);

    [1.64, 1.88].forEach((hz) => {
      const hRing = new THREE.Mesh(heatRingGeo, mats.vehicleMetalUpgrade);
      hRing.position.set(tx, 0.06, hz);
      lv2Sleeve.add(hRing);
    });
    lv2Sleeve.visible = false;
    thrusterGroup.add(lv2Sleeve);
    turboLv2Parts.push(lv2Sleeve);
  });

  // 渦輪 Lv.3：「四出電漿推進器」外掛雙輔助電漿噴嘴與更長電漿尾焰
  const quadPodGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 0.68, 12));
  quadPodGeo.rotateX(Math.PI / 2);
  const quadRingGeo = trackGeo(new THREE.TorusGeometry(0.2, 0.04, 8, 16));
  const quadFlameGeo = trackGeo(new THREE.ConeGeometry(0.16, 1.12, 12));
  quadFlameGeo.rotateX(Math.PI / 2);

  [-0.86, 0.86].forEach((qx) => {
    const auxPod = new THREE.Group();
    auxPod.position.set(qx, 0.22, 1.48);

    const podMesh = new THREE.Mesh(quadPodGeo, mats.vehicleMetalUpgrade);
    auxPod.add(podMesh);

    const qRing = new THREE.Mesh(quadRingGeo, mats.vehicleAccentNeon);
    qRing.position.z = 0.34;
    auxPod.add(qRing);

    const qFlame = new THREE.Mesh(quadFlameGeo, mats.vehicleThruster);
    qFlame.position.z = 0.92;
    auxPod.add(qFlame);
    quadExtraFlames.push(qFlame);
    thrusterFlames.push(qFlame);

    auxPod.visible = false;
    thrusterGroup.add(auxPod);
    registerExplode(auxPod, qx < 0 ? -0.35 : 0.35, 0.24, 0.22);
    turboLv3Parts.push(auxPod);
  });

  tagRole(thrusterGroup, 'thruster');
  bodyGroup.add(thrusterGroup);
  registerExplode(thrusterGroup, 0, 0, 0.72);

  // 8. 地面懸浮霓虹底光
  const underglowGeo = trackGeo(new THREE.PlaneGeometry(3.5, 4.5));
  underglowGeo.rotateX(-Math.PI / 2);
  const underglow = new THREE.Mesh(underglowGeo, mats.vehicleUnderglow);
  underglow.position.set(0, 0.03, 0.1);
  root.add(underglow);

  // 9. 半透明六角能量護盾罩（含 Lv.3 雙層六角蜂巢粒子光環）
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0, 0.05, 0.08);
  shieldGroup.visible = false;

  const shieldDomeGeo = trackGeo(new THREE.IcosahedronGeometry(2.02, 1));
  const shieldDome = new THREE.Mesh(shieldDomeGeo, mats.shieldDome);
  shieldDome.renderOrder = 5;
  shieldGroup.add(shieldDome);

  const shieldWireGeo = trackGeo(new THREE.IcosahedronGeometry(2.06, 1));
  const shieldWire = new THREE.Mesh(shieldWireGeo, mats.shieldWire);
  shieldWire.renderOrder = 6;
  shieldGroup.add(shieldWire);

  // Lv.3 外層蜂巢粒子力場球與雙環
  const outerDomeGeo = trackGeo(new THREE.IcosahedronGeometry(2.36, 1));
  const shieldOuterDome = new THREE.Mesh(outerDomeGeo, mats.shieldOuterDome);
  shieldOuterDome.renderOrder = 7;
  shieldOuterDome.visible = false;
  shieldGroup.add(shieldOuterDome);

  const outerRingGeo = trackGeo(new THREE.TorusGeometry(2.42, 0.04, 8, 48));
  const shieldOuterRing = new THREE.Mesh(outerRingGeo, mats.shieldOuterRing);
  shieldOuterRing.rotation.x = Math.PI * 0.36;
  shieldOuterRing.visible = false;
  shieldGroup.add(shieldOuterRing);

  // 雙層粒子軌道點雲
  const pCount = 72;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / pCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 2.38;
    pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pPositions[i * 3 + 1] = r * Math.cos(phi);
    pPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const particleRingGeo = trackGeo(new THREE.BufferGeometry());
  particleRingGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const particleRingMat = new THREE.PointsMaterial({
    color: 0x80fff0,
    size: 0.14,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  localMaterials.push(particleRingMat);
  const shieldParticleRing = new THREE.Points(particleRingGeo, particleRingMat);
  shieldParticleRing.visible = false;
  shieldGroup.add(shieldParticleRing);

  bodyGroup.add(shieldGroup);

  const interactiveMeshes: THREE.Object3D[] = [
    baseSkirt,
    hullMesh,
    noseGroup,
    canopyGroup,
    spoilerGroup,
    thrusterGroup,
    generatorGroup,
    ...wingPods,
  ];

  const rig: HoverVehicleRig = {
    root,
    bodyGroup,
    thrusterFlames,
    quadExtraFlames,
    shieldGroup,
    shieldDome,
    shieldWire,
    shieldOuterDome,
    shieldOuterRing,
    shieldParticleRing,
    underglow,
    explodableParts,
    interactiveMeshes,
    turboLv2Parts,
    turboLv3Parts,
    shieldLv2Parts,
    shieldLv3Parts,
    hasShieldLv3: false,
    hasTurboLv3: false,
    applyUpgradeVisuals: (shieldLv: number, turboLv: number) => {
      rig.hasShieldLv3 = shieldLv >= 3;
      rig.hasTurboLv3 = turboLv >= 3;

      for (const p of shieldLv2Parts) p.visible = shieldLv >= 2;
      for (const p of shieldLv3Parts) p.visible = shieldLv >= 3;
      shieldOuterDome.visible = shieldLv >= 3;
      shieldOuterRing.visible = shieldLv >= 3;
      shieldParticleRing.visible = shieldLv >= 3;

      for (const p of turboLv2Parts) p.visible = turboLv >= 2;
      for (const p of turboLv3Parts) p.visible = turboLv >= 3;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };

  return rig;
}

export interface ToyBoxDioramaRig {
  group: THREE.Group;
  turntableGroup: THREE.Group;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  acrylicHoodGroup: THREE.Group;
  acrylicBoxMesh: THREE.Mesh;
  acrylicEdges: THREE.LineSegments;
  nameplateMesh: THREE.Mesh;
  updateNameplate: (
    skin: VehicleSkinConfig,
    theme: TrackThemeConfig,
    shieldLv: number,
    turboLv: number
  ) => void;
  setAcrylicVisibility: (visible: boolean, opacityRatio: number, liftY: number) => void;
  dispose: () => void;
}

/** 建立全息玩具展示盒（Toy Box Diorama）：全息旋轉底座、透明粒子壓克力展示罩與發光規格銘牌 */
export function createToyBoxDiorama(
  mats: GameMaterialLibrary,
  maxAnisotropy: number
): ToyBoxDioramaRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const group = new THREE.Group();

  // 1. 全息旋轉展台底座
  const turntableGroup = new THREE.Group();
  group.add(turntableGroup);

  const padGeo = new THREE.CylinderGeometry(2.9, 3.15, 0.14, 36);
  geometries.push(padGeo);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x0c1a30,
    roughness: 0.35,
    metalness: 0.55,
    transparent: true,
    opacity: 0.88,
  });
  materials.push(padMat);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.07;
  pad.receiveShadow = true;
  turntableGroup.add(pad);

  const outerGeo = new THREE.TorusGeometry(3.02, 0.045, 8, 48);
  outerGeo.rotateX(Math.PI / 2);
  geometries.push(outerGeo);
  const outerRing = new THREE.Mesh(outerGeo, mats.vehicleAccentNeon);
  outerRing.position.y = 0.15;
  turntableGroup.add(outerRing);

  const innerGeo = new THREE.RingGeometry(2.2, 2.34, 36);
  innerGeo.rotateX(-Math.PI / 2);
  geometries.push(innerGeo);
  const innerMat = new THREE.MeshBasicMaterial({
    color: CYBER_COLORS.NEON_CYAN,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(innerMat);
  const innerRing = new THREE.Mesh(innerGeo, innerMat);
  innerRing.position.y = 0.155;
  turntableGroup.add(innerRing);

  // 2. 透明粒子壓克力展示罩（5.2 x 2.75 x 5.2）
  const acrylicHoodGroup = new THREE.Group();
  group.add(acrylicHoodGroup);

  const boxW = 5.2;
  const boxH = 2.75;
  const boxD = 5.2;
  const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
  geometries.push(boxGeo);

  const acrylicBoxMesh = new THREE.Mesh(boxGeo, mats.dioramaAcrylicPanel);
  acrylicBoxMesh.position.y = boxH / 2 + 0.12;
  acrylicBoxMesh.renderOrder = 8;
  acrylicHoodGroup.add(acrylicBoxMesh);

  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  geometries.push(edgesGeo);
  const acrylicEdges = new THREE.LineSegments(edgesGeo, mats.dioramaAcrylicEdge);
  acrylicEdges.position.y = boxH / 2 + 0.12;
  acrylicHoodGroup.add(acrylicEdges);

  // 四角玩具卡榫金屬扣件
  const cornerGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  geometries.push(cornerGeo);
  const cx = boxW / 2;
  const cz = boxD / 2;
  [
    [-cx, 0.22, -cz],
    [cx, 0.22, -cz],
    [-cx, 0.22, cz],
    [cx, 0.22, cz],
    [-cx, boxH + 0.05, -cz],
    [cx, boxH + 0.05, -cz],
    [-cx, boxH + 0.05, cz],
    [cx, boxH + 0.05, cz],
  ].forEach(([x, y, z]) => {
    const clasp = new THREE.Mesh(cornerGeo, mats.vehicleMetalUpgrade);
    clasp.position.set(x, y, z);
    acrylicHoodGroup.add(clasp);
  });

  // 3. 發光模型規格銘牌（動態 CanvasTexture）
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 512;
  plateCanvas.height = 128;
  const plateCtx = plateCanvas.getContext('2d')!;
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  plateTex.anisotropy = maxAnisotropy;

  const standGeo = new THREE.BoxGeometry(2.15, 0.08, 0.62);
  geometries.push(standGeo);
  const standMesh = new THREE.Mesh(standGeo, mats.vehicleTrimMatte);
  standMesh.position.set(0, 0.25, 2.98);
  standMesh.rotation.x = 0.42;
  turntableGroup.add(standMesh);

  const plateGeo = new THREE.PlaneGeometry(2.02, 0.52);
  geometries.push(plateGeo);
  const plateMat = new THREE.MeshBasicMaterial({
    map: plateTex,
    transparent: true,
    opacity: 0.96,
  });
  materials.push(plateMat);
  const nameplateMesh = new THREE.Mesh(plateGeo, plateMat);
  nameplateMesh.position.set(0, 0.3, 3.01);
  nameplateMesh.rotation.x = -Math.PI / 2 + 0.42;
  turntableGroup.add(nameplateMesh);

  const updateNameplate = (
    skin: VehicleSkinConfig,
    theme: TrackThemeConfig,
    shieldLv: number,
    turboLv: number
  ) => {
    const ctx = plateCtx;
    ctx.clearRect(0, 0, 512, 128);

    // 深藍金屬銘牌底色 + 點狀邊框
    ctx.fillStyle = '#071324';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = skin.accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 116);

    // 左側塗裝色塊識別
    ctx.fillStyle = skin.previewHex;
    ctx.fillRect(20, 20, 16, 88);
    ctx.fillStyle = skin.accentHex;
    ctx.fillRect(36, 20, 5, 88);

    // 型號與塗裝名稱
    ctx.fillStyle = skin.accentHex;
    ctx.font = 'bold 21px "JetBrains Mono", monospace';
    ctx.fillText(`SPEC ${skin.code}  ·  DIORAMA EDITION`, 56, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
    ctx.fillText(`塗裝：${skin.name}`, 56, 82);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 17px "JetBrains Mono", "Noto Sans TC", sans-serif';
    ctx.fillText(
      `SHIELD Lv.${shieldLv} · TURBO Lv.${turboLv} · ${theme.name}`,
      56,
      109
    );

    plateTex.needsUpdate = true;
  };

  const setAcrylicVisibility = (visible: boolean, opacityRatio: number, liftY: number) => {
    acrylicHoodGroup.visible = visible && opacityRatio > 0.01;
    acrylicHoodGroup.position.y = liftY;
    mats.dioramaAcrylicPanel.opacity = 0.15 * opacityRatio;
    mats.dioramaAcrylicEdge.opacity = 0.72 * opacityRatio;
  };

  return {
    group,
    turntableGroup,
    outerRing,
    innerRing,
    acrylicHoodGroup,
    acrylicBoxMesh,
    acrylicEdges,
    nameplateMesh,
    updateNameplate,
    setAcrylicVisibility,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      plateTex.dispose();
    },
  };
}

/** 建立模型套件風高聳固定路障 */
export function createStaticBarrier(mats: GameMaterialLibrary): {
  group: THREE.Group;
  dispose: () => void;
} {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const group = new THREE.Group();

  const baseGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.3, 0.68));
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.22, 2.0, 12));
  const capGeo = trackGeo(new THREE.SphereGeometry(0.22, 12, 10));

  [-1.08, 1.08].forEach((px) => {
    const base = new THREE.Mesh(baseGeo, mats.barrierPillar);
    base.position.set(px, 0.15, 0);
    base.castShadow = true;
    group.add(base);

    const pillar = new THREE.Mesh(pillarGeo, mats.vehicleTrimMatte);
    pillar.position.set(px, 1.15, 0);
    pillar.castShadow = true;
    group.add(pillar);

    const cap = new THREE.Mesh(capGeo, mats.barrierBeam);
    cap.position.set(px, 2.22, 0);
    group.add(cap);
  });

  const beamGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 2.1, 10));
  beamGeo.rotateZ(Math.PI / 2);
  [0.54, 1.04, 1.54, 2.0].forEach((by) => {
    const beam = new THREE.Mesh(beamGeo, mats.barrierBeam);
    beam.position.set(0, by, 0);
    group.add(beam);
  });

  const topBarGeo = trackGeo(new THREE.BoxGeometry(2.48, 0.22, 0.34));
  const topBar = new THREE.Mesh(topBarGeo, mats.barrierPillar);
  topBar.position.set(0, 2.2, 0);
  topBar.castShadow = true;
  group.add(topBar);

  return {
    group,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}

/** 建立模型風低矮型跨欄路障 */
export function createLowBarrier(mats: GameMaterialLibrary): {
  group: THREE.Group;
  dispose: () => void;
} {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const group = new THREE.Group();

  const footGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.68, 0.62));
  [-1.12, 1.12].forEach((px) => {
    const foot = new THREE.Mesh(footGeo, mats.lowBarrierBase);
    foot.position.set(px, 0.34, 0);
    foot.castShadow = true;
    group.add(foot);
  });

  const curbGeo = trackGeo(new THREE.BoxGeometry(2.15, 0.28, 0.42));
  const curb = new THREE.Mesh(curbGeo, mats.lowBarrierBase);
  curb.position.set(0, 0.14, 0);
  curb.castShadow = true;
  group.add(curb);

  const laserGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 10));
  laserGeo.rotateZ(Math.PI / 2);
  [0.46, 0.72].forEach((ly) => {
    const laser = new THREE.Mesh(laserGeo, mats.lowBarrierBeam);
    laser.position.set(0, ly, 0);
    group.add(laser);
  });

  const domeCapGeo = trackGeo(new THREE.SphereGeometry(0.16, 10, 8));
  [-1.12, 1.12].forEach((px) => {
    const cap = new THREE.Mesh(domeCapGeo, mats.lowBarrierBeam);
    cap.position.set(px, 0.76, 0);
    group.add(cap);
  });

  return {
    group,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}

export interface PatrolDroneRig {
  root: THREE.Group;
  droneBody: THREE.Group;
  rotors: THREE.Mesh[];
  dispose: () => void;
}

/** 建立 Q 版玩具機器人風移動巡邏無人機 */
export function createPatrolDrone(mats: GameMaterialLibrary): PatrolDroneRig {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const root = new THREE.Group();

  const railGeo = trackGeo(new THREE.PlaneGeometry(7.2, 0.38));
  railGeo.rotateX(-Math.PI / 2);
  const rail = new THREE.Mesh(railGeo, mats.droneTrackRail);
  rail.position.set(0, 0.035, 0);
  root.add(rail);

  const endMarkerGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.56, 10));
  [-3.6, 3.6].forEach((mx) => {
    const marker = new THREE.Mesh(endMarkerGeo, mats.barrierBeam);
    marker.position.set(mx, 0.28, 0);
    root.add(marker);
  });

  const droneBody = new THREE.Group();
  droneBody.position.set(0, 1.18, 0);
  root.add(droneBody);

  const coreChassisGeo = trackGeo(new THREE.SphereGeometry(0.62, 16, 12));
  coreChassisGeo.scale(1.22, 0.78, 1.05);
  const coreChassis = new THREE.Mesh(coreChassisGeo, mats.droneChassis);
  coreChassis.castShadow = true;
  droneBody.add(coreChassis);

  const beltGeo = trackGeo(new THREE.TorusGeometry(0.62, 0.06, 8, 18));
  beltGeo.rotateX(Math.PI / 2);
  const belt = new THREE.Mesh(beltGeo, mats.vehicleWhiteAccent);
  droneBody.add(belt);

  const eyeGeo = trackGeo(new THREE.BoxGeometry(0.64, 0.24, 0.25));
  const eye = new THREE.Mesh(eyeGeo, mats.droneCoreGlow);
  eye.position.set(0, 0.04, 0.52);
  droneBody.add(eye);

  const armGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8));
  armGeo.rotateZ(Math.PI / 2);
  const arm = new THREE.Mesh(armGeo, mats.vehicleTrimMatte);
  droneBody.add(arm);

  const rotorGeo = trackGeo(new THREE.TorusGeometry(0.42, 0.09, 8, 16));
  rotorGeo.rotateX(Math.PI / 2);
  const rotorBladeGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.04, 0.12));
  const rotors: THREE.Mesh[] = [];

  [-1.02, 1.02].forEach((rx) => {
    const ring = new THREE.Mesh(rotorGeo, mats.droneRotor);
    ring.position.set(rx, 0.06, 0);
    droneBody.add(ring);

    const blade = new THREE.Mesh(rotorBladeGeo, mats.vehicleWhiteAccent);
    blade.position.set(rx, 0.06, 0);
    droneBody.add(blade);
    rotors.push(blade);
  });

  return {
    root,
    droneBody,
    rotors,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}

/** 建立壓克力寶石代幣風快遞晶片 */
export function createDeliveryChip(mats: GameMaterialLibrary): {
  group: THREE.Group;
  innerCrystal: THREE.Mesh;
  outerRing: THREE.Mesh;
  dispose: () => void;
} {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const group = new THREE.Group();

  const crystalGeo = trackGeo(new THREE.OctahedronGeometry(0.48, 0));
  crystalGeo.scale(0.88, 1.25, 0.88);
  const innerCrystal = new THREE.Mesh(crystalGeo, mats.chipCrystal);
  innerCrystal.position.y = 0.95;
  group.add(innerCrystal);

  const ringGeo = trackGeo(new THREE.TorusGeometry(0.68, 0.07, 8, 18));
  const outerRing = new THREE.Mesh(ringGeo, mats.chipRing);
  outerRing.position.y = 0.95;
  group.add(outerRing);

  return {
    group,
    innerCrystal,
    outerRing,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}

/** 建立模組化玩具軌道風單節高架道路 */
export function createRoadSegment(mats: GameMaterialLibrary): {
  group: THREE.Group;
  dispose: () => void;
} {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const len = GAME_CONFIG.ROAD_SEGMENT_LENGTH;
  const width = GAME_CONFIG.ROAD_WIDTH;
  const railX = GAME_CONFIG.GUARDRAIL_X;

  const group = new THREE.Group();

  const deckGeo = trackGeo(new THREE.BoxGeometry(width, 0.65, len));
  const deck = new THREE.Mesh(deckGeo, mats.roadSurface);
  deck.position.set(0, -0.325, 0);
  deck.receiveShadow = true;
  group.add(deck);

  const underBeamGeo = trackGeo(new THREE.BoxGeometry(width - 0.8, 0.95, len));
  const underBeam = new THREE.Mesh(underBeamGeo, mats.roadSideDeck);
  underBeam.position.set(0, -1.1, 0);
  group.add(underBeam);

  const railBaseGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.68, len));
  const railNeonGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.07, len, 8));
  railNeonGeo.rotateX(Math.PI / 2);
  const pylonGeo = trackGeo(new THREE.BoxGeometry(0.52, 1.15, 0.68));
  const studGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10));

  [-railX, railX].forEach((rx) => {
    const railBase = new THREE.Mesh(railBaseGeo, mats.guardrailBody);
    railBase.position.set(rx, 0.34, 0);
    group.add(railBase);

    const upperNeon = new THREE.Mesh(railNeonGeo, mats.guardrailNeonCyan);
    upperNeon.position.set(rx > 0 ? rx - 0.18 : rx + 0.18, 0.56, 0);
    group.add(upperNeon);

    const lowerNeon = new THREE.Mesh(railNeonGeo, mats.guardrailNeonPurple);
    lowerNeon.position.set(rx > 0 ? rx - 0.18 : rx + 0.18, 0.24, 0);
    group.add(lowerNeon);

    for (let pz = -len / 2 + 5; pz < len / 2; pz += 10) {
      const pylon = new THREE.Mesh(pylonGeo, mats.guardrailBody);
      pylon.position.set(rx, 0.575, pz);
      group.add(pylon);

      const stud = new THREE.Mesh(studGeo, mats.vehicleWhiteAccent);
      stud.position.set(rx, 1.2, pz);
      group.add(stud);
    }
  });

  return {
    group,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}

/** 建立微縮城市積木模型摩天大樓 */
export function createSkyscraper(
  mats: GameMaterialLibrary,
  width: number,
  height: number,
  depth: number,
  accentIndex: number
): {
  group: THREE.Group;
  dispose: () => void;
} {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const group = new THREE.Group();
  const neonMat =
    accentIndex % 3 === 0
      ? mats.buildingNeonCyan
      : accentIndex % 3 === 1
      ? mats.buildingNeonPurple
      : mats.buildingNeonMagenta;

  const bodyGeo = trackGeo(new THREE.BoxGeometry(width, height, depth));
  const body = new THREE.Mesh(bodyGeo, mats.buildingBase);
  body.position.y = height / 2 - 28;
  group.add(body);

  const stripGeo = trackGeo(new THREE.BoxGeometry(0.34, height * 0.92, 0.34));
  const stripLeft = new THREE.Mesh(stripGeo, neonMat);
  stripLeft.position.set(-width / 2 + 0.12, height / 2 - 28, depth / 2 + 0.08);
  group.add(stripLeft);

  const stripRight = new THREE.Mesh(stripGeo, neonMat);
  stripRight.position.set(width / 2 - 0.12, height / 2 - 28, depth / 2 + 0.08);
  group.add(stripRight);

  const crownGeo = trackGeo(new THREE.BoxGeometry(width * 0.78, 2.2, depth * 0.78));
  const crown = new THREE.Mesh(crownGeo, mats.buildingRoofCap);
  crown.position.y = height - 28 + 1.1;
  group.add(crown);

  const subCrownGeo = trackGeo(new THREE.BoxGeometry(width * 0.46, 1.6, depth * 0.46));
  const subCrown = new THREE.Mesh(subCrownGeo, mats.vehicleWhiteAccent);
  subCrown.position.y = height - 28 + 2.9;
  group.add(subCrown);

  const spireGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 5.5, 8));
  const spire = new THREE.Mesh(spireGeo, neonMat);
  spire.position.y = height - 28 + 6.0;
  group.add(spire);

  return {
    group,
    dispose: () => geometries.forEach((g) => g.dispose()),
  };
}
