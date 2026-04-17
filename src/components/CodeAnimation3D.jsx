/**
 * CodeAnimation3D.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Three.js-powered 3D Runtime Behavior Visualizer.
 * Consumes an AnimationScript produced by animationAI.js.
 *
 * Features:
 *  - Dedicated 3D zones: VARIABLES | STACK | HEAP | ARRAYS | LOOPS | OUTPUT
 *  - Each zone has a bold floating label pinned above it in 3D
 *  - 2D HUD strips at top showing active zone in real-time
 *  - Full playback controls: play/pause/prev/next/speed/repeat
 *  - Orbit controls for free camera rotation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  ChevronLeft, ChevronRight, Play, Pause,
  RotateCcw, Repeat, Cpu, Box, Layers,
  GitBranch, Activity, Terminal, Variable,
  MemoryStick, RefreshCw
} from 'lucide-react';

// ─── Zone definitions (3D world layout) ─────────────────────────────────────
// Each zone occupies a rectangular region in the XZ plane
const ZONES = {
  variables: {
    id: 'variables',
    label: 'VARIABLES',
    icon: '◈',
    color: '#6366f1',
    baseX: -4, baseZ: 1, cols: 2,
    camX: -3, camY: 4, camZ: 7,
    description: 'Variable values'
  },
  arrays: {
    id: 'arrays',
    label: 'ARRAYS / DATA',
    icon: '▦',
    color: '#06b6d4',
    baseX: 2, baseZ: 1, cols: 2,
    camX: 3, camY: 4, camZ: 7,
    description: 'Array & collection state'
  },
  stack: {
    id: 'stack',
    label: 'CALL STACK',
    icon: '⬆',
    color: '#f59e0b',
    baseX: -1, baseZ: -3, cols: 1,
    camX: 0, camY: 5, camZ: 3,
    description: 'Function call frames'
  },
  heap: {
    id: 'heap',
    label: 'MEMORY HEAP',
    icon: '◉',
    color: '#ec4899',
    baseX: 4, baseZ: -3, cols: 2,
    camX: 5, camY: 4, camZ: 3,
    description: 'Heap objects & references'
  },
  loops: {
    id: 'loops',
    label: 'LOOP / CONTROL',
    icon: '↺',
    color: '#10b981',
    baseX: -4, baseZ: -3, cols: 2,
    camX: -3, camY: 4, camZ: 3,
    description: 'Loop iterations & conditions'
  },
  output: {
    id: 'output',
    label: 'OUTPUT',
    icon: '▶',
    color: '#22c55e',
    baseX: 0, baseZ: -6, cols: 2,
    camX: 1, camY: 4, camZ: 0,
    description: 'Program output & results'
  },
};

// Map step kinds → zones
const KIND_TO_ZONE = {
  variable_assign:   'variables',
  variable_reassign: 'variables',
  string_create:     'variables',
  string_mutate:     'variables',
  array_create:      'arrays',
  array_push:        'arrays',
  array_pop:         'arrays',
  array_index:       'arrays',
  array_update:      'arrays',
  array_slice:       'arrays',
  array_merge:       'arrays',
  tuple_create:      'arrays',
  tuple_unpack:      'arrays',
  function_call:     'stack',
  function_return:   'stack',
  loop_iteration:    'loops',
  condition_branch:  'loops',
  pointer_create:    'heap',
  pointer_null:      'heap',
  gc_mark:           'heap',
  gc_sweep:          'heap',
  output:            'output',
};

// Map object types → zones
const TYPE_TO_ZONE = {
  box:         'variables',
  bead_chain:  'variables',
  shelf:       'arrays',
  glass_case:  'arrays',
  stack_frame: 'stack',
  ring:        'loops',
  fork:        'loops',
  tether:      'heap',
  cloud:       'heap',
  sphere:      'output',
};

// ─── Colour helpers ───────────────────────────────────────────────────────────
const hexToThree = (hex) => new THREE.Color(hex);
const GLOW = (hex, intensity = 0.8) => new THREE.MeshStandardMaterial({
  color: hexToThree(hex),
  emissive: hexToThree(hex),
  emissiveIntensity: intensity,
  metalness: 0.4,
  roughness: 0.35,
  transparent: true,
  opacity: 0.93,
});
const GLASS_MAT = (hex) => new THREE.MeshStandardMaterial({
  color: hexToThree(hex),
  transparent: true,
  opacity: 0.22,
  metalness: 0.1,
  roughness: 0.05,
  side: THREE.DoubleSide,
});



// ─── Object label sprite (shown above each 3D object) ─────────────────────
function makeObjectLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8,8,20,0.88)';
  roundRect(ctx, 0, 0, 512, 100, 50);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 20), 256, 50);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.1, 0.42, 1);
  return sprite;
}

// ─── Zone floor plate ─────────────────────────────────────────────────────────
function makeZonePlate(zone) {
  const geo = new THREE.PlaneGeometry(8, 9);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(zone.color),
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(zone.baseX + 2, -1.99, zone.baseZ + 1);
  return mesh;
}

// ─── Canvas helper ────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Scene3D class ────────────────────────────────────────────────────────────
class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.objects = new Map();   // id → { mesh, obj, zone }
    this.zoneCounters = {};     // zone id → count of objects placed
    Object.keys(ZONES).forEach(z => (this.zoneCounters[z] = 0));
    this.init();
  }

  init() {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#060610');
    this.scene.fog = new THREE.FogExp2('#060610', 0.025);

    // Camera — start with a close default
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 120);
    this.camera.position.set(0, 6, 10);
    this.camera.lookAt(0, 0, 0);

    // Camera animation state
    this._camTargetGoal = new THREE.Vector3(0, 0, 0);   // where camera looks
    this._camPosGoal = new THREE.Vector3(0, 6, 10);     // where camera moves to
    this._isAnimatingCam = false;
    this._camAnimProgress = 1; // 0→1 tween progress

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);

    // ── Lights ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(10, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(sun);

    // Coloured zone rim lights
    const addPointLight = (color, x, y, z, intensity, dist) => {
      const l = new THREE.PointLight(color, intensity, dist);
      l.position.set(x, y, z);
      this.scene.add(l);
    };
    addPointLight('#6366f1', -4, 3, 1, 2.5, 12);   // variables
    addPointLight('#06b6d4',  2, 3, 1, 2.5, 12);   // arrays
    addPointLight('#f59e0b', -1, 3,-3, 2.5, 12);   // stack
    addPointLight('#ec4899',  4, 3,-3, 2.5, 12);   // heap
    addPointLight('#10b981', -4, 3,-3, 2.5, 12);   // loops
    addPointLight('#22c55e',  0, 3,-6, 2.5, 12);   // output

    // ── Grid floor ──
    const grid = new THREE.GridHelper(20, 20, '#111128', '#111128');
    grid.position.y = -2;
    this.scene.add(grid);

    // ── Zone floor plates ──
    Object.values(ZONES).forEach(zone => {
      const plate = makeZonePlate(zone);
      this.scene.add(plate);
    });



    // ── Stars ──
    const starGeo = new THREE.BufferGeometry();
    const sv = [];
    for (let i = 0; i < 400; i++) {
      sv.push((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 40);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.35 })));

    // Clock
    this.clock = new THREE.Clock();
  }

  // ── Determine zone for an object ──────────────────────────────────────────
  _zoneForObj(obj) {
    // By step kind mapping (passed via meta)
    if (obj.meta?.zone && ZONES[obj.meta.zone]) return ZONES[obj.meta.zone];
    // By type
    const zoneId = TYPE_TO_ZONE[obj.type] ?? 'variables';
    return ZONES[zoneId];
  }

  // ── Build label sprite ───────────────────────────────────────────────────
  _makeLabel(obj) {
    const text = obj.value !== null && obj.value !== undefined
      ? `${obj.label}: ${Array.isArray(obj.value) ? `[${obj.value.join(',')}]` : obj.value}`
      : obj.label;
    return makeObjectLabel(String(text).slice(0, 24), obj.color);
  }

  // ── Object builders ──────────────────────────────────────────────────────
  buildBox(obj) {
    const g = new THREE.Group();
    // Pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.6), GLOW(obj.color, 0.45));
    ped.position.y = -0.09;
    ped.castShadow = true;
    g.add(ped);
    // Value cube
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), GLOW(obj.color, 0.9));
    cube.position.y = 0.64;
    cube.castShadow = true;
    g.add(cube);
    // Wireframe
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 1.1, 1.1));
    const wf = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 }));
    wf.position.y = 0.64;
    g.add(wf);
    // Label on TOP
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 1.85, 0);
    g.add(lbl);
    return g;
  }

  buildShelf(obj) {
    const g = new THREE.Group();
    const slots = Array.isArray(obj.value) ? obj.value : [];
    const count = Math.max(slots.length, 1);
    const sw = 1.3;
    const tw = count * sw;
    const sx = -tw / 2 + sw / 2;

    const rail = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.25, 0.11, 1.1), GLOW(obj.color, 0.38));
    g.add(rail);

    slots.forEach((val, i) => {
      const slotMesh = new THREE.Mesh(new THREE.BoxGeometry(sw - 0.08, 0.9, 0.9), GLOW(obj.color, 0.72));
      slotMesh.position.set(sx + i * sw, 0.5, 0);
      slotMesh.castShadow = true;
      g.add(slotMesh);

      // Index label
      const idxCvs = document.createElement('canvas');
      idxCvs.width = 128; idxCvs.height = 128;
      const ic = idxCvs.getContext('2d');
      ic.fillStyle = '#ffffff';
      ic.font = 'bold 64px system-ui';
      ic.textAlign = 'center';
      ic.textBaseline = 'middle';
      ic.fillText(`${val}`, 64, 64);
      const idxTex = new THREE.CanvasTexture(idxCvs);
      const idxMat = new THREE.SpriteMaterial({ map: idxTex, transparent: true });
      const idxSprite = new THREE.Sprite(idxMat);
      idxSprite.scale.set(0.6, 0.6, 1);
      idxSprite.position.set(sx + i * sw, 0.5, 0.6);
      g.add(idxSprite);

      if (i < slots.length - 1) {
        const div = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12 }));
        div.position.set(sx + i * sw + sw / 2, 0.5, 0);
        g.add(div);
      }
    });

    // Label on TOP
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 1.75, 0);
    g.add(lbl);
    return g;
  }

  buildStackFrame(obj) {
    const depth = obj.meta?.depth ?? 0;
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(4.2, 0.75, 2.4);
    const mesh = new THREE.Mesh(geo, GLOW(obj.color, 0.55));
    mesh.castShadow = true;
    g.add(mesh);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: obj.color, transparent: true, opacity: 0.85 }));
    g.add(outline);
    g.position.y = depth * 1.0;

    // CALL STACK label on top of each frame
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 0.9, 0);
    g.add(lbl);
    return g;
  }

  buildRing(obj) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 16, 80), GLOW(obj.color, 1.3));
    mesh.rotation.x = Math.PI / 2;
    g.add(mesh);
    // Inner arrow indicator
    const arrGeo = new THREE.ConeGeometry(0.22, 0.6, 12);
    const arr = new THREE.Mesh(arrGeo, GLOW(obj.color, 1.5));
    arr.position.set(1.5, 0, 0);
    arr.rotation.z = Math.PI / 2;
    g.add(arr);

    // Label on top
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 2.0, 0);
    g.add(lbl);
    return g;
  }

  buildBeadChain(obj) {
    const g = new THREE.Group();
    const str = String(obj.value ?? obj.label ?? '');
    const chars = str.slice(0, 18);
    const spread = chars.length * 0.7;
    chars.split('').forEach((ch, i) => {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), GLOW(obj.color, 0.9));
      bead.position.x = i * 0.72 - spread / 2;
      bead.castShadow = true;
      g.add(bead);
      if (i > 0) {
        const link = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), GLOW(obj.color, 0.38));
        link.position.x = i * 0.72 - 0.36 - spread / 2;
        link.rotation.z = Math.PI / 2;
        g.add(link);
      }
    });
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 0.7, 0);
    g.add(lbl);
    return g;
  }

  buildGlassCase(obj) {
    const g = new THREE.Group();
    const vals = Array.isArray(obj.value) ? obj.value : [obj.value];
    const w = Math.max(vals.length * 1.4, 2);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, 1.5), GLASS_MAT(obj.color));
    g.add(glass);
    const trim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 1.5, 1.5)), new THREE.LineBasicMaterial({ color: '#a0aec0' }));
    g.add(trim);
    const lock = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), GLOW('#a0aec0', 0.6));
    lock.position.y = 0.85;
    g.add(lock);
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 1.4, 0);
    g.add(lbl);
    return g;
  }

  buildFork(obj) {
    const g = new THREE.Group();
    const mat = GLOW(obj.color, 1.0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12), mat);
    stem.position.y = 0.7;
    g.add(stem);
    const left = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), GLOW('#22c55e', 1.0));
    left.position.set(-0.65, 2.0, 0);
    left.rotation.z = Math.PI / 5;
    g.add(left);
    const right = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), GLOW('#ef4444', 1.0));
    right.position.set(0.65, 2.0, 0);
    right.rotation.z = -Math.PI / 5;
    g.add(right);
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 3.2, 0);
    g.add(lbl);
    return g;
  }

  buildTether(obj) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3, 8), GLOW(obj.color, 1.6));
    beam.rotation.z = Math.PI / 2;
    g.add(beam);
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 12), GLOW(obj.color, 1.6));
    arrowHead.position.x = 1.7;
    arrowHead.rotation.z = -Math.PI / 2;
    g.add(arrowHead);
    return g;
  }

  buildSphere(obj) {
    const g = new THREE.Group();
    // Outer glow ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 48), GLOW(obj.color, 0.7));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    // Main sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 32), GLOW(obj.color, 1.2));
    sphere.castShadow = true;
    g.add(sphere);
    // Label on top
    const lbl = this._makeLabel(obj);
    lbl.position.set(0, 1.3, 0);
    g.add(lbl);
    return g;
  }

  // ── Factory ──────────────────────────────────────────────────────────────
  buildMesh(obj) {
    switch (obj.type) {
      case 'shelf':       return this.buildShelf(obj);
      case 'stack_frame': return this.buildStackFrame(obj);
      case 'ring':        return this.buildRing(obj);
      case 'bead_chain':  return this.buildBeadChain(obj);
      case 'glass_case':  return this.buildGlassCase(obj);
      case 'fork':        return this.buildFork(obj);
      case 'tether':      return this.buildTether(obj);
      case 'sphere':      return this.buildSphere(obj);
      case 'box':
      default:            return this.buildBox(obj);
    }
  }

  // ── Place objects in their zone ──────────────────────────────────────────
  placeObjects(stepObjects, kindHint) {
    stepObjects.forEach((obj) => {
      if (this.objects.has(obj.id)) return;

      // Inject zone hint from step kind
      if (kindHint && KIND_TO_ZONE[kindHint]) {
        obj = { ...obj, meta: { ...(obj.meta || {}), zone: KIND_TO_ZONE[kindHint] } };
      }

      const zone = this._zoneForObj(obj);
      const count = this.zoneCounters[zone.id] ?? 0;
      this.zoneCounters[zone.id] = count + 1;

      const mesh = this.buildMesh(obj);

      // Position within zone — tight spacing
      const cols = zone.cols ?? 2;
      const col = count % cols;
      const row = Math.floor(count / cols);
      const x = zone.baseX + col * 2.8;
      const z = zone.baseZ + row * 2.8;

      if (obj.position && (obj.position[0] !== 0 || obj.position[2] !== 0)) {
        mesh.position.set(...obj.position);
      } else {
        mesh.position.set(x, -1.5, z);
      }

      mesh.scale.set(0, 0, 0);
      this.scene.add(mesh);
      this.objects.set(obj.id, { mesh, obj, zone });
      this._animateSpawn(mesh);
    });
  }

  removeObject(id) {
    const entry = this.objects.get(id);
    if (!entry) return;
    this._animateDespawn(entry.mesh, () => {
      this.scene.remove(entry.mesh);
      this.objects.delete(id);
    });
  }

  clearUnrelatedObjects(keepIds) {
    const keepSet = new Set(keepIds);
    this.objects.forEach((_, id) => {
      if (!keepSet.has(id)) this.removeObject(id);
    });
  }

  highlightObjects(ids) {
    this.objects.forEach(({ mesh }, id) => {
      const active = ids.includes(id);
      mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = active ? 1.8 : 0.3;
        }
      });
    });
  }

  // ── Spawn / despawn tweens ────────────────────────────────────────────────
  _animateSpawn(mesh) {
    let t = 0;
    const tick = () => {
      t = Math.min(t + 0.055, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      mesh.scale.set(ease, ease, ease);
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  _animateDespawn(mesh, onComplete) {
    let t = 0;
    const tick = () => {
      t = Math.min(t + 0.07, 1);
      const ease = Math.pow(1 - t, 2);
      mesh.scale.set(ease, ease, ease);
      mesh.traverse(c => { if (c.material) c.material.opacity = ease * 0.92; });
      if (t < 1) requestAnimationFrame(tick);
      else onComplete?.();
    };
    tick();
  }

  // ── Camera fly-to zone (now with dynamic target tracking) ────────────────
  focusZone(zone, highlightIds = []) {
    if (!zone) return;

    let targetX = zone.baseX + 1.5;
    let targetY = 0;
    let targetZ = zone.baseZ;

    const activeMeshes = [];
    if (highlightIds && highlightIds.length > 0) {
      highlightIds.forEach(id => {
        const entry = this.objects.get(id);
        if (entry) activeMeshes.push(entry.mesh);
      });
    }

    // If we have specific objects to focus on, calculate their centroid
    if (activeMeshes.length > 0) {
      let sumX = 0, sumY = 0, sumZ = 0;
      activeMeshes.forEach(m => {
        sumX += m.position.x;
        sumY += m.position.y;
        sumZ += m.position.z;
      });
      targetX = sumX / activeMeshes.length;
      targetY = sumY / activeMeshes.length;
      targetZ = sumZ / activeMeshes.length;
    } else {
      // Fallback to zone center if no specific objects are highlighted
      targetX = zone.baseX + 1.5;
      targetZ = zone.baseZ;
    }

    // Offset the camera from the target position
    // We use a relative offset so it follows the objects forward
    const offsetX = zone.id === 'stack' ? 0 : 3.5;
    const offsetY = 5.5;
    const offsetZ = 6.5;

    this._camPosGoal.set(targetX + offsetX, offsetY, targetZ + offsetZ);
    this._camTargetGoal.set(targetX, targetY + 0.5, targetZ);

    // Start the smooth fly animation
    this._camAnimProgress = 0;
    this._isAnimatingCam = true;
    this._camPosStart = this.camera.position.clone();
    this._camTargetStart = this.controls.target.clone();
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  start() {
    const animate = () => {
      this.frameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // ── Camera fly animation ──
      if (this._isAnimatingCam && this._camAnimProgress < 1) {
        // Advance progress — reaches 1.0 in ~0.8 seconds at 60fps
        this._camAnimProgress = Math.min(this._camAnimProgress + delta * 1.5, 1);
        // Ease-out cubic for smooth deceleration
        const t = 1 - Math.pow(1 - this._camAnimProgress, 3);

        // Interpolate camera position
        this.camera.position.lerpVectors(this._camPosStart, this._camPosGoal, t);
        // Interpolate orbit controls target (what camera looks at)
        this.controls.target.lerpVectors(this._camTargetStart, this._camTargetGoal, t);

        if (this._camAnimProgress >= 1) {
          this._isAnimatingCam = false;
        }
      }
      this.controls.update();

      // Subtle object animations (reduced drift so they stay in focus)
      this.objects.forEach(({ mesh, obj }) => {
        switch (obj.type) {
          case 'ring':
            mesh.rotation.y += delta * 1.2;
            break;
          case 'sphere':
            mesh.rotation.y += delta * 0.5;
            break;
          case 'box':
            mesh.rotation.y += delta * 0.2;
            break;
          default:
            break;
        }
      });

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.objects.forEach(({ mesh }) => this.scene.remove(mesh));
    this.objects.clear();
    Object.keys(ZONES).forEach(z => (this.zoneCounters[z] = 0));
  }
}

// ─── Kind → colour map ───────────────────────────────────────────────────────
const KIND_COLORS = {
  variable_assign:   '#6366f1',
  variable_reassign: '#818cf8',
  string_create:     '#8b5cf6',
  string_mutate:     '#7c3aed',
  array_create:      '#06b6d4',
  array_push:        '#0ea5e9',
  array_pop:         '#f97316',
  array_index:       '#06b6d4',
  array_update:      '#0891b2',
  array_slice:       '#0284c7',
  array_merge:       '#22c55e',
  tuple_create:      '#0ea5e9',
  tuple_unpack:      '#38bdf8',
  function_call:     '#f59e0b',
  function_return:   '#fbbf24',
  loop_iteration:    '#10b981',
  condition_branch:  '#f97316',
  pointer_create:    '#ec4899',
  pointer_null:      '#f43f5e',
  gc_mark:           '#6b7280',
  gc_sweep:          '#4b5563',
  output:            '#22c55e',
};

// ─── Zone HUD strip component ─────────────────────────────────────────────────
const ZoneHUD = ({ activeZoneId }) => (
  <div style={{
    display: 'flex', gap: '6px', flexWrap: 'wrap',
    padding: '8px 14px',
    background: 'rgba(6,6,16,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}>
    {Object.values(ZONES).map(zone => {
      const isActive = zone.id === activeZoneId;
      return (
        <div key={zone.id} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px',
          borderRadius: '20px',
          border: `1px solid ${isActive ? zone.color : 'rgba(255,255,255,0.07)'}`,
          background: isActive ? `${zone.color}18` : 'transparent',
          transition: 'all 0.35s ease',
          cursor: 'default',
        }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.01em', color: isActive ? zone.color : '#374151', fontWeight: isActive ? 700 : 500, transition: 'color 0.3s' }}>
            {zone.icon} {zone.label}
          </span>
        </div>
      );
    })}
  </div>
);

// ─── React Component ──────────────────────────────────────────────────────────
const CodeAnimation3D = ({ script, isPlaying: isPlayingProp, speed: speedProp = 1, onStepChange }) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const containerRef = useRef(null);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(isPlayingProp ?? false);
  const [speed, setSpeed] = useState(speedProp ?? 1);
  const [isRepeat, setIsRepeat] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);

  const steps = script?.steps || [];
  const currentStep = steps[currentStepIdx] || null;
  const totalSteps = steps.length;

  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const s = new Scene3D(canvasRef.current);
    sceneRef.current = s;
    s.start();

    const handleResize = () => {
      const el = canvasRef.current;
      if (el) s.resize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      s.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ── Apply step to scene ───────────────────────────────────────────────────
  const applyStep = useCallback((step) => {
    if (!sceneRef.current || !step) return;
    const s = sceneRef.current;
    const ids = step.objects.map(o => o.id);

    if (step.kind === 'output') {
      s.reset();
    } else {
      const ACCUMULATE = ['function_call', 'array_create', 'array_push', 'variable_assign', 'pointer_create'];
      if (!ACCUMULATE.includes(step.kind)) {
        s.clearUnrelatedObjects(ids);
      }
    }

    s.placeObjects(step.objects, step.kind);
    s.highlightObjects(ids);

    // Update active zone & auto-focus camera close-up
    const zoneId = KIND_TO_ZONE[step.kind] ?? 'variables';
    setActiveZoneId(zoneId);
    const zone = ZONES[zoneId];
    if (zone) s.focusZone(zone, ids);

    onStepChange?.(step);
  }, [onStepChange]);

  useEffect(() => {
    if (currentStep) applyStep(currentStep);
  }, [currentStepIdx, script]); // eslint-disable-line

  // ── Auto playback ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const isAtEnd = currentStepIdx >= totalSteps - 1;
    if (isAtEnd && !isRepeat) { setIsPlaying(false); return; }
    const timer = setTimeout(() => {
      if (isAtEnd && isRepeat) setCurrentStepIdx(0);
      else setCurrentStepIdx(i => Math.min(totalSteps - 1, i + 1));
    }, 3000 / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, speed, totalSteps, isRepeat]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePrev = () => setCurrentStepIdx(i => Math.max(0, i - 1));
  const handleNext = () => setCurrentStepIdx(i => Math.min(totalSteps - 1, i + 1));
  const handleReset = () => { setIsPlaying(false); setCurrentStepIdx(0); sceneRef.current?.reset(); setActiveZoneId(null); };
  const handlePlayPause = () => setIsPlaying(p => !p);

  const progress = totalSteps > 1 ? currentStepIdx / (totalSteps - 1) : 0;
  const kindColor = KIND_COLORS[currentStep?.kind] ?? '#6366f1';
  const activeZone = activeZoneId ? ZONES[activeZoneId] : null;

  return (
    <div ref={containerRef} style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#060610', borderRadius: '16px', overflow: 'hidden',
      position: 'relative', fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Title bar ── */}
      <div style={{
        padding: '10px 18px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            {script?.title ?? '3D Runtime Visualizer'}
          </span>
          {script?.summary && (
            <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px', margin: 0 }}>
              {script.summary}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 700, padding: '3px 10px', background: 'rgba(99,102,241,0.12)', borderRadius: '20px', letterSpacing: '0.05em' }}>
            THREE.js
          </span>
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, padding: '3px 10px', background: 'rgba(16,185,129,0.12)', borderRadius: '20px', letterSpacing: '0.05em' }}>
            RUNTIME
          </span>
        </div>
      </div>

      {/* ── Zone HUD strip ── */}
      <ZoneHUD activeZoneId={activeZoneId} />

      {/* ── Canvas ── */}
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', display: 'block', minHeight: 0 }}
      />

      {/* ── Active zone badge (floating, top-right of canvas) ── */}
      {activeZone && (
        <div style={{
          position: 'absolute',
          top: '110px', right: '14px',
          padding: '6px 14px',
          borderRadius: '24px',
          border: `1.5px solid ${activeZone.color}`,
          background: `${activeZone.color}18`,
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: '6px',
          transition: 'all 0.4s ease',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '1rem' }}>{activeZone.icon}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: activeZone.color, letterSpacing: '0.08em' }}>
            {activeZone.label}
          </span>
        </div>
      )}

      {/* ── Step info overlay ── */}
      {currentStep && (
        <div style={{
          position: 'absolute', bottom: '82px', left: '14px', right: '14px',
          background: 'rgba(6,6,20,0.88)', backdropFilter: 'blur(14px)',
          border: `1px solid ${kindColor}44`, borderRadius: '14px',
          padding: '12px 16px',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px',
              borderRadius: '6px', background: `${kindColor}20`, color: kindColor,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {currentStep.kind.replace(/_/g, ' ')}
            </span>
            {activeZone && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px',
                borderRadius: '6px', background: `${activeZone.color}15`, color: activeZone.color,
                letterSpacing: '0.06em',
              }}>
                {activeZone.icon} {activeZone.label}
              </span>
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
              {currentStep.label}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#475569', marginLeft: 'auto' }}>
              Line {currentStep.line}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.55', margin: 0 }}>
            "{currentStep.narration}"
          </p>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={{
        flexShrink: 0,
        padding: '8px 16px',
        background: 'rgba(6,6,20,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: '7px',
        zIndex: 20,
      }}>
        {/* Progress bar */}
        <div
          style={{ position: 'relative', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', cursor: 'pointer' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = (e.clientX - rect.left) / rect.width;
            setCurrentStepIdx(Math.round(frac * (totalSteps - 1)));
          }}
        >
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
            borderRadius: '2px', transition: 'width 0.35s ease',
          }} />
          {/* Step ticks */}
          {steps.map((_, i) => (
            <div key={i} style={{
              position: 'absolute', top: '-2px',
              left: `${(i / Math.max(totalSteps - 1, 1)) * 100}%`,
              width: '2px', height: '7px',
              background: i === currentStepIdx ? '#fff' : 'rgba(255,255,255,0.18)',
              borderRadius: '1px', transform: 'translateX(-50%)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handleReset} title="Reset" style={btnStyle('#64748b')}>
              <RotateCcw size={14} />
            </button>
            <button onClick={handlePrev} disabled={currentStepIdx === 0} style={btnStyle(currentStepIdx === 0 ? '#232340' : '#94a3b8')}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={handlePlayPause} style={{
              padding: '6px 20px', borderRadius: '20px', fontWeight: 700, fontSize: '0.78rem',
              color: '#fff', background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 16px -3px rgba(99,102,241,0.55)',
              border: 'none', cursor: 'pointer',
            }}>
              {isPlaying ? <><Pause size={13} /> Pause</> : <><Play size={13} fill="currentColor" /> Play</>}
            </button>
            <button onClick={handleNext} disabled={currentStepIdx >= totalSteps - 1} style={btnStyle(currentStepIdx >= totalSteps - 1 ? '#232340' : '#94a3b8')}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)' }} />

          {/* Repeat */}
          <button onClick={() => setIsRepeat(r => !r)} title="Loop" style={{
            padding: '5px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center',
            color: isRepeat ? '#a855f7' : '#4b5563',
            background: isRepeat ? 'rgba(168,85,247,0.12)' : 'transparent',
            border: isRepeat ? '1px solid rgba(168,85,247,0.25)' : '1px solid transparent',
            cursor: 'pointer',
          }}>
            <Repeat size={15} />
          </button>

          {/* Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: '8px' }}>
            {[0.5, 1, 2, 3].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{
                padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
                color: speed === s ? '#fff' : '#64748b',
                background: speed === s ? '#6366f1' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}>
                {s}x
              </button>
            ))}
          </div>

          {/* Step counter */}
          <span style={{ fontSize: '0.72rem', color: '#475569', marginLeft: 'auto', fontWeight: 700 }}>
            {currentStepIdx + 1} <span style={{ opacity: 0.4 }}>/</span> {totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Button style helper ────────────────────────────────────────────────────
const btnStyle = (color) => ({
  color, display: 'flex', alignItems: 'center',
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
});

export default CodeAnimation3D;
