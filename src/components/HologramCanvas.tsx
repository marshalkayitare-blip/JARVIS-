import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type JarvisState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

interface HologramCanvasProps {
  state: JarvisState;
  audioLevel: number; // 0.0 to 1.0
  onCoreClick?: () => void;
  onGlitch?: () => void;
}

export const HologramCanvas: React.FC<HologramCanvasProps> = ({
  state,
  audioLevel,
  onCoreClick,
  onGlitch,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<JarvisState>(state);
  const audioLevelRef = useRef<number>(audioLevel);
  const onGlitchRef = useRef(onGlitch);

  stateRef.current = state;
  audioLevelRef.current = audioLevel;
  onGlitchRef.current = onGlitch;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 12.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Root Group
    const hologramGroup = new THREE.Group();
    scene.add(hologramGroup);

    // State Colors
    const stateColors = {
      IDLE: { core: 0x00f0ff, ring: 0x0099ff, glow: 0x0044aa, speed: 1.0 },
      LISTENING: { core: 0x00ffcc, ring: 0x00e5ff, glow: 0x008877, speed: 1.6 },
      THINKING: { core: 0xd946ef, ring: 0x8b5cf6, glow: 0x4c1d95, speed: 3.2 },
      SPEAKING: { core: 0x38bdf8, ring: 0x0284c7, glow: 0x0369a1, speed: 1.8 },
      ERROR: { core: 0xff0055, ring: 0xff5500, glow: 0x990022, speed: 0.8 },
    };

    // 1. Central Icosahedron Wireframe Core
    const coreGeo = new THREE.IcosahedronGeometry(2.1, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: stateColors.IDLE.core,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    hologramGroup.add(coreMesh);

    // 2. Inner Glowing Solid Sphere
    const innerGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const innerMat = new THREE.MeshBasicMaterial({
      color: stateColors.IDLE.glow,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    hologramGroup.add(innerMesh);

    // 3. Ultra-Dense Center Energy Nucleus
    const nucleusGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    hologramGroup.add(nucleusMesh);

    // 4. Nested Gimbal HUD Rings
    interface RingItem {
      mesh: THREE.Mesh;
      speedX: number;
      speedY: number;
      speedZ: number;
      baseRadius: number;
    }

    const rings: RingItem[] = [];
    const ringConfigs = [
      { radius: 3.1, tube: 0.025, seg: 90, sx: 0.015, sy: 0.008, sz: 0.005, rotX: 0.3, rotY: 0.5 },
      { radius: 3.8, tube: 0.018, seg: 110, sx: -0.01, sy: 0.02, sz: -0.01, rotX: 1.1, rotY: -0.4 },
      { radius: 4.6, tube: 0.03, seg: 120, sx: 0.008, sy: -0.015, sz: 0.012, rotX: -0.7, rotY: 0.8 },
      { radius: 5.4, tube: 0.015, seg: 140, sx: -0.006, sy: 0.009, sz: -0.018, rotX: 0.9, rotY: -1.2 },
    ];

    ringConfigs.forEach((cfg) => {
      const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, cfg.seg);
      const mat = new THREE.MeshBasicMaterial({
        color: stateColors.IDLE.ring,
        transparent: true,
        opacity: 0.65,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = cfg.rotX;
      mesh.rotation.y = cfg.rotY;
      hologramGroup.add(mesh);
      rings.push({
        mesh,
        speedX: cfg.sx,
        speedY: cfg.sy,
        speedZ: cfg.sz,
        baseRadius: cfg.radius,
      });
    });

    // 5. Segmented Circular HUD Radar Ring
    const radarGeo = new THREE.RingGeometry(4.1, 4.25, 48, 1, 0, Math.PI * 1.6);
    const radarMat = new THREE.MeshBasicMaterial({
      color: stateColors.IDLE.ring,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    radarMesh.rotation.x = Math.PI / 2.3;
    hologramGroup.add(radarMesh);

    // 6. Particle Field (1,400 points in spherical orbits)
    const particleCount = 1400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const radius = 3.2 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      originalPositions[idx] = x;
      originalPositions[idx + 1] = y;
      originalPositions[idx + 2] = z;

      colors[idx] = 0.2;
      colors[idx + 1] = 0.9;
      colors[idx + 2] = 1.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    hologramGroup.add(particleSystem);

    // Mouse interactive rotation
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = -(clientY / window.innerHeight) * 2 + 1;
      targetRotationY = normX * 0.45;
      targetRotationX = normY * 0.35;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Digital Glitch System variables
    let idleDuration = 0;
    let nextGlitchThreshold = 7 + Math.random() * 8; // Random interval between 7s and 15s of idle
    let isGlitching = false;
    let glitchTimeRemaining = 0;

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      const currentState = stateRef.current;
      const audioVal = audioLevelRef.current;
      const config = stateColors[currentState] || stateColors.IDLE;

      // Color Interpolation
      const targetCoreColor = new THREE.Color(config.core);
      const targetRingColor = new THREE.Color(config.ring);
      const targetGlowColor = new THREE.Color(config.glow);

      // Digital Glitch Logic during IDLE state
      if (currentState === 'IDLE') {
        idleDuration += delta;
        if (idleDuration >= nextGlitchThreshold && !isGlitching) {
          isGlitching = true;
          glitchTimeRemaining = 0.22 + Math.random() * 0.12; // 220ms - 340ms subtle burst
          idleDuration = 0;
          nextGlitchThreshold = 9 + Math.random() * 11; // Next glitch in 9-20 seconds
          onGlitchRef.current?.();
        }
      } else {
        idleDuration = 0;
        isGlitching = false;
        glitchTimeRemaining = 0;
      }

      if (isGlitching) {
        glitchTimeRemaining -= delta;
        if (glitchTimeRemaining <= 0) {
          isGlitching = false;
        }
      }

      // Apply Glitch FX vs Standard Interpolation
      if (isGlitching) {
        // Subtle chromatic desync / jitter
        const chromaticColor = Math.random() > 0.4 ? 0x00f0ff : 0xd946ef;
        coreMat.color.setHex(chromaticColor);
        nucleusMat.color.setHex(Math.random() > 0.5 ? 0xffffff : 0x00f0ff);
        radarMat.color.setHex(0x00ffff);

        // Micro camera/group desync shake
        hologramGroup.position.x = (Math.random() - 0.5) * 0.14;
        hologramGroup.position.z = (Math.random() - 0.5) * 0.12;

        // Random ring angular twitch
        if (rings.length > 0) {
          const randomRing = rings[Math.floor(Math.random() * rings.length)];
          randomRing.mesh.rotation.z += (Math.random() - 0.5) * 0.25;
        }
      } else {
        coreMat.color.lerp(targetCoreColor, 0.08);
        nucleusMat.color.lerp(targetCoreColor, 0.08);
        radarMat.color.lerp(targetRingColor, 0.08);
        innerMat.color.lerp(targetGlowColor, 0.08);

        rings.forEach((r) => {
          (r.mesh.material as THREE.MeshBasicMaterial).color.lerp(targetRingColor, 0.08);
        });

        hologramGroup.position.x = 0;
        hologramGroup.position.z = 0;
      }

      // Smooth tracking of mouse rotation
      hologramGroup.rotation.y += (targetRotationY - hologramGroup.rotation.y) * 0.05;
      hologramGroup.rotation.x += (targetRotationX - hologramGroup.rotation.x) * 0.05;

      // Dynamic Speed Multiplier
      let speedMult = config.speed;
      if (currentState === 'SPEAKING') {
        speedMult = 1.4 + audioVal * 2.0;
      } else if (currentState === 'LISTENING') {
        speedMult = 1.3 + audioVal * 2.5;
      }

      // 1. Core Rotation & Audio Scale Pulse
      coreMesh.rotation.y += 0.006 * speedMult;
      coreMesh.rotation.x += 0.004 * speedMult;
      innerMesh.rotation.y -= 0.004 * speedMult;
      innerMesh.rotation.z += 0.003 * speedMult;

      // Breathing / Audio reactivity scale + glitch burst
      const baseBreathing = 1 + Math.sin(elapsedTime * 2) * 0.035;
      const audioPulse = 1 + (audioVal * 0.45);
      let targetScale = baseBreathing * audioPulse;

      if (isGlitching) {
        // High frequency scale jitter
        targetScale *= (1 + (Math.random() - 0.5) * 0.12);
        coreMesh.scale.set(targetScale, targetScale * 0.96, targetScale * 1.04);
      } else {
        coreMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
        innerMesh.scale.lerp(new THREE.Vector3(targetScale * 0.95, targetScale * 0.95, targetScale * 0.95), 0.2);
      }
      nucleusMesh.scale.lerp(new THREE.Vector3(1 + audioVal * 0.8, 1 + audioVal * 0.8, 1 + audioVal * 0.8), 0.3);

      // 2. Rotating Rings
      rings.forEach((r) => {
        r.mesh.rotation.x += r.speedX * speedMult;
        r.mesh.rotation.y += r.speedY * speedMult;
        r.mesh.rotation.z += r.speedZ * speedMult;
        const ringScale = 1 + (audioVal * 0.18);
        r.mesh.scale.lerp(new THREE.Vector3(ringScale, ringScale, ringScale), 0.15);
      });

      // Radar Ring Spin
      radarMesh.rotation.z -= 0.015 * speedMult;

      // 3. Orbiting Particles
      particleSystem.rotation.y -= 0.002 * speedMult;
      particleSystem.rotation.x += 0.0008 * speedMult;

      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      // Quantum particle jitter during thinking, speaking, or glitch
      if (currentState === 'THINKING' || currentState === 'SPEAKING' || isGlitching || audioVal > 0.1) {
        const step = isGlitching ? 3 : 6;
        for (let i = 0; i < particleCount; i += step) {
          const idx = i * 3;
          const origX = originalPositions[idx];
          const origY = originalPositions[idx + 1];
          const origZ = originalPositions[idx + 2];
          const jitter = (Math.random() - 0.5) * (isGlitching ? 0.25 : (0.08 + audioVal * 0.2));
          posArray[idx] = origX + jitter;
          posArray[idx + 1] = origY + jitter;
          posArray[idx + 2] = origZ + jitter;
        }
        posAttr.needsUpdate = true;
      }

      // Vertical Floating Bob
      hologramGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      radarGeo.dispose();
      radarMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      rings.forEach((r) => {
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      onClick={onCoreClick}
      className="absolute inset-0 z-0 cursor-pointer overflow-hidden"
      title="Click core to engage JARVIS voice protocol"
    />
  );
};
