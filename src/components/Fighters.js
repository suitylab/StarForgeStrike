import * as THREE from 'three';
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
export function buildPhantom() {
    const group = new THREE.Group();
    // --- Materials ---
    // Dark violet for the main body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a2a4a,
        metalness: 0.8,
        roughness: 0.3,
    });
    // Darker violet for wings
    const wingMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a1a3a,
        metalness: 0.8,
        roughness: 0.4,
    });
    // Dark accent material for panel lines and details
    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a102a,
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
        0.2, 0.2, 0,
        1.4, -0.4, 0,
        0.2, -0.4, 0,
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
        // Right wing underside
        0.18, 0.18, -0.08,
        1.35, -0.38, -0.08,
        0.18, -0.38, -0.08,
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
 * The TITAN is a heavy assault craft with:
 *   - Broad, bulky fuselage with thick armor plating
 *   - Wide rectangular wings extending straight out
 *   - Orange/amber color scheme with bronze body
 *   - Twin large engine nacelles with orange exhaust glow
 *   - Armored cockpit with orange canopy glow
 *   - Additional armor plates on the wings
 *
 * The fighter faces upward: nose points toward +Y.
 *
 * @returns {THREE.Group} A configured TITAN fighter mesh group
 */
export function buildTitan() {
    const group = new THREE.Group();
    // --- Materials ---
    // Dark bronze for the main body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3a2a,
        metalness: 0.8,
        roughness: 0.35,
    });
    // Darker bronze for wings
    const wingMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        metalness: 0.8,
        roughness: 0.4,
    });
    // Dark accent material for panel lines and details
    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a1a0a,
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
    // Amber accent material for wingtip lights and details
    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.2,
    });
    // --- Main Fuselage (layered: wide body + central spine + side armor) ---
    // TITAN has a wider, bulkier fuselage than the other fighters
    const fuselageGeometry = new THREE.BoxGeometry(0.7, 1.3, 0.7);
    const fuselage = new THREE.Mesh(fuselageGeometry, bodyMaterial);
    group.add(fuselage);
    // Central spine — raised ridge along the top
    const spineGeometry = new THREE.BoxGeometry(0.18, 1.35, 0.18);
    const spine = new THREE.Mesh(spineGeometry, darkMaterial);
    spine.position.set(0, 0, 0.28);
    group.add(spine);
    // Side armor plates — thick angled plates on the fuselage
    const panelGeometry = new THREE.BoxGeometry(0.1, 0.9, 0.5);
    const leftPanel = new THREE.Mesh(panelGeometry, darkMaterial);
    leftPanel.position.set(-0.38, 0, 0);
    leftPanel.rotation.z = 0.15;
    group.add(leftPanel);
    const rightPanel = new THREE.Mesh(panelGeometry, darkMaterial);
    rightPanel.position.set(0.38, 0, 0);
    rightPanel.rotation.z = -0.15;
    group.add(rightPanel);
    // --- Nose (layered: wide cone + tip + accent) ---
    const noseGeometry = new THREE.ConeGeometry(0.35, 0.55, 4);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.set(0, 0.9, 0);
    nose.rotation.z = Math.PI / 4;
    group.add(nose);
    // Nose tip — small bright accent
    const noseTipGeometry = new THREE.ConeGeometry(0.1, 0.18, 4);
    const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
    noseTip.position.set(0, 1.2, 0);
    noseTip.rotation.z = Math.PI / 4;
    group.add(noseTip);
    // --- Heavy Swept Wings (layered: main wing + under-panel + wingtip light) ---
    // TITAN has wider, thicker wings than the other fighters
    const wingGeometry = new THREE.BoxGeometry(1.0, 0.12, 0.35);
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.75, -0.1, 0);
    leftWing.rotation.z = 0.25;
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.75, -0.1, 0);
    rightWing.rotation.z = -0.25;
    group.add(rightWing);
    // Wing underside panels — darker layer beneath
    const underWingGeometry = new THREE.BoxGeometry(0.9, 0.05, 0.3);
    const leftUnderWing = new THREE.Mesh(underWingGeometry, darkMaterial);
    leftUnderWing.position.set(-0.72, -0.16, 0);
    leftUnderWing.rotation.z = 0.25;
    group.add(leftUnderWing);
    const rightUnderWing = new THREE.Mesh(underWingGeometry, darkMaterial);
    rightUnderWing.position.set(0.72, -0.16, 0);
    rightUnderWing.rotation.z = -0.25;
    group.add(rightUnderWing);
    // Wingtip accent lights — small emissive spheres
    const wingtipGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const leftWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
    leftWingtip.position.set(-1.2, -0.15, 0);
    group.add(leftWingtip);
    const rightWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
    rightWingtip.position.set(1.2, -0.15, 0);
    group.add(rightWingtip);
    // Wing accent strips — emissive lines along wing edges
    const accentStripGeometry = new THREE.BoxGeometry(0.05, 0.55, 0.05);
    const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
    leftAccent.position.set(-1.0, -0.05, 0.15);
    leftAccent.rotation.z = 0.25;
    group.add(leftAccent);
    const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
    rightAccent.position.set(1.0, -0.05, 0.15);
    rightAccent.rotation.z = -0.25;
    group.add(rightAccent);
    // --- Twin Heavy Engine Nacelles (layered: nacelle + intake ring + exhaust + glow) ---
    // TITAN has larger, more powerful engines
    const nacelleGeometry = new THREE.CylinderGeometry(0.2, 0.22, 0.65, 8);
    const leftNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
    leftNacelle.position.set(-0.25, -0.8, 0);
    leftNacelle.rotation.x = Math.PI / 2;
    group.add(leftNacelle);
    const rightNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
    rightNacelle.position.set(0.25, -0.8, 0);
    rightNacelle.rotation.x = Math.PI / 2;
    group.add(rightNacelle);
    // Nacelle intake rings — darker rings at the front
    const intakeGeometry = new THREE.TorusGeometry(0.2, 0.04, 6, 12);
    const leftIntake = new THREE.Mesh(intakeGeometry, darkMaterial);
    leftIntake.position.set(-0.25, -0.48, 0);
    leftIntake.rotation.x = Math.PI / 2;
    group.add(leftIntake);
    const rightIntake = new THREE.Mesh(intakeGeometry, darkMaterial);
    rightIntake.position.set(0.25, -0.48, 0);
    rightIntake.rotation.x = Math.PI / 2;
    group.add(rightIntake);
    // Exhaust ports — amber emissive discs
    const exhaustGeometry = new THREE.CircleGeometry(0.16, 8);
    const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    leftExhaust.position.set(-0.25, -1.12, 0);
    leftExhaust.rotation.x = Math.PI / 2;
    group.add(leftExhaust);
    const rightExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    rightExhaust.position.set(0.25, -1.12, 0);
    rightExhaust.rotation.x = Math.PI / 2;
    group.add(rightExhaust);
    // --- Cockpit Canopy (layered: base + frame) ---
    const canopyGeometry = new THREE.ConeGeometry(0.2, 0.3, 8);
    const canopy = new THREE.Mesh(canopyGeometry, cockpitMaterial);
    canopy.position.set(0, 0.55, 0.15);
    group.add(canopy);
    // Canopy frame — darker ring around the base
    const canopyFrameGeometry = new THREE.TorusGeometry(0.18, 0.025, 6, 12);
    const canopyFrame = new THREE.Mesh(canopyFrameGeometry, darkMaterial);
    canopyFrame.position.set(0, 0.42, 0.15);
    canopyFrame.rotation.x = Math.PI / 2;
    group.add(canopyFrame);
    // --- Twin Vertical Stabilizers (layered: fin + accent edge) ---
    const finGeometry = new THREE.BoxGeometry(0.08, 0.5, 0.35);
    const leftFin = new THREE.Mesh(finGeometry, wingMaterial);
    leftFin.position.set(-0.3, -0.35, 0.2);
    leftFin.rotation.z = 0.25;
    group.add(leftFin);
    const rightFin = new THREE.Mesh(finGeometry, wingMaterial);
    rightFin.position.set(0.3, -0.35, 0.2);
    rightFin.rotation.z = -0.25;
    group.add(rightFin);
    // Fin accent edges — emissive strips on the stabilizers
    const finAccentGeometry = new THREE.BoxGeometry(0.03, 0.4, 0.03);
    const leftFinAccent = new THREE.Mesh(finAccentGeometry, accentMaterial);
    leftFinAccent.position.set(-0.33, -0.35, 0.35);
    leftFinAccent.rotation.z = 0.25;
    group.add(leftFinAccent);
    const rightFinAccent = new THREE.Mesh(finAccentGeometry, accentMaterial);
    rightFinAccent.position.set(0.33, -0.35, 0.35);
    rightFinAccent.rotation.z = -0.25;
    group.add(rightFinAccent);
    // --- Engine Glow Effect (layered: outer glow + inner bright core) ---
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const glowGeometry = new THREE.ConeGeometry(0.14, 0.35, 8);
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    leftGlow.position.set(-0.25, -1.28, 0);
    leftGlow.rotation.x = -Math.PI / 2;
    group.add(leftGlow);
    const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    rightGlow.position.set(0.25, -1.28, 0);
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
    const innerGlowGeometry = new THREE.ConeGeometry(0.07, 0.25, 8);
    const leftInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    leftInnerGlow.position.set(-0.25, -1.4, 0);
    leftInnerGlow.rotation.x = -Math.PI / 2;
    group.add(leftInnerGlow);
    const rightInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    rightInnerGlow.position.set(0.25, -1.4, 0);
    rightInnerGlow.rotation.x = -Math.PI / 2;
    group.add(rightInnerGlow);
    // Store glow meshes for pulse animation via userData
    group.userData = {
        leftGlow,
        rightGlow,
    };
    return group;
}
