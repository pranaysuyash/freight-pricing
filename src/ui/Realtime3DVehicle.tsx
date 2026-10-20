import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { EquipmentCategory } from '../engine/types';

interface Realtime3DVehicleProps {
  equipment: EquipmentCategory;
  isHazmat: boolean;
  requiresTarp: boolean;
  reeferActive: boolean;
  loadedMiles: number;
  deadheadMiles: number;
  currentDieselPrice: number;
}

export const Realtime3DVehicle: React.FC<Realtime3DVehicleProps> = ({
  equipment,
  isHazmat,
  requiresTarp,
  reeferActive,
  loadedMiles,
  deadheadMiles,
  currentDieselPrice,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [nightMode, setNightMode] = useState(true);
  const [simSpeedMph, setSimSpeedMph] = useState(65);

  // Scene references for updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const trailerGroupRef = useRef<THREE.Group | null>(null);
  const roadLinesRef = useRef<THREE.LineSegments | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef({ theta: Math.PI / 4, phi: Math.atan(1 / Math.SQRT2) });
  const radiusRef = useRef(55);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = 420;

    // 1. Scene & Background
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(nightMode ? 0x070b14 : 0x0f172a);
    scene.fog = new THREE.FogExp2(nightMode ? 0x070b14 : 0x0f172a, 0.015);

    // 2. Camera (Orthographic Isometric)
    const aspect = width / height;
    const d = 26;
    const camera = new THREE.OrthographicCamera(
      -d * aspect,
      d * aspect,
      d,
      -d,
      1,
      1000
    );
    cameraRef.current = camera;

    const updateCameraPosition = () => {
      const r = radiusRef.current;
      const x = r * Math.sin(rotRef.current.phi) * Math.cos(rotRef.current.theta);
      const y = r * Math.cos(rotRef.current.phi);
      const z = r * Math.sin(rotRef.current.phi) * Math.sin(rotRef.current.theta);
      camera.position.set(x, y + 6, z);
      camera.lookAt(0, 5, 0);
    };
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(30, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const warmFillLight = new THREE.DirectionalLight(0xf59e0b, 0.6);
    warmFillLight.position.set(-30, 20, -20);
    scene.add(warmFillLight);

    // Cyan underglow point light below truck
    const underglow = new THREE.PointLight(0x00f0ff, 2.5, 30);
    underglow.position.set(0, 1.2, 0);
    scene.add(underglow);

    // 5. Infinite Highway & Neon Grid
    const gridHelper = new THREE.GridHelper(160, 40, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(160, 24);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.8,
      metalness: 0.2,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);

    // Highway Dashed Center Lines (LineSegments)
    const lineCount = 20;
    const linePositions: number[] = [];
    for (let i = -lineCount; i < lineCount; i++) {
      const z = i * 6;
      linePositions.push(0, 0.05, z);
      linePositions.push(0, 0.05, z + 3);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const roadLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(roadLines);
    roadLinesRef.current = roadLines;

    // Road Shoulder Guidewires (Neon Lines)
    const shoulderPositions = [
      -8, 0.05, -80,  -8, 0.05, 80,
       8, 0.05, -80,   8, 0.05, 80,
    ];
    const shoulderGeo = new THREE.BufferGeometry();
    shoulderGeo.setAttribute('position', new THREE.Float32BufferAttribute(shoulderPositions, 3));
    const shoulderMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, opacity: 0.6, transparent: true });
    const shoulders = new THREE.LineSegments(shoulderGeo, shoulderMat);
    scene.add(shoulders);

    // 6. Assemble Full 3D Tractor & Trailer
    const truckMasterGroup = new THREE.Group();
    scene.add(truckMasterGroup);

    // Materials
    const cabPaintMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.7 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.8 });

    // Chassis frame
    const chassisGeo = new THREE.BoxGeometry(3.6, 0.8, 18);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 1.8, 12);
    chassis.castShadow = true;
    truckMasterGroup.add(chassis);

    // Wheels creator helper
    const wheels: THREE.Mesh[] = [];
    const makeWheel = (x: number, y: number, z: number, doubleTire = false) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);

      const tireGeo = new THREE.CylinderGeometry(1.6, 1.6, doubleTire ? 1.4 : 0.8, 20);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Rim cap
      const rimGeo = new THREE.CylinderGeometry(1.0, 1.0, doubleTire ? 1.45 : 0.85, 12);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      truckMasterGroup.add(wheelGroup);
      wheels.push(tire);
    };

    // Tractor Steer Axle (Front)
    makeWheel(-2.2, 1.6, 19.5);
    makeWheel(2.2, 1.6, 19.5);

    // Tractor Tandem Drive Axles
    makeWheel(-2.3, 1.6, 10.5, true);
    makeWheel(2.3, 1.6, 10.5, true);
    makeWheel(-2.3, 1.6, 7.0, true);
    makeWheel(2.3, 1.6, 7.0, true);

    // Trailer Tandem Axles (Rear)
    makeWheel(-2.3, 1.6, -18.0, true);
    makeWheel(2.3, 1.6, -18.0, true);
    makeWheel(-2.3, 1.6, -21.5, true);
    makeWheel(2.3, 1.6, -21.5, true);

    wheelsRef.current = wheels;

    // --- Tractor Sleeper Cab ---
    const cabGroup = new THREE.Group();
    cabGroup.position.set(0, 2.2, 16);

    // Hood / Engine Bay
    const hoodGeo = new THREE.BoxGeometry(3.6, 2.8, 5.2);
    const hood = new THREE.Mesh(hoodGeo, cabPaintMat);
    hood.position.set(0, 1.4, 3.2);
    hood.castShadow = true;
    cabGroup.add(hood);

    // Sleeper & Cab Body
    const sleeperGeo = new THREE.BoxGeometry(4.0, 5.0, 6.0);
    const sleeper = new THREE.Mesh(sleeperGeo, cabPaintMat);
    sleeper.position.set(0, 2.5, -2.0);
    sleeper.castShadow = true;
    cabGroup.add(sleeper);

    // Windshield
    const windshieldGeo = new THREE.BoxGeometry(3.5, 1.8, 0.4);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 3.6, 0.7);
    windshield.rotation.x = -Math.PI / 16;
    cabGroup.add(windshield);

    // Aero Roof Deflector
    const aeroGeo = new THREE.ConeGeometry(2.4, 2.0, 4);
    const aero = new THREE.Mesh(aeroGeo, cabPaintMat);
    aero.position.set(0, 5.6, -2.2);
    aero.rotation.y = Math.PI / 4;
    aero.rotation.x = -Math.PI / 8;
    cabGroup.add(aero);

    // Chrome Front Grille & Bumper
    const grilleGeo = new THREE.BoxGeometry(3.2, 2.0, 0.3);
    const grille = new THREE.Mesh(grilleGeo, chromeMat);
    grille.position.set(0, 1.2, 5.9);
    cabGroup.add(grille);

    const bumperGeo = new THREE.BoxGeometry(4.4, 0.8, 0.6);
    const bumper = new THREE.Mesh(bumperGeo, chromeMat);
    bumper.position.set(0, 0.4, 6.0);
    bumper.castShadow = true;
    cabGroup.add(bumper);

    // Dual Chrome Exhaust Stacks
    const stackGeo = new THREE.CylinderGeometry(0.2, 0.2, 6.5, 16);
    const stackL = new THREE.Mesh(stackGeo, chromeMat);
    stackL.position.set(-2.2, 4.5, -4.8);
    const stackR = new THREE.Mesh(stackGeo, chromeMat);
    stackR.position.set(2.2, 4.5, -4.8);
    cabGroup.add(stackL, stackR);

    // Fuel Tanks (Cylinders on sides)
    const tankGeo = new THREE.CylinderGeometry(0.8, 0.8, 4.0, 16);
    const tankL = new THREE.Mesh(tankGeo, chromeMat);
    tankL.rotation.x = Math.PI / 2;
    tankL.position.set(-2.2, 0.2, -1.8);
    const tankR = new THREE.Mesh(tankGeo, chromeMat);
    tankR.rotation.x = Math.PI / 2;
    tankR.position.set(2.2, 0.2, -1.8);
    cabGroup.add(tankL, tankR);

    truckMasterGroup.add(cabGroup);

    // --- Dynamic 3D Trailer Group ---
    const trailerGroup = new THREE.Group();
    truckMasterGroup.add(trailerGroup);
    trailerGroupRef.current = trailerGroup;

    // 7. Interactive Mouse / Orbit Controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      rotRef.current.theta -= dx * 0.008;
      rotRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, rotRef.current.phi - dy * 0.008));
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radiusRef.current = Math.max(25, Math.min(90, radiusRef.current + e.deltaY * 0.05));
      updateCameraPosition();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // 8. Animation Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Continuous Highway Motion
      if (roadLinesRef.current && simSpeedMph > 0) {
        const speedFactor = (simSpeedMph / 65) * 45;
        roadLinesRef.current.position.z += speedFactor * delta;
        if (roadLinesRef.current.position.z > 6) {
          roadLinesRef.current.position.z = 0;
        }

        // Rotate wheels
        wheelsRef.current.forEach(w => {
          w.rotation.x += speedFactor * delta * 0.6;
        });
      }

      // Auto rotation mode
      if (autoRotate) {
        rotRef.current.theta += 0.006;
        updateCameraPosition();
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = 420;
      const asp = w / h;
      cameraRef.current.left = -d * asp;
      cameraRef.current.right = d * asp;
      cameraRef.current.top = d;
      cameraRef.current.bottom = -d;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Re-build 3D Trailer Model when equipment or flags change
  useEffect(() => {
    const group = trailerGroupRef.current;
    if (!group) return;

    // Clear existing trailer objects
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const isReefer = equipment === 'reefer' || reeferActive;
    const isFlatbed = equipment === 'flatbed' || equipment === 'step_deck';

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.3,
      wireframe: wireframeMode,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
      wireframe: wireframeMode,
    });

    if (isFlatbed) {
      // 3D Flatbed Trailer Deck
      const deckGeo = new THREE.BoxGeometry(4.4, 0.6, 32);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.4, wireframe: wireframeMode });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.position.set(0, 2.7, -9);
      deck.castShadow = true;
      group.add(deck);

      // Steel Side Rails
      const railGeo = new THREE.BoxGeometry(0.2, 0.4, 32);
      const railL = new THREE.Mesh(railGeo, chromeMat);
      railL.position.set(-2.2, 3.1, -9);
      const railR = new THREE.Mesh(railGeo, chromeMat);
      railR.position.set(2.2, 3.1, -9);
      group.add(railL, railR);

      // Front Bulkhead / Headache Rack
      const rackGeo = new THREE.BoxGeometry(4.2, 4.5, 0.4);
      const rack = new THREE.Mesh(rackGeo, chromeMat);
      rack.position.set(0, 5.0, 6.8);
      rack.castShadow = true;
      group.add(rack);

      if (requiresTarp) {
        // Sculpted 3D Heavy Cargo Tarp (Canvas)
        const tarpGeo = new THREE.BoxGeometry(3.8, 3.6, 26);
        const tarpMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7, metalness: 0.1, wireframe: wireframeMode });
        const tarp = new THREE.Mesh(tarpGeo, tarpMat);
        tarp.position.set(0, 4.7, -8);
        tarp.castShadow = true;
        group.add(tarp);

        // Bungee strap lines
        const strapGeo = new THREE.BoxGeometry(4.0, 3.7, 0.2);
        const strapMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        for (let s = -18; s <= 2; s += 4) {
          const strap = new THREE.Mesh(strapGeo, strapMat);
          strap.position.set(0, 4.7, s);
          group.add(strap);
        }
      } else {
        // Stacked 3D Industrial Crates on Flatbed
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, wireframe: wireframeMode });
        const crateGeo = new THREE.BoxGeometry(3.6, 2.5, 6.5);
        for (let i = 0; i < 3; i++) {
          const crate = new THREE.Mesh(crateGeo, crateMat);
          crate.position.set(0, 4.2, 2 - i * 8.5);
          crate.castShadow = true;
          group.add(crate);

          // Orange High-Tensile Tie-Down Straps
          const strapGeo = new THREE.BoxGeometry(3.8, 2.6, 0.2);
          const strapMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
          const strap = new THREE.Mesh(strapGeo, strapMat);
          strap.position.set(0, 4.2, 2 - i * 8.5);
          group.add(strap);
        }
      }
    } else {
      // 53ft Enclosed Box (Dry Van / Reefer)
      const vanGeo = new THREE.BoxGeometry(4.4, 5.8, 33);
      const van = new THREE.Mesh(vanGeo, boxMat);
      van.position.set(0, 5.3, -9);
      van.castShadow = true;
      group.add(van);

      // Bottom Red/White DOT Safety Reflective Tape Strip
      const tapeGeo = new THREE.BoxGeometry(4.45, 0.3, 33);
      const tapeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tape = new THREE.Mesh(tapeGeo, tapeMat);
      tape.position.set(0, 2.6, -9);
      group.add(tape);

      // Rear Door Chrome Frame & Vertical Latch Rods
      const frameGeo = new THREE.BoxGeometry(4.42, 5.82, 0.2);
      const frame = new THREE.Mesh(frameGeo, chromeMat);
      frame.position.set(0, 5.3, -25.5);
      group.add(frame);

      const rodGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.6, 8);
      const rod1 = new THREE.Mesh(rodGeo, chromeMat);
      rod1.position.set(-0.9, 5.3, -25.6);
      const rod2 = new THREE.Mesh(rodGeo, chromeMat);
      rod2.position.set(0.9, 5.3, -25.6);
      group.add(rod1, rod2);

      // Reefer Nose-Mounted Compressor Unit
      if (isReefer) {
        const reeferUnitGeo = new THREE.BoxGeometry(3.6, 2.6, 1.4);
        const reeferMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
        const reeferUnit = new THREE.Mesh(reeferUnitGeo, reeferMat);
        reeferUnit.position.set(0, 6.2, 7.8);
        reeferUnit.castShadow = true;
        group.add(reeferUnit);

        // Pulsating Digital Climate LED (-10°F)
        const ledGeo = new THREE.BoxGeometry(1.2, 0.4, 0.1);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0, 6.2, 8.52);
        group.add(led);
      }
    }

    // DOT Hazmat Class 3 Flammable Diamond Placard (1993)
    if (isHazmat) {
      const placardGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const placardMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
      const placard = new THREE.Mesh(placardGeo, placardMat);
      placard.rotation.z = Math.PI / 4;
      placard.position.set(0, 4.2, -25.7);
      group.add(placard);

      // Side placards
      const sidePlacardL = new THREE.Mesh(placardGeo, placardMat);
      sidePlacardL.rotation.y = -Math.PI / 2;
      sidePlacardL.rotation.z = Math.PI / 4;
      sidePlacardL.position.set(-2.25, 4.0, -12);

      const sidePlacardR = new THREE.Mesh(placardGeo, placardMat);
      sidePlacardR.rotation.y = Math.PI / 2;
      sidePlacardR.rotation.z = Math.PI / 4;
      sidePlacardR.position.set(2.25, 4.0, -12);

      group.add(sidePlacardL, sidePlacardR);
    }
  }, [equipment, isHazmat, requiresTarp, reeferActive, wireframeMode]);

  const snapIsometric = () => {
    rotRef.current = { theta: Math.PI / 4, phi: Math.atan(1 / Math.SQRT2) };
    radiusRef.current = 55;
    if (cameraRef.current) {
      const r = radiusRef.current;
      const x = r * Math.sin(rotRef.current.phi) * Math.cos(rotRef.current.theta);
      const y = r * Math.cos(rotRef.current.phi);
      const z = r * Math.sin(rotRef.current.phi) * Math.sin(rotRef.current.theta);
      cameraRef.current.position.set(x, y + 6, z);
      cameraRef.current.lookAt(0, 5, 0);
    }
  };

  return (
    <div className="spatial-showcase-panel">
      {/* 3D Viewport Header & HUD Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="hud-tag">REALTIME 3D ISOMETRIC DIGITAL TWIN</span>
          <span className="live-pulse" />
          <span className="mono" style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
            {equipment.replace('_', ' ').toUpperCase()} · 53FT TANDEM
          </span>
        </div>

        {/* Viewport Action Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={snapIsometric}
            title="Snap camera to precise 35.264° / 45° CAD Isometric view"
          >
            📐 Isometric Lock
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 11, padding: '4px 10px', color: autoRotate ? '#38bdf8' : '#cbd5e1' }}
            onClick={() => setAutoRotate(r => !r)}
            title="Toggle 360° continuous turntable rotation"
          >
            🔄 {autoRotate ? 'Stop Orbit' : 'Turntable'}
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 11, padding: '4px 10px', color: wireframeMode ? '#00f0ff' : '#cbd5e1' }}
            onClick={() => setWireframeMode(w => !w)}
            title="Toggle Tron-style wireframe vector mode"
          >
            ⚡ {wireframeMode ? 'Solid Shading' : 'Wireframe'}
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => {
              const next = !nightMode;
              setNightMode(next);
              if (sceneRef.current) {
                const col = next ? 0x070b14 : 0x0f172a;
                sceneRef.current.background = new THREE.Color(col);
                sceneRef.current.fog = new THREE.FogExp2(col, 0.015);
              }
            }}
            title="Toggle Night Cyber vs Daylight Studio environment"
          >
            {nightMode ? '🌙 Cyber Night' : '☀️ Studio Light'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
            <span>Speed:</span>
            <input
              type="range"
              min="0"
              max="80"
              value={simSpeedMph}
              onChange={e => setSimSpeedMph(Number(e.target.value))}
              style={{ width: 70 }}
            />
            <span className="mono" style={{ color: '#38bdf8', width: 44 }}>{simSpeedMph} MPH</span>
          </div>
        </div>
      </div>

      {/* WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: 420,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
          border: '1px solid #1e293b',
          background: '#070b14',
        }}
      />

      {/* HUD Telemetry Footer Overlay */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span>Orbit: <strong style={{ color: '#f8fafc' }}>Click + Drag</strong></span>
          <span>Zoom: <strong style={{ color: '#f8fafc' }}>Scroll Wheel</strong></span>
          <span>Projection: <strong style={{ color: '#38bdf8' }}>Orthographic CAD</strong></span>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <span>Loaded: <strong className="mono" style={{ color: '#38bdf8' }}>{loadedMiles} mi</strong></span>
          <span>Deadhead: <strong className="mono" style={{ color: '#f59e0b' }}>{deadheadMiles} mi</strong></span>
          <span>Diesel: <strong className="mono" style={{ color: '#22c55e' }}>${currentDieselPrice.toFixed(2)}/gal</strong></span>
        </div>
      </div>
    </div>
  );
};
