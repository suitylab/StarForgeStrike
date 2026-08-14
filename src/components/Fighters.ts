import * as THREE from 'three';

/**
 * FighterBuilder type alias — a factory function that constructs
 * a THREE.js fighter mesh group.
 */
export type FighterBuilder = () => THREE.Group;

/**
 * Builds the PHANTOM fighter mesh.
 *
 * The PHANTOM is a fast, stealthy interceptor with:
 *   - Narrow pointed fuselage with a needle-like nose
 *   - Wide delta wings that sweep back dramatically
 *   - Purple/violet color scheme with magenta accents
 *   - Single sleek engine nacelle with purple exhaust glow
 *   - Small flush cockpit canopy for stealth profile
 *   - Twin vertical stabilizers at the rear
 *
 * The fighter faces upward: nose points toward +Y.
 *
 * @returns {THREE.Group} A configured PHANTOM fighter mesh group
 */
export function buildPhantom(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  // Signature magenta-violet for the main body
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xcf4ae0,
    metalness: 0.8,
    roughness: 0.3,
  });

  // Deeper magenta for wings
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x9820bc,
    metalness: 0.8,
    roughness: 0.4,
  });

  // Dark magenta accent for panel lines and details
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f1b8f,
    metalness: 0.85,
    roughness: 0.5,
  });

  // Magenta emissive for cockpit canopy
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0xff00c8,
    emissive: 0xff00c8,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  // Magenta emissive for engine exhaust port
  const exhaustMaterial = new THREE.MeshStandardMaterial({
    color: 0xff00c8,
    emissive: 0xff00c8,
    emissiveIntensity: 1.0,
    metalness: 0.2,
    roughness: 0.1,
  });

  // Magenta accent material for wingtip lights and details
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xff00c8,
    emissive: 0xff00c8,
    emissiveIntensity: 0.6,
    metalness: 0.3,
    roughness: 0.2,
  });

  // --- Main Fuselage (layered: central spine + side panels) ---
  const fuselageGeometry = new THREE.BoxGeometry(0.4, 1.4, 0.4);
  const fuselage = new THREE.Mesh(fuselageGeometry, bodyMaterial);
  group.add(fuselage);

  // Central spine — raised ridge along the top
  const spineGeometry = new THREE.BoxGeometry(0.1, 1.45, 0.1);
  const spine = new THREE.Mesh(spineGeometry, darkMaterial);
  spine.position.set(0, 0, 0.18);
  group.add(spine);

  // Side armor panels — angled plates on the fuselage
  const panelGeometry = new THREE.BoxGeometry(0.06, 0.9, 0.3);
  const leftPanel = new THREE.Mesh(panelGeometry, darkMaterial);
  leftPanel.position.set(-0.23, 0, 0);
  leftPanel.rotation.z = 0.12;
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeometry, darkMaterial);
  rightPanel.position.set(0.23, 0, 0);
  rightPanel.rotation.z = -0.12;
  group.add(rightPanel);

  // --- Needle Nose (layered: main cone + tip + accent) ---
  const noseGeometry = new THREE.ConeGeometry(0.12, 0.6, 8);
  const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
  nose.position.set(0, 1.0, 0);
  group.add(nose);

  // Nose tip — small bright accent
  const noseTipGeometry = new THREE.ConeGeometry(0.04, 0.15, 8);
  const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
  noseTip.position.set(0, 1.3, 0);
  group.add(noseTip);

  // --- Delta Wings (layered: main wing + under-panel + wingtip light) ---
  // Custom triangular geometry for dramatic swept-back delta wings
  const deltaWingGeometry = new THREE.BufferGeometry();
  const wingVertices = new Float32Array([
    // Left wing triangle (extends left and sweeps back)
    -0.2, 0.2, 0,
    -1.4, -0.4, 0,
    -0.2, -0.4, 0,
    // Right wing triangle (extends right and sweeps back)
    // Note: vertices ordered counter-clockwise so the front face (+Z)
    // faces the camera with the default FrontSide material.
    0.2, 0.2, 0,
    0.2, -0.4, 0,
    1.4, -0.4, 0,
  ]);
  deltaWingGeometry.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
  deltaWingGeometry.computeVertexNormals();

  const deltaWing = new THREE.Mesh(deltaWingGeometry, wingMaterial);
  group.add(deltaWing);

  // Wing underside panels — darker layer beneath
  const underWingGeometry = new THREE.BufferGeometry();
  const underWingVertices = new Float32Array([
    // Left wing underside
    -0.18, 0.18, -0.08,
    -1.35, -0.38, -0.08,
    -0.18, -0.38, -0.08,
    // Right wing underside (counter-clockwise, facing +Z)
    0.18, 0.18, -0.08,
    0.18, -0.38, -0.08,
    1.35, -0.38, -0.08,
  ]);
  underWingGeometry.setAttribute('position', new THREE.BufferAttribute(underWingVertices, 3));
  underWingGeometry.computeVertexNormals();

  const underWing = new THREE.Mesh(underWingGeometry, darkMaterial);
  group.add(underWing);

  // Wingtip accent lights — small emissive spheres
  const wingtipGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const leftWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
  leftWingtip.position.set(-1.35, -0.35, 0);
  group.add(leftWingtip);

  const rightWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
  rightWingtip.position.set(1.35, -0.35, 0);
  group.add(rightWingtip);

  // Wing accent strips — emissive lines along wing edges
  const accentStripGeometry = new THREE.BoxGeometry(0.03, 0.6, 0.03);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.85, -0.1, 0.05);
  leftAccent.rotation.z = 0.25;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.85, -0.1, 0.05);
  rightAccent.rotation.z = -0.25;
  group.add(rightAccent);

  // --- Single Engine Nacelle (layered: nacelle + intake ring + exhaust + glow) ---
  const nacelleGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8);
  const nacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
  nacelle.position.set(0, -0.8, 0);
  nacelle.rotation.x = Math.PI / 2;
  group.add(nacelle);

  // Nacelle intake ring — darker ring at the front
  const intakeGeometry = new THREE.TorusGeometry(0.13, 0.025, 6, 12);
  const intake = new THREE.Mesh(intakeGeometry, darkMaterial);
  intake.position.set(0, -0.5, 0);
  intake.rotation.x = Math.PI / 2;
  group.add(intake);

  // Exhaust port — magenta emissive disc
  const exhaustGeometry = new THREE.CircleGeometry(0.1, 8);
  const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  exhaust.position.set(0, -1.1, 0);
  exhaust.rotation.x = Math.PI / 2;
  group.add(exhaust);

  // --- Cockpit Canopy (layered: base + frame) ---
  const canopyGeometry = new THREE.ConeGeometry(0.1, 0.15, 8);
  const canopy = new THREE.Mesh(canopyGeometry, cockpitMaterial);
  canopy.position.set(0, 0.6, 0.1);
  group.add(canopy);

  // Canopy frame — darker ring around the base
  const canopyFrameGeometry = new THREE.TorusGeometry(0.09, 0.015, 6, 12);
  const canopyFrame = new THREE.Mesh(canopyFrameGeometry, darkMaterial);
  canopyFrame.position.set(0, 0.53, 0.1);
  canopyFrame.rotation.x = Math.PI / 2;
  group.add(canopyFrame);

  // --- Twin Vertical Stabilizers (layered: fin + accent edge) ---
  const finGeometry = new THREE.BoxGeometry(0.06, 0.4, 0.3);
  const leftFin = new THREE.Mesh(finGeometry, wingMaterial);
  leftFin.position.set(-0.25, -0.3, 0.15);
  leftFin.rotation.z = 0.3;
  group.add(leftFin);

  const rightFin = new THREE.Mesh(finGeometry, wingMaterial);
  rightFin.position.set(0.25, -0.3, 0.15);
  rightFin.rotation.z = -0.3;
  group.add(rightFin);

  // Fin accent edges — emissive strips on the stabilizers
  const finAccentGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.02);
  const leftFinAccent = new THREE.Mesh(finAccentGeometry, accentMaterial);
  leftFinAccent.position.set(-0.28, -0.3, 0.28);
  leftFinAccent.rotation.z = 0.3;
  group.add(leftFinAccent);

  const rightFinAccent = new THREE.Mesh(finAccentGeometry, accentMaterial);
  rightFinAccent.position.set(0.28, -0.3, 0.28);
  rightFinAccent.rotation.z = -0.3;
  group.add(rightFinAccent);

  // --- Engine Glow Effect (layered: outer glow + inner bright core) ---
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff00c8,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowGeometry = new THREE.ConeGeometry(0.08, 0.35, 8);

  const singleGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  singleGlow.position.set(0, -1.25, 0);
  singleGlow.rotation.x = -Math.PI / 2;
  group.add(singleGlow);

  // Inner bright core
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe0f7,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerGlowGeometry = new THREE.ConeGeometry(0.04, 0.2, 8);
  const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  innerGlow.position.set(0, -1.35, 0);
  innerGlow.rotation.x = -Math.PI / 2;
  group.add(innerGlow);

  // Store glow mesh for pulse animation via userData
  group.userData = {
    singleGlow,
  };

  return group;
}

/**
 * Builds the TITAN fighter mesh.
 *
 * The TITAN is a heavy assault gunship with:
 *   - Broad, low-profile armored gunboat hull with a raised deck
 *   - Long forward cannon barrel — the massive energy beam
 *   - Straight heavy wings with cylindrical weapon pods on the tips
 *   - Rear boxed engine block with twin orange exhaust glows
 *   - Single large dorsal fin at the stern
 *   - Armored slit cockpit on the forward deck
 *   - Orange/amber color scheme with bronze gunmetal armor
 *
 * The fighter faces upward: nose points toward +Y.
 *
 * @returns {THREE.Group} A configured TITAN fighter mesh group
 */
export function buildTitan(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  // Signature amber-gold for the main armor
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8912e,
    metalness: 0.75,
    roughness: 0.35,
  });

  // Deeper amber for wings and pods
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xbf6f14,
    metalness: 0.8,
    roughness: 0.4,
  });

  // Dark amber accent for panel lines and details
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x91530a,
    metalness: 0.85,
    roughness: 0.5,
  });

  // Amber emissive for cockpit canopy
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  // Amber emissive for engine exhaust ports
  const exhaustMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 1.0,
    metalness: 0.2,
    roughness: 0.1,
  });

  // Amber accent material for muzzle ring and details
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.6,
    metalness: 0.3,
    roughness: 0.2,
  });

  // --- Hull: wide, low-profile armored gunboat ---
  // Flat wide main hull — silhouette dominated by width, not height
  const hullGeometry = new THREE.BoxGeometry(1.2, 0.45, 0.9);
  const hull = new THREE.Mesh(hullGeometry, bodyMaterial);
  group.add(hull);

  // Lower hull plate — wider, darker armor skirt
  const lowerHullGeometry = new THREE.BoxGeometry(1.4, 0.16, 1.05);
  const lowerHull = new THREE.Mesh(lowerHullGeometry, darkMaterial);
  lowerHull.position.set(0, -0.28, 0);
  group.add(lowerHull);

  // Upper deck — raised central block with angled side bevels
  const deckGeometry = new THREE.BoxGeometry(0.85, 0.22, 0.75);
  const deck = new THREE.Mesh(deckGeometry, darkMaterial);
  deck.position.set(0, 0.3, 0);
  group.add(deck);

  // Side armor sponsons — thick angled plates mounted low on the hull
  const sponsonGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.8);
  const leftSponson = new THREE.Mesh(sponsonGeometry, bodyMaterial);
  leftSponson.position.set(-0.7, -0.15, 0);
  leftSponson.rotation.z = 0.12;
  group.add(leftSponson);

  const rightSponson = new THREE.Mesh(sponsonGeometry, bodyMaterial);
  rightSponson.position.set(0.7, -0.15, 0);
  rightSponson.rotation.z = -0.12;
  group.add(rightSponson);

  // --- Forward Cannon Barrel — the massive energy beam ---
  // Long centered barrel protruding straight ahead of the hull
  const barrelGeometry = new THREE.CylinderGeometry(0.11, 0.15, 1.5, 12);
  const barrel = new THREE.Mesh(barrelGeometry, bodyMaterial);
  barrel.position.set(0, 1.05, 0);
  group.add(barrel);

  // Muzzle ring — emissive amber torus at the tip
  const muzzleRingGeometry = new THREE.TorusGeometry(0.14, 0.035, 8, 16);
  const muzzleRing = new THREE.Mesh(muzzleRingGeometry, accentMaterial);
  muzzleRing.position.set(0, 1.75, 0);
  group.add(muzzleRing);

  // Muzzle tip — bright amber cone
  const muzzleTipGeometry = new THREE.ConeGeometry(0.12, 0.14, 10);
  const muzzleTip = new THREE.Mesh(muzzleTipGeometry, accentMaterial);
  muzzleTip.position.set(0, 1.95, 0);
  group.add(muzzleTip);

  // Barrel support collar — dark band where the barrel meets the hull
  const collarGeometry = new THREE.TorusGeometry(0.16, 0.04, 8, 16);
  const collar = new THREE.Mesh(collarGeometry, darkMaterial);
  collar.position.set(0, 0.42, 0);
  group.add(collar);

  // --- Straight Heavy Wings with weapon pods ---
  // Box wings extending straight out, unlike Vanguard's swept or Phantom's delta
  const wingGeometry = new THREE.BoxGeometry(1.05, 0.14, 0.55);
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  leftWing.position.set(-1.0, 0.02, 0);
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
  rightWing.position.set(1.0, 0.02, 0);
  group.add(rightWing);

  // Wing tip weapon pods — cylindrical hardpoint pods pointing outward
  const podGeometry = new THREE.CylinderGeometry(0.18, 0.2, 0.7, 10);
  const leftPod = new THREE.Mesh(podGeometry, bodyMaterial);
  leftPod.position.set(-1.52, 0.02, 0);
  leftPod.rotation.z = Math.PI / 2;
  group.add(leftPod);

  const rightPod = new THREE.Mesh(podGeometry, bodyMaterial);
  rightPod.position.set(1.52, 0.02, 0);
  rightPod.rotation.z = -Math.PI / 2;
  group.add(rightPod);

  // Pod tip accents — emissive amber caps on the outer ends
  const podTipGeometry = new THREE.ConeGeometry(0.16, 0.14, 10);
  const leftPodTip = new THREE.Mesh(podTipGeometry, accentMaterial);
  leftPodTip.position.set(-1.9, 0.02, 0);
  leftPodTip.rotation.z = Math.PI / 2;
  group.add(leftPodTip);

  const rightPodTip = new THREE.Mesh(podTipGeometry, accentMaterial);
  rightPodTip.position.set(1.9, 0.02, 0);
  rightPodTip.rotation.z = -Math.PI / 2;
  group.add(rightPodTip);

  // --- Rear Engine Block ---
  // Box thrust block mounted at the stern
  const engineBlockGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.6);
  const engineBlock = new THREE.Mesh(engineBlockGeometry, bodyMaterial);
  engineBlock.position.set(0, -0.75, 0);
  group.add(engineBlock);

  // Twin exhaust ports — amber emissive discs
  const exhaustGeometry = new THREE.CircleGeometry(0.16, 10);
  const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  leftExhaust.position.set(-0.2, -1.05, 0);
  leftExhaust.rotation.x = Math.PI / 2;
  group.add(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
  rightExhaust.position.set(0.2, -1.05, 0);
  rightExhaust.rotation.x = Math.PI / 2;
  group.add(rightExhaust);

  // --- Central Vertical Fin ---
  // Single large dorsal fin at the rear, unlike the twin stabilizers elsewhere
  const finGeometry = new THREE.BoxGeometry(0.14, 0.75, 0.55);
  const fin = new THREE.Mesh(finGeometry, wingMaterial);
  fin.position.set(0, -0.4, 0.32);
  group.add(fin);

  // Fin accent edge — emissive strip along the top
  const finAccentGeometry = new THREE.BoxGeometry(0.03, 0.7, 0.04);
  const finAccent = new THREE.Mesh(finAccentGeometry, accentMaterial);
  finAccent.position.set(0, -0.42, 0.57);
  group.add(finAccent);

  // --- Armored Cockpit (layered: canopy + frame) ---
  // Low, armored slit canopy mounted on the forward deck
  const canopyGeometry = new THREE.BoxGeometry(0.28, 0.1, 0.35);
  const canopy = new THREE.Mesh(canopyGeometry, cockpitMaterial);
  canopy.position.set(0, 0.44, 0.15);
  group.add(canopy);

  // Canopy frame — dark surround
  const canopyFrameGeometry = new THREE.BoxGeometry(0.34, 0.14, 0.4);
  const canopyFrame = new THREE.Mesh(canopyFrameGeometry, darkMaterial);
  canopyFrame.position.set(0, 0.38, 0.15);
  group.add(canopyFrame);

  // --- Engine Glow Effect (layered: outer glow + inner bright core) ---
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowGeometry = new THREE.ConeGeometry(0.16, 0.4, 8);

  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.2, -1.2, 0);
  leftGlow.rotation.x = -Math.PI / 2;
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.2, -1.2, 0);
  rightGlow.rotation.x = -Math.PI / 2;
  group.add(rightGlow);

  // Inner bright cores
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe0b0,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerGlowGeometry = new THREE.ConeGeometry(0.08, 0.28, 8);

  const leftInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  leftInnerGlow.position.set(-0.2, -1.32, 0);
  leftInnerGlow.rotation.x = -Math.PI / 2;
  group.add(leftInnerGlow);

  const rightInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  rightInnerGlow.position.set(0.2, -1.32, 0);
  rightInnerGlow.rotation.x = -Math.PI / 2;
  group.add(rightInnerGlow);

  // Store glow meshes for pulse animation via userData
  group.userData = {
    leftGlow,
    rightGlow,
  };

  return group;
}