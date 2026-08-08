/**
 * 3D Boiler Tube Panel Visualizer
 * Core WebGL Application using Three.js
 */

// Application State
const state = {
  // Tubes
  numTubes: 54,
  tubeOD: 32,        // mm
  tubeThickness: 6,   // mm
  pitch: 46,         // mm
  
  // Panel Lengths
  lenOuter: 12.0,    // m (Panel 1 & 3)
  lenCentre: 10.0,    // m (Panel 2)
  
  // Fin Plates
  finThick: 6.0,     // mm (internal)
  joinThick: 14.0,   // mm (between panels)
  
  // Headers & Bends
  headerOD: 250,     // Headers & Bends
  headerOffset: 400, // mm (Z-shift)
  centerInletAngle: 45, // 45 or 90 degrees
  
  // Visualization
  exploded: 0,       // 0 to 100 (%)
  renderMode: 'solid', // 'solid', 'xray', 'wireframe'
  qualityMode: 'high', // 'low', 'medium', 'high'
  showDimensions: true,
  showLabels: true,
  rotateModel180: false,
  lightDirection: 'default',
  showRoof: true,
  showLTRH: true,
  showWaterWall: true,
  ltrhOD: 50,
  ltrhPitch: 100,
  rulerActive: false
};

// Constant Material Colors
const COLORS = {
  tube: 0x10b981,      // Green (P4-6, P13-15)
  tubePink: 0xec4899,  // Pink  (P1-3, P16-18)
  tubeBrown: 0x8b5a2b, // Brown (P7-12)
  tubeInner: 0x60a5fa, // Light Blue (Fluid)
  tubeRoof: 0x06b6d4,  // Cyan  (Roof panels)
  ltrh: 0xa855f7,      // Purple (LTRH coils)
  fin: 0xf59e0b,       // Yellow
  header: 0x2563eb,    // Blue
  highlight: 0xef4444, // Red
  dimension: 0xe2e8f0, // Slate Light
  background: 0x090d16 // Deep Dark
};

// Interactive Ruler Globals
let rulerPoints = [];
let rulerVisualObjects = [];

// Helper to retrieve quality settings for geometries based on detail mode
function getGeometryQuality() {
  const mode = state.qualityMode || 'high';
  if (mode === 'low') {
    return {
      cylTube: 6,
      cylHeader: 6,
      cylHanger: 5,
      tubeBentRadial: 6,
      tubeBentSamplesLow: 20,
      tubeBentSamplesHigh: 100,
      tubeRoofRadial: 6,
      tubeRoofSamples: 16,
      tubeLtrhRadial: 5,
      tubeLtrhSamples: 50
    };
  } else if (mode === 'medium') {
    return {
      cylTube: 10,
      cylHeader: 10,
      cylHanger: 6,
      tubeBentRadial: 8,
      tubeBentSamplesLow: 40,
      tubeBentSamplesHigh: 200,
      tubeRoofRadial: 8,
      tubeRoofSamples: 32,
      tubeLtrhRadial: 6,
      tubeLtrhSamples: 100
    };
  } else {
    return {
      cylTube: 16,
      cylHeader: 16,
      cylHanger: 8,
      tubeBentRadial: 16,
      tubeBentSamplesLow: 80,
      tubeBentSamplesHigh: 400,
      tubeRoofRadial: 12,
      tubeRoofSamples: 64,
      tubeLtrhRadial: 8,
      tubeLtrhSamples: 220
    };
  }
}

// Global Three.js Variables
let scene, camera, renderer, controls;
let modelGroup;
let boilerGroup;
let panelGroups = []; // [panel1, panel2, panel3]
let rearPanelGroups = []; // [rearPanel1, rearPanel2, rearPanel3]
let roofGroup;           // Roof tube panel group
let roofPanelGroups = []; // R1-R18 per-panel groups
let ltrhGroup;           // LTRH reheater group
let joiningFinsGroup;
let dimensionsGroup;
let orientationLabelsGroup;
let gridHelper; // Global gridHelper reference for screenshot hiding
let raycaster, mouse;
let hoveredObject = null;
let originalMaterialColor = null;
let hoveredObjectOriginalMaterial = null;
let dirLight1; // Global directional light for dynamic lighting control

// Model Rotation State (for smooth clockwise animation)
let targetModelRotationZ = 0;

// Orientation Gizmo variables
let gizmoScene, gizmoCamera, gizmoRenderer, gizmoGroup;
let gizmoInteractiveObjects = [];
let targetCamPos = null;
let targetCamTarget = null;
let targetCamUp = null;
// Materials
let materials = {};

// Dynamic coordinate calculations
let tubeGlobalX = [];
let panelStartIdx = [];
let panelEndIdx = [];
let panelTubes = [];
let panelPitches = [];
let panelConfigs = [];

function getTubeGlobalX(k) {
  return tubeGlobalX[k];
}

function getPanelInfo(panelIdx) {
  const isNew = (panelIdx < 3 || panelIdx >= 15);
  return {
    numTubes: isNew ? 22 : state.numTubes,
    pitch: isNew ? 0.092 : (state.pitch / 1000),
    isNew: isNew
  };
}

function getJointPitch(seamIdx) {
  if (seamIdx === 0 || seamIdx === 1 || seamIdx === 15 || seamIdx === 16) {
    return 0.092;
  }
  if (seamIdx === 2 || seamIdx === 14) {
    return 0.046;
  }
  return state.pitch / 1000;
}

// Initialize Application on Load
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  initGizmo();
  initUI();
  buildBoilerModel();
  animate();
  
  // Hide loading screen
  setTimeout(() => {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.style.opacity = '0';
    setTimeout(() => {
      if (loader) loader.style.display = 'none';
    }, 500);
  }, 1000);
});

// Setup Three.js Environment
function initThree() {
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = null; // Transparent clear background to support transparent clipart screenshot
  scene.fog = new THREE.FogExp2(COLORS.background, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  setCameraPreset('iso');

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI; // Full 360 vertical orbit
  controls.minDistance = 2;
  controls.maxDistance = 50;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(20, 40, 20);
  dirLight1.castShadow = true;
  dirLight1.shadow.mapSize.width = 2048;
  dirLight1.shadow.mapSize.height = 2048;
  dirLight1.shadow.camera.near = 0.5;
  dirLight1.shadow.camera.far = 100;
  const d = 15;
  dirLight1.shadow.camera.left = -d;
  dirLight1.shadow.camera.right = d;
  dirLight1.shadow.camera.top = d;
  dirLight1.shadow.camera.bottom = -d;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x90caf9, 0.4); // soft blue fill
  dirLight2.position.set(-20, -10, -20);
  scene.add(dirLight2);

  // Grid Floor
  gridHelper = new THREE.GridHelper(40, 40, 0x1e293b, 0x0f172a);
  gridHelper.position.y = -8;
  scene.add(gridHelper);

  // Groups
  modelGroup = new THREE.Group();
  modelGroup.rotation.z = targetModelRotationZ;
  scene.add(modelGroup);

  boilerGroup = new THREE.Group();
  boilerGroup.name = 'Boiler Panels';
  modelGroup.add(boilerGroup);
  
  joiningFinsGroup = new THREE.Group();
  boilerGroup.add(joiningFinsGroup);

  // Roof group (independent of front wall, added to modelGroup)
  roofGroup = new THREE.Group();
  roofGroup.name = 'Roof';
  modelGroup.add(roofGroup);

  // LTRH group (independent, added to modelGroup)
  ltrhGroup = new THREE.Group();
  ltrhGroup.name = 'LTRH';
  modelGroup.add(ltrhGroup);

  dimensionsGroup = new THREE.Group();
  dimensionsGroup.rotation.z = targetModelRotationZ;
  scene.add(dimensionsGroup);

  orientationLabelsGroup = new THREE.Group();
  scene.add(orientationLabelsGroup);

  // Raycasting
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  // Event Listeners
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  
  // Initialize Materials
  initMaterials();

  // Expose core variables on window for testing & verification scripts
  window.renderer = renderer;
  window.scene = scene;
  window.camera = camera;
  window.controls = controls;
  window.ltrhGroup = ltrhGroup;
}

// Setup Materials based on Render Mode
function initMaterials() {
  materials.tube = new THREE.MeshStandardMaterial({
    color: COLORS.tube,
    roughness: 0.3,
    metalness: 0.8,
    name: 'Tube Material'
  });
  
  materials.tubeInner = new THREE.MeshStandardMaterial({
    color: COLORS.tubeInner,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
    name: 'Fluid Material',
    emissive: COLORS.tubeInner,
    emissiveIntensity: 0.3
  });

  materials.fin = new THREE.MeshStandardMaterial({
    color: COLORS.fin,
    roughness: 0.5,
    metalness: 0.5,
    name: 'Fin Material'
  });

  materials.header = new THREE.MeshStandardMaterial({
    color: COLORS.header,
    roughness: 0.2,
    metalness: 0.85,
    name: 'Header Material'
  });

  materials.tubePink = new THREE.MeshStandardMaterial({
    color: COLORS.tubePink,
    roughness: 0.3,
    metalness: 0.8,
    name: 'Pink Tube Material'
  });

  materials.tubeBrown = new THREE.MeshStandardMaterial({
    color: COLORS.tubeBrown,
    roughness: 0.4,
    metalness: 0.6,
    name: 'Brown Tube Material'
  });

  materials.tubeRoof = new THREE.MeshStandardMaterial({
    color: COLORS.tubeRoof,
    roughness: 0.25,
    metalness: 0.85,
    name: 'Roof Tube Material'
  });

  materials.ltrh = new THREE.MeshStandardMaterial({
    color: COLORS.ltrh,
    roughness: 0.3,
    metalness: 0.8,
    name: 'LTRH Tube Material'
  });

  updateMaterialsForMode();
}

function updateMaterialsForMode() {
  const tubeMats = [materials.tube, materials.tubePink, materials.tubeBrown, materials.tubeRoof, materials.ltrh];
  if (state.renderMode === 'solid') {
    tubeMats.forEach(m => { if (m) { m.transparent = false; m.opacity = 1.0; m.wireframe = false; } });
    materials.fin.transparent = false;
    materials.fin.opacity = 1.0;
    materials.fin.wireframe = false;
    materials.header.transparent = false;
    materials.header.opacity = 1.0;
    materials.header.wireframe = false;
  } else if (state.renderMode === 'xray') {
    tubeMats.forEach(m => { if (m) { m.transparent = true; m.opacity = 0.25; m.wireframe = false; } });
    materials.fin.transparent = true;
    materials.fin.opacity = 0.15;
    materials.fin.wireframe = false;
    materials.header.transparent = true;
    materials.header.opacity = 0.3;
    materials.header.wireframe = false;
  } else if (state.renderMode === 'wireframe') {
    tubeMats.forEach(m => { if (m) { m.transparent = false; m.opacity = 1.0; m.wireframe = true; } });
    materials.fin.transparent = false;
    materials.fin.opacity = 1.0;
    materials.fin.wireframe = true;
    materials.header.transparent = false;
    materials.header.opacity = 1.0;
    materials.header.wireframe = true;
  }
  // Force all tube/fin/header materials to update on next render
  [materials.tube, materials.tubePink, materials.tubeBrown, materials.tubeRoof, materials.fin, materials.header, materials.ltrh].forEach(m => {
    if (m) m.needsUpdate = true;
  });
}

// Build the Entire Boiler Model
function buildBoilerModel() {
  // Clear previous models
  panelGroups.forEach(g => {
    disposeHierarchy(g);
    boilerGroup.remove(g);
  });
  panelGroups = [];
  
  rearPanelGroups.forEach(g => {
    disposeHierarchy(g);
    boilerGroup.remove(g);
  });
  rearPanelGroups = [];
  
  // Clear rear joining fins
  const oldRearFins = boilerGroup.getObjectByName("Rear Joining Fins");
  if (oldRearFins) {
    disposeHierarchy(oldRearFins);
    boilerGroup.remove(oldRearFins);
  }
  
  // Clear joining fins
  while(joiningFinsGroup.children.length > 0){
    const obj = joiningFinsGroup.children[0];
    disposeHierarchy(obj);
    joiningFinsGroup.remove(obj);
  }
  
  // Clear dimensions
  clearDimensions();
  clearOrientationLabels();

  // Get geometry quality settings
  const q = getGeometryQuality();

  // Convert mm to meters for calculations
  const tubeOD = state.tubeOD / 1000;
  const pitch = state.pitch / 1000;
  const finThick = state.finThick / 1000;
  const joinThick = state.joinThick / 1000;
  const headerOD = state.headerOD / 1000;
  const headerOffset = state.headerOffset / 1000;
  
  // Precompute tube coordinates and panel start/end indices
  tubeGlobalX = [];
  panelStartIdx = [];
  panelEndIdx = [];
  panelTubes = [];
  panelPitches = [];
  
  let tempX = [];
  let currentX = 0;
  for (let p = 0; p < 18; p++) {
    const info = getPanelInfo(p);
    panelTubes.push(info.numTubes);
    panelPitches.push(info.pitch);
    panelStartIdx.push(tempX.length);
    for (let i = 0; i < info.numTubes; i++) {
      tempX.push(currentX);
      if (i < info.numTubes - 1) {
        currentX += info.pitch;
      }
    }
    panelEndIdx.push(tempX.length - 1);
    if (p < 17) {
      currentX += getJointPitch(p);
    }
  }
  const minX = tempX[0];
  const maxX = tempX[tempX.length - 1];
  const centerX = (minX + maxX) / 2;
  tubeGlobalX = tempX.map(x => x - centerX);
  
  const totalTubes = tubeGlobalX.length;
  
  // Spacing helper: returns X coordinate for global tube index k (0 to totalTubes-1)
  const getTubeGlobalX = (k) => {
    return tubeGlobalX[k];
  };

  // Build 18 panels dynamically
  panelConfigs = [];
  
  for (let p = 1; p <= 18; p++) {
    const isCenter = (p === 2 || p === 5 || p === 8 || p === 11 || p === 14 || p === 17);
    let length, topY, botY;
    let colorMaterial;
    
    // Top separation offset is constant at 0.5m (splits 0.5m below connection)
    const splitOffset = 0.5;
    
    const info = getPanelInfo(p - 1);
    
    if (info.isNew) {
      // Panels 1-3 and 16-18 → Pink
      colorMaterial = materials.tubePink;
      if (p === 2 || p === 17) {
        botY = -21.2; // EL. 62.8 m
        topY = state.lenOuter / 2 - splitOffset; // 5.5 m (EL. 89.5 m)
      } else {
        botY = -20.8; // EL. 63.2 m
        topY = state.lenOuter / 2; // 6.0 m (EL. 90.0 m)
      }
    } else {
      const origP = p - 3; // 1-based original panel number (1-12)
      // origP 1-3 and 10-12 → Green; origP 4-9 → Brown
      if (origP <= 3 || origP >= 10) {
        colorMaterial = materials.tube; // Green
      } else {
        colorMaterial = materials.tubeBrown; // Brown
      }
      if (origP <= 3 || origP >= 10) {
        if (origP === 2 || origP === 11) {
          botY = state.lenOuter / 2 - state.lenCentre;
          topY = state.lenOuter / 2 - splitOffset;
        } else {
          botY = -state.lenOuter / 2;
          topY = state.lenOuter / 2;
        }
      } else {
        botY = state.lenOuter / 2 - 40.0; // -34.0 (EL. 50.0 m)
        if (isCenter) {
          topY = state.lenOuter / 2 - splitOffset;
        } else {
          topY = state.lenOuter / 2;
        }
      }
    }
    length = topY - botY;
    
    panelConfigs.push({
      name: `Panel ${p}`,
      startIndex: panelStartIdx[p - 1],
      numTubes: panelTubes[p - 1],
      pitch: panelPitches[p - 1],
      gap: panelPitches[p - 1] - tubeOD,
      length: length,
      topY: topY,
      botY: botY,
      isCenter: isCenter,
      colorMaterial: colorMaterial
    });
    console.log(`Panel ${p} (${info.isNew ? 'new' : 'orig'}) → ${colorMaterial ? colorMaterial.name : 'UNDEFINED'}`);
  }

  panelConfigs.forEach((cfg, panelIdx) => {
    const panelGroup = new THREE.Group();
    panelGroup.name = cfg.name;
    
    const N = cfg.numTubes;
    const pitch = cfg.pitch;
    const gap = cfg.gap;
    
    const tubesSubGroup = new THREE.Group();
    tubesSubGroup.name = "Tubes";
    const finsSubGroup = new THREE.Group();
    finsSubGroup.name = "Fins";
    const headersSubGroup = new THREE.Group();
    headersSubGroup.name = "Headers & Bends";
    
    panelGroup.add(tubesSubGroup);
    panelGroup.add(finsSubGroup);
    panelGroup.add(headersSubGroup);
    
    // Width of this panel
    const pStartX = getTubeGlobalX(cfg.startIndex);
    const pEndX = getTubeGlobalX(cfg.startIndex + N - 1);
    const pCenterX = (pStartX + pEndX) / 2;
    const panelWidth = pEndX - pStartX + tubeOD;
    
    // Y-center of the straight section
    const centerY = (cfg.topY + cfg.botY) / 2;
    
    // --- 1. Tubes & Internal Fins ---
    const mid = Math.floor(N / 2);
    
    for (let i = 0; i < N; i++) {
      const globalK = cfg.startIndex + i;
      const x = getTubeGlobalX(globalK);
      const localX = x - pCenterX; // center panel group on its own X center
      
      const activeOpenings = getTubeOpenings(panelIdx, i);
      
      if (activeOpenings.length > 0) {
        // Bent Tube around Openings
        const pathPoints = getCustomTubePath(localX, cfg.botY, cfg.topY, activeOpenings, i, panelIdx);
        const curve = new THREE.CatmullRomCurve3(pathPoints);
        
        const numSamples = activeOpenings.length > 2 ? q.tubeBentSamplesHigh : q.tubeBentSamplesLow;
        const tubeGeom = new THREE.TubeGeometry(curve, numSamples, tubeOD/2, q.tubeBentRadial, false);
        const tubeMesh = new THREE.Mesh(tubeGeom, cfg.colorMaterial);
        tubeMesh.castShadow = true;
        tubeMesh.receiveShadow = true;
        
        const hasManhole = activeOpenings.some(op => op.type === 'manhole');
        const bypassType = hasManhole ? 'Tube (Manhole Bypass)' : 'Tube (Peep Hole Bypass)';
        const addedLength = hasManhole ? (0.08 * activeOpenings.filter(op => op.type === 'manhole').length + 0.02 * activeOpenings.filter(op => op.type === 'peephole').length) : (0.02 * activeOpenings.length);
        
        tubeMesh.userData = {
          type: bypassType,
          panel: cfg.name,
          id: i + 1,
          od: state.tubeOD,
          thickness: state.tubeThickness,
          length: (cfg.length + addedLength).toFixed(1) + ' m (bent)'
        };
        tubesSubGroup.add(tubeMesh);
        
        // Inner Fluid Tube (for X-ray mode)
        if (state.renderMode === 'xray') {
          const innerRad = (state.tubeOD/2 - state.tubeThickness) / 1000;
          if (innerRad > 0) {
            const innerGeom = new THREE.TubeGeometry(curve, numSamples, innerRad, Math.max(4, Math.floor(q.tubeBentRadial / 2)), false);
            const innerMesh = new THREE.Mesh(innerGeom, materials.tubeInner);
            tubesSubGroup.add(innerMesh);
          }
        }
      } else {
        // Straight Tube
        const tubeGeom = new THREE.CylinderGeometry(tubeOD/2, tubeOD/2, cfg.length, q.cylTube, 1);
        const tubeMesh = new THREE.Mesh(tubeGeom, cfg.colorMaterial);
        tubeMesh.position.set(localX, centerY, 0);
        tubeMesh.castShadow = true;
        tubeMesh.receiveShadow = true;
        
        tubeMesh.userData = {
          type: 'Tube',
          panel: cfg.name,
          id: i + 1,
          od: state.tubeOD,
          thickness: state.tubeThickness,
          length: cfg.length.toFixed(1) + ' m'
        };
        tubesSubGroup.add(tubeMesh);

        // Inner Fluid Tube (for X-ray mode)
        if (state.renderMode === 'xray') {
          const innerRad = (state.tubeOD/2 - state.tubeThickness) / 1000;
          if (innerRad > 0) {
            const innerGeom = new THREE.CylinderGeometry(innerRad, innerRad, cfg.length, Math.max(4, Math.floor(q.cylTube / 2)), 1);
            const innerMesh = new THREE.Mesh(innerGeom, materials.tubeInner);
            innerMesh.position.set(localX, centerY, 0);
            tubesSubGroup.add(innerMesh);
          }
        }
      }
      
      // Internal Fins (only up to N-1 gaps)
      if (i < N - 1) {
        const nextX = getTubeGlobalX(globalK + 1);
        const finX = (x + nextX) / 2 - pCenterX;
        
        const activeFinOpenings = getFinOpenings(panelIdx, i);
        
        if (activeFinOpenings.length > 0) {
          // Sort openings by y ascending
          const sortedOpenings = [...activeFinOpenings].sort((a, b) => a.y - b.y);
          
          let currentY = cfg.botY;
          sortedOpenings.forEach(op => {
            const hBend = (op.type === 'manhole') ? 0.45 : 0.20;
            const finLenBottom = (op.y - hBend) - currentY;
            const centerYBottom = (currentY + (op.y - hBend)) / 2;
            
            if (finLenBottom > 0.05) {
              const finGeomBottom = new THREE.BoxGeometry(gap, finLenBottom, finThick);
              const finMeshBottom = new THREE.Mesh(finGeomBottom, materials.fin);
              finMeshBottom.position.set(finX, centerYBottom, 0);
              finMeshBottom.castShadow = true;
              finMeshBottom.receiveShadow = true;
              finMeshBottom.userData = {
                type: 'Fin Plate (Internal - Split)',
                panel: cfg.name,
                id: i + 1,
                width: (gap * 1000).toFixed(0) + ' mm',
                thickness: state.finThick + ' mm',
                length: finLenBottom.toFixed(2) + ' m'
              };
              finsSubGroup.add(finMeshBottom);
            }
            currentY = op.y + hBend;
          });
          
          const finLenTop = cfg.topY - currentY;
          const centerYTop = (currentY + cfg.topY) / 2;
          
          if (finLenTop > 0.05) {
            const finGeomTop = new THREE.BoxGeometry(gap, finLenTop, finThick);
            const finMeshTop = new THREE.Mesh(finGeomTop, materials.fin);
            finMeshTop.position.set(finX, centerYTop, 0);
            finMeshTop.castShadow = true;
            finMeshTop.receiveShadow = true;
            finMeshTop.userData = {
              type: 'Fin Plate (Internal - Split)',
              panel: cfg.name,
              id: i + 1,
              width: (gap * 1000).toFixed(0) + ' mm',
              thickness: state.finThick + ' mm',
              length: finLenTop.toFixed(2) + ' m'
            };
            finsSubGroup.add(finMeshTop);
          }
        } else {
          // Standard Fin
          const finGeom = new THREE.BoxGeometry(gap, cfg.length, finThick);
          const finMesh = new THREE.Mesh(finGeom, materials.fin);
          finMesh.position.set(finX, centerY, 0);
          finMesh.castShadow = true;
          finMesh.receiveShadow = true;
          finMesh.userData = {
            type: 'Fin Plate (Internal)',
            panel: cfg.name,
            id: i + 1,
            width: (gap * 1000).toFixed(0) + ' mm',
            thickness: state.finThick + ' mm',
            length: cfg.length.toFixed(1) + ' m'
          };
          finsSubGroup.add(finMesh);
        }
      }
    }

    // Add Sleeves dynamically for this panel
    const panelOpenings = getPanelOpenings(panelIdx);
    panelOpenings.forEach(op => {
      let localOpCenterX = 0;
      if (op.startTube !== undefined && op.numTubes !== undefined) {
        const leftStart = op.startTube - 1;
        const rightEnd = leftStart + op.numTubes - 1;
        localOpCenterX = ( (leftStart + rightEnd) / 2 - (N - 1) / 2 ) * pitch;
      }

      if (op.type === 'manhole') {
        const sleeveRadius = 0.275; // 550mm Diameter
        const sleeveThickness = 0.010; // 10mm
        const sleeveDepth = 0.120; // 120mm
        
        const sleeveShape = new THREE.Shape();
        sleeveShape.absarc(0, 0, sleeveRadius, 0, Math.PI * 2, false);
        
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, sleeveRadius - sleeveThickness, 0, Math.PI * 2, true);
        sleeveShape.holes.push(holePath);
        
        const extrudeSettings = {
          depth: sleeveDepth,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.002,
          bevelThickness: 0.002
        };
        
        const sleeveGeom = new THREE.ExtrudeGeometry(sleeveShape, extrudeSettings);
        sleeveGeom.center();
        
        const sleeveMesh = new THREE.Mesh(sleeveGeom, materials.header);
        sleeveMesh.position.set(localOpCenterX, op.y, 0);
        sleeveMesh.castShadow = true;
        sleeveMesh.receiveShadow = true;
        
        sleeveMesh.userData = {
          type: 'Manhole Sleeve',
          panel: cfg.name,
          diameter: (sleeveRadius * 2 * 1000).toFixed(0) + ' mm',
          depth: (sleeveDepth * 1000).toFixed(0) + ' mm',
          location: `EL. ${op.elev.toFixed(1)} m`
        };
        
        tubesSubGroup.add(sleeveMesh);
      } else if (op.type === 'peephole') {
        const sleeveRadius = 0.050; // 100mm Diameter
        const sleeveThickness = 0.010; // 10mm
        const sleeveDepth = 0.120; // 120mm
        
        const sleeveShape = new THREE.Shape();
        sleeveShape.absarc(0, 0, sleeveRadius, 0, Math.PI * 2, false);
        
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, sleeveRadius - sleeveThickness, 0, Math.PI * 2, true);
        sleeveShape.holes.push(holePath);
        
        const extrudeSettings = {
          depth: sleeveDepth,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.002,
          bevelThickness: 0.002
        };
        
        const sleeveGeom = new THREE.ExtrudeGeometry(sleeveShape, extrudeSettings);
        sleeveGeom.center();
        
        const sleeveMesh = new THREE.Mesh(sleeveGeom, materials.header);
        sleeveMesh.position.set(localOpCenterX, op.y, 0);
        sleeveMesh.castShadow = true;
        sleeveMesh.receiveShadow = true;
        
        sleeveMesh.userData = {
          type: 'Peep Hole Sleeve',
          panel: cfg.name,
          diameter: (sleeveRadius * 2 * 1000).toFixed(0) + ' mm',
          depth: (sleeveDepth * 1000).toFixed(0) + ' mm',
          location: `EL. ${op.elev.toFixed(1)} m`
        };
        
        tubesSubGroup.add(sleeveMesh);
      }
    });
    
    // --- 2. Headers & Bends ---
    const headerLen = panelWidth + 0.200; // 100mm extension on both sides
    const R_h = headerOD / 2;
    const R_b = 0.100;
    
    // Top (Outlet) Header
    const topStraightEnd = cfg.topY;
    const topHeaderY = state.lenOuter / 2 + R_b; // Aligned at 90m elevation (6.1m local)
    const topHeaderZ = cfg.isCenter ? -headerOffset : headerOffset; // Center headers are in the back plane
    
    // Bottom (Inlet) Header
    const botStraightEnd = cfg.botY;
    const botHeaderY = botStraightEnd - R_b;
    const botHeaderZ = headerOffset;
    
    // Create Header Meshes
    // Outlet (Top) Header
    const topHeaderGeom = new THREE.CylinderGeometry(R_h, R_h, headerLen, q.cylHeader, 1);
    const topHeader = new THREE.Mesh(topHeaderGeom, materials.header);
    topHeader.rotation.z = Math.PI / 2;
    topHeader.position.set(0, topHeaderY, topHeaderZ);
    topHeader.castShadow = true;
    topHeader.userData = {
      type: 'Outlet Header',
      panel: cfg.name,
      od: state.headerOD,
      length: (headerLen * 1000).toFixed(0) + ' mm',
      offsetZ: (topHeaderZ * 1000).toFixed(0) + ' mm',
      connectionAngle: cfg.isCenter ? (state.centerInletAngle === 45 ? '45° Bends (Split Back)' : '90° Offset Bends (Split Back)') : '90° Bends'
    };
    headersSubGroup.add(topHeader);
    
    // Inlet (Bottom) Header
    const botHeaderGeom = new THREE.CylinderGeometry(R_h, R_h, headerLen, q.cylHeader, 1);
    const botHeader = new THREE.Mesh(botHeaderGeom, materials.header);
    botHeader.rotation.z = Math.PI / 2;
    botHeader.position.set(0, botHeaderY, botHeaderZ);
    botHeader.castShadow = true;
    botHeader.userData = {
      type: 'Inlet Header',
      panel: cfg.name,
      od: state.headerOD,
      length: (headerLen * 1000).toFixed(0) + ' mm',
      offsetZ: (botHeaderZ * 1000).toFixed(0) + ' mm',
      connectionAngle: '90° Bends'
    };
    headersSubGroup.add(botHeader);
    
    // Create Bends for each tube
    const targetTopZ = topHeaderZ > 0 ? (topHeaderZ - R_h) : (topHeaderZ + R_h);
    const targetBotZ = botHeaderZ - R_h;
    
    for (let i = 0; i < N; i++) {
      const globalK = cfg.startIndex + i;
      const x = getTubeGlobalX(globalK);
      const localX = x - pCenterX;
      
      // Top Bend Path (Outlet)
      let topPathPoints;
      const isTop45 = cfg.isCenter && state.centerInletAngle === 45;
      const isTopOffset90 = cfg.isCenter && state.centerInletAngle === 90;
      
      if (isTop45) {
        topPathPoints = get45DegreePath(localX, topStraightEnd, topHeaderY, targetTopZ);
      } else if (isTopOffset90) {
        topPathPoints = getOffset90DegreePath(localX, topStraightEnd, topHeaderY, targetTopZ, true);
      } else {
        topPathPoints = get90DegreePath(localX, topStraightEnd, topHeaderY, targetTopZ, true);
      }
      
      const topCurve = new THREE.CatmullRomCurve3(topPathPoints);
      const topBendGeom = new THREE.TubeGeometry(topCurve, isTop45 ? 24 : 32, tubeOD/2, 16, false);
      const topBendMesh = new THREE.Mesh(topBendGeom, cfg.colorMaterial);
      topBendMesh.castShadow = true;
      topBendMesh.userData = {
        type: 'Outlet Bend Connect',
        panel: cfg.name,
        tubeId: i + 1,
        angle: cfg.isCenter ? (state.centerInletAngle + '°') : '90°'
      };
      headersSubGroup.add(topBendMesh);
      
      // Bottom Bend Path (Inlet)
      const botPathPoints = get90DegreePath(localX, botStraightEnd, botHeaderY, targetBotZ, false);
      const botCurve = new THREE.CatmullRomCurve3(botPathPoints);
      const botBendGeom = new THREE.TubeGeometry(botCurve, 32, tubeOD/2, 16, false);
      const botBendMesh = new THREE.Mesh(botBendGeom, cfg.colorMaterial);
      botBendMesh.castShadow = true;
      botBendMesh.userData = {
        type: 'Inlet Bend Connect',
        panel: cfg.name,
        tubeId: i + 1,
        angle: '90°'
      };
      headersSubGroup.add(botBendMesh);
      
      // Inner tubes for bends (X-ray mode)
      if (state.renderMode === 'xray') {
        const innerRad = (state.tubeOD/2 - state.tubeThickness) / 1000;
        if (innerRad > 0) {
          const topInnerBendGeom = new THREE.TubeGeometry(topCurve, 32, innerRad, 8, false);
          const topInner = new THREE.Mesh(topInnerBendGeom, materials.tubeInner);
          headersSubGroup.add(topInner);
          
          const botInnerBendGeom = new THREE.TubeGeometry(botCurve, 24, innerRad, 8, false);
          const botInner = new THREE.Mesh(botInnerBendGeom, materials.tubeInner);
          headersSubGroup.add(botInner);
        }
      }
    }
    
    // Store panel group position and metadata
    panelGroup.position.set(pCenterX, 0, 0);
    panelGroup.userData = {
      defaultX: pCenterX,
      index: panelIdx
    };
    
    panelGroups.push(panelGroup);
    boilerGroup.add(panelGroup);

    // --- Create Mirrored Rear Panel ---
    const roofTubeOD = 0.032;
    const roofPitchZ = 0.046;
    const zStartRoof = -(roofTubeOD / 2 + 0.030 + roofTubeOD / 2); // -0.062 m
    const zLastRoof = zStartRoof - 485 * roofPitchZ; // -22.372 m
    const Z_REAR = zLastRoof - (roofTubeOD / 2 + 0.030 + tubeOD / 2); // -22.443 m

    const rearPanelGroup = panelGroup.clone();
    rearPanelGroup.name = `Rear Water Wall Panel ${panelIdx + 1}`;
    rearPanelGroup.position.set(-pCenterX, 0, Z_REAR);
    rearPanelGroup.scale.set(-1, 1, -1); // inverted mirror (180 deg rotation around Y)
    
    rearPanelGroup.userData = {
      defaultX: -pCenterX,
      index: panelIdx,
      isRear: true
    };

    // Update child materials and userData recursively
    rearPanelGroup.traverse(child => {
      if (child.userData) {
        child.userData = Object.assign({}, child.userData);
        if (child.userData.panel) {
          child.userData.panel = `Rear Water Wall Panel ${panelIdx + 1}`;
        }
        if (child.userData.type) {
          if (!child.userData.type.startsWith("Rear")) {
            child.userData.type = "Rear " + child.userData.type;
          }
        }
      }
    });

    rearPanelGroups.push(rearPanelGroup);
    boilerGroup.add(rearPanelGroup);
  });
  
  // --- 3. Joining Fins Between Panels ---
  for (let j = 0; j < 17; j++) {
    const cfgLeft = panelConfigs[j];
    const cfgRight = panelConfigs[j + 1];
    
    // Find intersection span of Y coordinates
    const yStartOverlap = Math.max(cfgLeft.botY, cfgRight.botY);
    
    const xLeft = getTubeGlobalX(panelEndIdx[j]);
    const xRight = getTubeGlobalX(panelStartIdx[j + 1]);
    const jointX = (xLeft + xRight) / 2;
    const jointGap = (xRight - xLeft) - tubeOD;
    
    const seamOpenings = getSeamOpenings(j);
    
    if (seamOpenings.length > 0) {
      // Split joining fin around seam openings
      const sortedOps = [...seamOpenings].sort((a, b) => a.y - b.y);
      let currentY = yStartOverlap;
      
      sortedOps.forEach(op => {
        const hBend = 0.20; // Seam openings are peepholes (200mm bend height)
        const finLenBottom = (op.y - hBend) - currentY;
        const centerYBottom = (currentY + (op.y - hBend)) / 2;
        
        if (finLenBottom > 0.05) {
          const jointFinGeom = new THREE.BoxGeometry(jointGap, finLenBottom, joinThick);
          const jointFin = new THREE.Mesh(jointFinGeom, materials.fin);
          jointFin.position.set(jointX, centerYBottom, -0.001);
          jointFin.castShadow = true;
          jointFin.userData = {
            type: 'Joining Fin Plate (Split)',
            joint: `Panel ${j + 1} - Panel ${j + 2}`,
            width: (jointGap * 1000).toFixed(0) + ' mm',
            thickness: state.joinThick + ' mm',
            length: finLenBottom.toFixed(2) + ' m',
            defaultX: jointX,
            seamIdx: j
          };
          joiningFinsGroup.add(jointFin);
        }
        currentY = op.y + hBend;
      });
      
      const finLenTop = 5.5 - currentY;
      const centerYTop = (currentY + 5.5) / 2;
      
      if (finLenTop > 0.05) {
        const jointFinGeom = new THREE.BoxGeometry(jointGap, finLenTop, joinThick);
        const jointFin = new THREE.Mesh(jointFinGeom, materials.fin);
        jointFin.position.set(jointX, centerYTop, -0.001);
        jointFin.castShadow = true;
        jointFin.userData = {
          type: 'Joining Fin Plate (Split)',
          joint: `Panel ${j + 1} - Panel ${j + 2}`,
          width: (jointGap * 1000).toFixed(0) + ' mm',
          thickness: state.joinThick + ' mm',
          length: finLenTop.toFixed(2) + ' m',
          defaultX: jointX,
          seamIdx: j
        };
        joiningFinsGroup.add(jointFin);
      }
    } else {
      // Standard Joining Fin
      const jointLength = 5.5 - yStartOverlap;
      const jointY = (yStartOverlap + 5.5) / 2;
      const jointFinGeom = new THREE.BoxGeometry(jointGap, jointLength, joinThick);
      const jointFin = new THREE.Mesh(jointFinGeom, materials.fin);
      jointFin.position.set(jointX, jointY, -0.001);
      jointFin.castShadow = true;
      jointFin.userData = {
        type: 'Joining Fin Plate',
        joint: `Panel ${j + 1} - Panel ${j + 2}`,
        width: (jointGap * 1000).toFixed(0) + ' mm',
        thickness: state.joinThick + ' mm',
        length: jointLength.toFixed(1) + ' m',
        defaultX: jointX,
        seamIdx: j
      };
      joiningFinsGroup.add(jointFin);
    }
  }

  // --- 4. Sleeves for Seam Openings ---
  for (let j = 0; j < 17; j++) {
    const seamOpenings = getSeamOpenings(j);
    const xLeft = getTubeGlobalX(panelEndIdx[j]);
    const xRight = getTubeGlobalX(panelStartIdx[j + 1]);
    const jointX = (xLeft + xRight) / 2;
    
    seamOpenings.forEach(op => {
      if (op.type === 'peephole') {
        const sleeveRadius = 0.050; // 100mm Diameter
        const sleeveThickness = 0.010; // 10mm
        const sleeveDepth = 0.120; // 120mm
        
        const sleeveShape = new THREE.Shape();
        sleeveShape.absarc(0, 0, sleeveRadius, 0, Math.PI * 2, false);
        
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, sleeveRadius - sleeveThickness, 0, Math.PI * 2, true);
        sleeveShape.holes.push(holePath);
        
        const extrudeSettings = {
          depth: sleeveDepth,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.002,
          bevelThickness: 0.002
        };
        
        const sleeveGeom = new THREE.ExtrudeGeometry(sleeveShape, extrudeSettings);
        sleeveGeom.center();
        
        const sleeveMesh = new THREE.Mesh(sleeveGeom, materials.header);
        sleeveMesh.position.set(jointX, op.y, 0);
        sleeveMesh.castShadow = true;
        sleeveMesh.receiveShadow = true;
        
        sleeveMesh.userData = {
          type: 'Peep Hole Sleeve (Seam)',
          joint: `Panel ${j + 1} - Panel ${j + 2}`,
          diameter: (sleeveRadius * 2 * 1000).toFixed(0) + ' mm',
          depth: (sleeveDepth * 1000).toFixed(0) + ' mm',
          location: `Seam EL. ${op.elev.toFixed(1)} m`,
          defaultX: jointX,
          seamIdx: j
        };
        
        joiningFinsGroup.add(sleeveMesh);
      }
    });
  }
  
  // --- Create Mirrored Rear Joining Fins ---
  const roofTubeOD = 0.032;
  const roofPitchZ = 0.046;
  const zStartRoof = -(roofTubeOD / 2 + 0.030 + roofTubeOD / 2); // -0.062 m
  const zLastRoof = zStartRoof - 485 * roofPitchZ; // -22.372 m
  const Z_REAR = zLastRoof - (roofTubeOD / 2 + 0.030 + (state.tubeOD / 1000) / 2); // -22.443 m

  const rearJoiningFinsGroup = joiningFinsGroup.clone();
  rearJoiningFinsGroup.name = "Rear Joining Fins";
  rearJoiningFinsGroup.position.set(0, 0, Z_REAR);
  rearJoiningFinsGroup.scale.set(-1, 1, -1); // inverted mirror (180 deg rotation around Y)
  
  rearJoiningFinsGroup.traverse(child => {
    if (child.userData) {
      child.userData = Object.assign({}, child.userData);
      if (child.userData.joint) {
        child.userData.joint = child.userData.joint.replace(/Panel/g, "Rear Water Wall Panel");
      }
      if (child.userData.panel) {
        child.userData.panel = child.userData.panel.replace(/Panel/g, "Rear Water Wall Panel");
      }
      if (child.userData.type) {
        if (!child.userData.type.startsWith("Rear")) {
          child.userData.type = "Rear " + child.userData.type;
        }
      }
    }
  });
  boilerGroup.add(rearJoiningFinsGroup);
  
  applyExplodedSeparation();
  
  // Set target rotation for smooth clockwise animation
  if (state.rotateModel180) {
    targetModelRotationZ = -Math.PI;
  } else {
    // If currently near -Math.PI, transition to -2*Math.PI (continuing clockwise)
    if (modelGroup && Math.abs(modelGroup.rotation.z - (-Math.PI)) < 0.1) {
      targetModelRotationZ = -2 * Math.PI;
    } else {
      targetModelRotationZ = 0;
    }
  }
  
  if (state.showDimensions) {
    drawDimensionAnnotations();
    drawOrientationLabels();
  }
  
  calculateBOM();

  // Keep roof geometry in sync with front-wall X positions after every rebuild
  buildRoofModel();

  // Build LTRH geometry
  buildLTRHModel();

  // Re-apply user's panel visibility selections after rebuild
  restorePanelVisibility();
}

// 90-degree curve builder (supports both forward and backward Z-axis bending)
function get90DegreePath(x, yStart, yHeader, zHeader, isTop) {
  const points = [];
  const R_b = 0.100;
  const dir = isTop ? 1 : -1;
  const zSign = zHeader >= 0 ? 1 : -1;
  
  points.push(new THREE.Vector3(x, yStart, 0));
  points.push(new THREE.Vector3(x, yStart + R_b * 0.25 * dir, 0));
  points.push(new THREE.Vector3(x, yStart + R_b * 0.85 * dir, R_b * 0.4 * zSign));
  points.push(new THREE.Vector3(x, yStart + R_b * dir, R_b * zSign));
  points.push(new THREE.Vector3(x, yStart + R_b * dir, zHeader));
  
  return points;
}

// 90-degree offset curve builder (runs vertically, bends, runs horizontally to offset plane, and goes vertically to header entry)
function getOffset90DegreePath(x, yStart, yHeader, zHeader, isTop) {
  const points = [];
  const R_b = 0.100;
  const dir = isTop ? 1 : -1;
  const zSign = zHeader >= 0 ? 1 : -1;
  
  points.push(new THREE.Vector3(x, yStart, 0));
  points.push(new THREE.Vector3(x, yStart + R_b * 0.25 * dir, 0));
  points.push(new THREE.Vector3(x, yStart + R_b * 0.85 * dir, R_b * 0.4 * zSign));
  points.push(new THREE.Vector3(x, yStart + R_b * dir, R_b * zSign));
  points.push(new THREE.Vector3(x, yStart + R_b * dir, zHeader));
  points.push(new THREE.Vector3(x, yHeader, zHeader));
  
  return points;
}

// 45-degree S-bend path builder
function get45DegreePath(x, yStart, yHeader, zHeader) {
  const points = [];
  const R_b = 0.100;
  
  points.push(new THREE.Vector3(x, yStart, 0));
  const dy = yHeader - yStart;
  const dz = zHeader;
  
  points.push(new THREE.Vector3(x, yStart + dy * 0.15, dz * 0.05));
  points.push(new THREE.Vector3(x, yStart + dy * 0.5, dz * 0.35));
  points.push(new THREE.Vector3(x, yStart + dy * 0.85, dz * 0.8));
  points.push(new THREE.Vector3(x, yHeader, zHeader));
  
  return points;
}

// Dynamic Panel Openings registry
function getPanelOpenings(panelIdx) {
  const list = [];
  
  // Panel 3 (new left-side panel, panelIdx=2) – manholes at centre width
  // EL 79m→y=−5.0, EL 75m→y=−9.0, EL 71m→y=−13.0
  if (panelIdx === 2) {
    list.push({ type: 'manhole', y: -5.0,  elev: 79.0 });
    list.push({ type: 'manhole', y: -9.0,  elev: 75.0 });
    list.push({ type: 'manhole', y: -13.0, elev: 71.0 });
  }
  // Panel 16 (new right-side panel, panelIdx=15) – manholes at centre width
  if (panelIdx === 15) {
    list.push({ type: 'manhole', y: -5.0,  elev: 79.0 });
    list.push({ type: 'manhole', y: -9.0,  elev: 75.0 });
    list.push({ type: 'manhole', y: -13.0, elev: 71.0 });
  }
  // Panel 4 (originally Panel 1) manhole at EL 80m starting at tube 10, peepholes at EL 87m & 82.5m starting at tube 18
  if (panelIdx === 3) {
    list.push({ type: 'manhole', y: -4.0, elev: 80.0, startTube: 10, numTubes: 12 });
    list.push({ type: 'peephole', y: 3.0, elev: 87.0, startTube: 18, numTubes: 4 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5, startTube: 18, numTubes: 4 });
  }
  // Panel 5 (originally Panel 2) peepholes at EL 87m & 82.5m at center width
  if (panelIdx === 4) {
    list.push({ type: 'peephole', y: 3.0, elev: 87.0 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5 });
  }
  // Panel 6 (originally Panel 3) openings (manhole at EL 80m, peepholes at 79.5m, 87m & 82.5m)
  if (panelIdx === 5) {
    list.push({ type: 'manhole', y: -4.0, elev: 80.0, startTube: 6, numTubes: 12 });
    list.push({ type: 'peephole', y: -4.5, elev: 79.5, startTube: 35, numTubes: 4 });
    list.push({ type: 'peephole', y: 3.0, elev: 87.0, startTube: 32, numTubes: 4 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5, startTube: 32, numTubes: 4 });
  }
  // Panel 13 (originally Panel 10) openings (manhole at EL 80m, peepholes at 79.5m, 87m & 82.5m)
  if (panelIdx === 12) {
    list.push({ type: 'manhole', y: -4.0, elev: 80.0, startTube: 34, numTubes: 12 });
    list.push({ type: 'peephole', y: -4.5, elev: 79.5, startTube: 15, numTubes: 4 });
    list.push({ type: 'peephole', y: 3.0, elev: 87.0, startTube: 18, numTubes: 4 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5, startTube: 18, numTubes: 4 });
  }
  // Panel 14 (originally Panel 11) peepholes at EL 87m & 82.5m at center width
  if (panelIdx === 13) {
    list.push({ type: 'peephole', y: 3.0, elev: 87.0 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5 });
  }
  // Panel 15 (originally Panel 12) openings (manhole at EL 80m, peepholes at EL 87m & 82.5m)
  if (panelIdx === 14) {
    list.push({ type: 'manhole', y: -4.0, elev: 80.0, startTube: 33, numTubes: 12 });
    list.push({ type: 'peephole', y: 3.0, elev: 87.0, startTube: 32, numTubes: 4 });
    list.push({ type: 'peephole', y: -1.5, elev: 82.5, startTube: 32, numTubes: 4 });
  }
  // Panel 7 and Panel 12 (originally Panel 4 and Panel 9)
  if (panelIdx === 6 || panelIdx === 11) {
    list.push({ type: 'manhole', y: -7.0, elev: 77.0 });
    list.push({ type: 'manhole', y: -27.0, elev: 57.0 });
  }
  // Panel 8 and Panel 11 (originally Panel 5 and Panel 8)
  if (panelIdx === 7 || panelIdx === 10) {
    const elevations = [87, 82, 79, 77, 70, 67, 63, 61, 58];
    elevations.forEach(elev => {
      list.push({ type: 'peephole', y: elev - 84.0, elev: elev });
    });
  }
  
  return list;
}

// Registry for seam openings (between panels)
function getSeamOpenings(seamIdx) {
  const list = [];
  if (seamIdx === 8) { // Seam between Panel 9 and 10 (originally Panel 6 and 7)
    const elevations = [79, 70, 67, 64, 61, 58];
    elevations.forEach(elev => {
      list.push({ type: 'peephole', y: elev - 84.0, elev: elev });
    });
  }
  return list;
}

function getTubeOpenings(panelIdx, i) {
  const N = getPanelInfo(panelIdx).numTubes;
  const mid = Math.floor(N / 2);
  const list = [];
  
  // 1. Panel openings (centered or custom)
  const panelOps = getPanelOpenings(panelIdx);
  panelOps.forEach(op => {
    if (op.startTube !== undefined && op.numTubes !== undefined) {
      const startIdx = op.startTube - 1;
      const endIdx = startIdx + op.numTubes - 1;
      if (i >= startIdx && i <= endIdx) {
        list.push({ ...op, relation: 'panel' });
      }
    } else {
      if (op.type === 'manhole') {
        if (i >= mid - 6 && i <= mid + 5) {
          list.push({ ...op, relation: 'panel' });
        }
      } else {
        if (i >= mid - 2 && i <= mid + 1) {
          list.push({ ...op, relation: 'panel' });
        }
      }
    }
  });
  
  // 2. Left seam openings (seam index = panelIdx - 1)
  if (panelIdx > 0) {
    const leftSeamOps = getSeamOpenings(panelIdx - 1);
    leftSeamOps.forEach(op => {
      if (i === 0 || i === 1) {
        list.push({ ...op, relation: 'leftSeam', seamIdx: panelIdx - 1 });
      }
    });
  }
  
  // 3. Right seam openings (seam index = panelIdx)
  if (panelIdx < 17) {
    const rightSeamOps = getSeamOpenings(panelIdx);
    rightSeamOps.forEach(op => {
      if (i === N - 2 || i === N - 1) {
        list.push({ ...op, relation: 'rightSeam', seamIdx: panelIdx });
      }
    });
  }
  
  return list;
}

function getFinOpenings(panelIdx, i) {
  const N = getPanelInfo(panelIdx).numTubes;
  const mid = Math.floor(N / 2);
  const list = [];
  
  const panelOps = getPanelOpenings(panelIdx);
  panelOps.forEach(op => {
    if (op.startTube !== undefined && op.numTubes !== undefined) {
      const startIdx = op.startTube - 1;
      const endIdx = startIdx + op.numTubes - 2; // Gaps are 1 less than tubes
      if (i >= startIdx && i <= endIdx) {
        list.push({ ...op, relation: 'panel' });
      }
    } else {
      if (op.type === 'manhole') {
        if (i >= mid - 6 && i <= mid + 4) {
          list.push({ ...op, relation: 'panel' });
        }
      } else {
        if (i >= mid - 2 && i <= mid) {
          list.push({ ...op, relation: 'panel' });
        }
      }
    }
  });
  
  // Left seam openings
  if (panelIdx > 0 && i === 0) {
    const leftSeamOps = getSeamOpenings(panelIdx - 1);
    leftSeamOps.forEach(op => {
      list.push({ ...op, relation: 'leftSeam', seamIdx: panelIdx - 1 });
    });
  }
  
  // Right seam openings
  if (panelIdx < 17 && i === N - 2) {
    const rightSeamOps = getSeamOpenings(panelIdx);
    rightSeamOps.forEach(op => {
      list.push({ ...op, relation: 'rightSeam', seamIdx: panelIdx });
    });
  }
  
  return list;
}

function getCustomTubePath(localX, yStart, yEnd, activeOpenings, i, panelIdx) {
  const points = [];
  
  const tubeOD = state.tubeOD / 1000;
  const info = getPanelInfo(panelIdx);
  const pitch = info.pitch;
  const N = info.numTubes;
  const mid = Math.floor(N / 2);
  
  // Sort openings by y ascending
  const sortedOpenings = [...activeOpenings].sort((a, b) => a.y - b.y);
  const numSamples = activeOpenings.length > 2 ? 400 : 80;
  
  for (let s = 0; s <= numSamples; s++) {
    const t = s / numSamples;
    const y = yStart + t * (yEnd - yStart);
    let x = localX;
    let z = 0;
    
    // Check if y is within any opening's bypass bend
    for (let op of sortedOpenings) {
      const hBend = (op.type === 'manhole') ? 0.45 : 0.20;
      const dy = y - op.y;
      
      if (Math.abs(dy) < hBend) {
        const u = dy / hBend; // -1 to 1
        const zPower = 2;
        const xPower = 2;
        
        let x_throat, z_throat;
        if (op.relation === 'panel') {
          if (op.type === 'manhole') {
            const R_m = 0.275;
            const clearance = 0.015;
            const S = 0.034;
            const zBase = 0.18;
            const zStep = 0.02;
            
            let leftStart = mid - 6;
            let rightEnd = mid + 5;
            if (op.startTube !== undefined && op.numTubes !== undefined) {
              leftStart = op.startTube - 1;
              rightEnd = leftStart + op.numTubes - 1;
            }
            
            const midOp = leftStart + 6;
            let localOpCenterX = 0;
            if (op.startTube !== undefined && op.numTubes !== undefined) {
              localOpCenterX = ((leftStart + rightEnd) / 2 - (N - 1) / 2) * pitch;
            }
            
            if (i < midOp) {
              const j = i - leftStart;
              x_throat = localOpCenterX - (R_m + clearance + tubeOD/2 + (5 - j) * S);
              z_throat = zBase + (5 - j) * zStep;
            } else {
              const j = rightEnd - i;
              x_throat = localOpCenterX + (R_m + clearance + tubeOD/2 + (5 - j) * S);
              z_throat = zBase + (5 - j) * zStep;
            }
          } else {
            // peephole
            const R_p = 0.050;
            const clearance = 0.010;
            const S = 0.034;
            const zBase = 0.08;
            const zStep = 0.02;
            
            let leftStart = mid - 2;
            let rightEnd = mid + 1;
            if (op.startTube !== undefined && op.numTubes !== undefined) {
              leftStart = op.startTube - 1;
              rightEnd = leftStart + op.numTubes - 1;
            }
            
            const midOp = leftStart + 2;
            let localOpCenterX = 0;
            if (op.startTube !== undefined && op.numTubes !== undefined) {
              localOpCenterX = ((leftStart + rightEnd) / 2 - (N - 1) / 2) * pitch;
            }
            
            if (i < midOp) {
              const j = i - leftStart;
              x_throat = localOpCenterX - (R_p + clearance + tubeOD/2 + (1 - j) * S);
              z_throat = zBase + (1 - j) * zStep;
            } else {
              const j = rightEnd - i;
              x_throat = localOpCenterX + (R_p + clearance + tubeOD/2 + (1 - j) * S);
              z_throat = zBase + (1 - j) * zStep;
            }
          }
        } else if (op.relation === 'leftSeam') {
          const seamX_local = -(N / 2) * pitch;
          const R_p = 0.050;
          const clearance = 0.010;
          const S = 0.034;
          const zBase = 0.08;
          const zStep = 0.02;
          const j = i; // 0 or 1
          
          x_throat = seamX_local + (R_p + clearance + tubeOD/2 + (1 - j) * S);
          z_throat = zBase + (1 - j) * zStep;
        } else if (op.relation === 'rightSeam') {
          const seamX_local = (N / 2) * pitch;
          const R_p = 0.050;
          const clearance = 0.010;
          const S = 0.034;
          const zBase = 0.08;
          const zStep = 0.02;
          const j = (N - 1) - i; // 0 or 1
          
          x_throat = seamX_local - (R_p + clearance + tubeOD/2 + (1 - j) * S);
          z_throat = zBase + (1 - j) * zStep;
        }
        
        z = z_throat * Math.pow(Math.cos(u * Math.PI / 2), zPower);
        x = localX + (x_throat - localX) * Math.pow(Math.cos(u * Math.PI / 2), xPower);
        break; // Found matching opening, no need to check others for this y
      }
    }
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

// Apply displacement based on Exploded Slider
function applyExplodedSeparation() {
  const factor = state.exploded / 100;
  const xSeparation = factor * 0.8;
  const zSeparation = factor * 0.5;
  
  panelGroups.forEach(group => {
    const defaultX = group.userData.defaultX;
    const index = group.userData.index;
    
    const shiftFactor = index - 8.5;
    group.position.x = defaultX + shiftFactor * xSeparation;
    
    const tubes = group.getObjectByName("Tubes");
    const fins = group.getObjectByName("Fins");
    const headers = group.getObjectByName("Headers & Bends");
    
    if (tubes) tubes.position.z = 0;
    if (fins) fins.position.z = -zSeparation;
    if (headers) headers.position.z = zSeparation;
  });

  rearPanelGroups.forEach(group => {
    const defaultX = group.userData.defaultX;
    const index = group.userData.index;
    
    // Mirrored shift factor because rear panels are laid out from +X to -X
    const shiftFactor = -(index - 8.5);
    group.position.x = defaultX + shiftFactor * xSeparation;
    
    const tubes = group.getObjectByName("Tubes");
    const fins = group.getObjectByName("Fins");
    const headers = group.getObjectByName("Headers & Bends");
    
    if (tubes) tubes.position.z = 0;
    // Mirrored Z displacement because inside/outside is flipped in Z at the rear wall
    if (fins) fins.position.z = zSeparation;
    if (headers) headers.position.z = -zSeparation;
  });
  
  joiningFinsGroup.children.forEach((child) => {
    const defaultJointX = child.userData.defaultX;
    const seamIdx = child.userData.seamIdx;
    if (defaultJointX !== undefined && seamIdx !== undefined) {
      const shift = (seamIdx - 8.0) * xSeparation;
      child.position.x = defaultJointX + shift;
      const isSleeve = child.userData.type.includes('Sleeve');
      child.position.z = isSleeve ? 0 : -zSeparation;
    }
  });

  const rearJoiningFins = boilerGroup.getObjectByName("Rear Joining Fins");
  if (rearJoiningFins) {
    rearJoiningFins.children.forEach((child) => {
      const defaultJointX = child.userData.defaultX;
      const seamIdx = child.userData.seamIdx;
      if (defaultJointX !== undefined && seamIdx !== undefined) {
        const shift = (seamIdx - 8.0) * xSeparation;
        child.position.x = defaultJointX + shift;
        const isSleeve = child.userData.type.includes('Sleeve');
        child.position.z = isSleeve ? 0 : -zSeparation; // scale.z = -1 makes this +zSeparation globally
      }
    });
  }

  if (dimensionsGroup) {
    dimensionsGroup.visible = state.showLabels && state.showDimensions && (state.exploded === 0);
  }
  if (orientationLabelsGroup) {
    orientationLabelsGroup.visible = state.showLabels;
  }
}

// Raycasting Inspection
function onMouseMove(event) {
  const container = document.getElementById('canvas-container');
  const rect = renderer.domElement.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersectTargets = [];
  boilerGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
  if (roofGroup) roofGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
  if (ltrhGroup) ltrhGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
  const intersects = raycaster.intersectObjects(intersectTargets, false);
  const tooltip = document.getElementById('tooltip-card');
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    
    if (object.material === materials.tubeInner) return;
    
    if (hoveredObject !== object) {
      restoreHoverColor();
      
      hoveredObject = object;
      
      originalMaterialColor = hoveredObject.material.color.getHex();
      hoveredObjectOriginalMaterial = hoveredObject.material;
      hoveredObject.material = hoveredObjectOriginalMaterial.clone();
      hoveredObject.material.color.setHex(COLORS.highlight);
      
      if (state.renderMode === 'xray') {
        hoveredObject.material.transparent = true;
        hoveredObject.material.opacity = 0.8;
      }
      
      showTooltip(object.userData);
    }
  } else {
    if (hoveredObject) {
      restoreHoverColor();
      tooltip.style.display = 'none';
    }
  }
}

function restoreHoverColor() {
  if (hoveredObject && hoveredObjectOriginalMaterial) {
    hoveredObject.material.dispose();
    hoveredObject.material = hoveredObjectOriginalMaterial;
    hoveredObjectOriginalMaterial = null;
    hoveredObject = null;
  }
}

function showTooltip(data) {
  const tooltip = document.getElementById('tooltip-card');
  const title = document.getElementById('tooltip-title');
  const desc = document.getElementById('tooltip-desc');
  const specs = document.getElementById('tooltip-specs');
  
  if (!data || !data.type) {
    tooltip.style.display = 'none';
    return;
  }
  
  title.innerText = data.type;
  
  let descText = "";
  let specsHTML = "";
  
  if (data.type.includes('LTRH Reheater')) {
    descText = `${data.panel} - ${data.id}`;
    specsHTML = `
      <div class="spec-row"><span>Tube OD</span><span>${data.od} mm</span></div>
      <div class="spec-row"><span>Wall Thickness</span><span>${data.thickness} mm</span></div>
      <div class="spec-row"><span>Serpentine Length</span><span>${data.length}</span></div>
    `;
  } else if (data.type.includes('Hanger')) {
    descText = `${data.panel} - Hanger Support`;
    specsHTML = `
      <div class="spec-row"><span>Outer Dia</span><span>${data.od} mm</span></div>
      <div class="spec-row"><span>Wall Thickness</span><span>${data.thickness || 5} mm</span></div>
      <div class="spec-row"><span>Total Height</span><span>${data.length}</span></div>
    `;
  } else if (data.type.includes('Tube')) {
    descText = `${data.panel} - Tube #${data.id}`;
    specsHTML = `
      <div class="spec-row"><span>Outer Dia (OD)</span><span>${data.od} mm</span></div>
      <div class="spec-row"><span>Wall Thickness</span><span>${data.thickness} mm</span></div>
      <div class="spec-row"><span>Straight Length</span><span>${data.length}</span></div>
    `;
  } else if (data.type.includes('Internal')) {
    descText = `${data.panel} - Fin Plate #${data.id}`;
    specsHTML = `
      <div class="spec-row"><span>Width</span><span>${data.width}</span></div>
      <div class="spec-row"><span>Thickness</span><span>${data.thickness}</span></div>
      <div class="spec-row"><span>Length</span><span>${data.length}</span></div>
    `;
  } else if (data.type.includes('Joining')) {
    descText = `Joint: ${data.joint}`;
    specsHTML = `
      <div class="spec-row"><span>Width</span><span>${data.width}</span></div>
      <div class="spec-row"><span>Thickness</span><span>${data.thickness}</span></div>
      <div class="spec-row"><span>Length</span><span>${data.length}</span></div>
    `;
  } else if (data.type.includes('Header')) {
    descText = `${data.panel} - Main Header`;
    specsHTML = `
      <div class="spec-row"><span>Outer Dia</span><span>${data.od} mm</span></div>
      <div class="spec-row"><span>Total Length</span><span>${data.length}</span></div>
      <div class="spec-row"><span>Z-axis Shift</span><span>${data.offsetZ}</span></div>
      ${data.connectionAngle ? `<div class="spec-row"><span>Outlet Connect</span><span>${data.connectionAngle}</span></div>` : ''}
    `;
  } else if (data.type.includes('Sleeve')) {
    descText = `${data.panel} - Access Opening`;
    specsHTML = `
      <div class="spec-row"><span>Diameter</span><span>${data.diameter}</span></div>
      <div class="spec-row"><span>Sleeve Depth</span><span>${data.depth}</span></div>
      <div class="spec-row"><span>Position</span><span>${data.location}</span></div>
    `;
  } else if (data.type.includes('Bend')) {
    descText = `${data.panel} - Bend Connector #${data.tubeId}`;
    specsHTML = `
      <div class="spec-row"><span>Tube OD</span><span>${state.tubeOD} mm</span></div>
      <div class="spec-row"><span>Wall Thickness</span><span>${state.tubeThickness} mm</span></div>
      <div class="spec-row"><span>Offset Angle</span><span>${data.angle}</span></div>
    `;
  }
  
  desc.innerText = descText;
  specs.innerHTML = specsHTML;
  tooltip.style.display = 'block';
}

// Calculate Bill of Materials (Steel Weight)
function calculateBOM() {
  const rho = 7850; // kg/m3

  // --- Layer 1: Water Walls ---
  let wwTubeMass = 0;
  let wwFinMass = 0;
  let wwHeaderMass = 0;
  let wwTubesQtyText = "--";
  let wwFinsQtyText = "--";
  let wwHdrsQtyText = "--";

  if (state.showWaterWall) {
    const tubeOD = state.tubeOD / 1000;
    const tubeThick = state.tubeThickness / 1000;
    const finThick = state.finThick / 1000;
    const joinThick = state.joinThick / 1000;
    const headerOD = state.headerOD / 1000;
    const headerOffset = state.headerOffset / 1000;

    const tubeArea = Math.PI * (Math.pow(tubeOD / 2, 2) - Math.pow(tubeOD / 2 - tubeThick, 2));

    const R_h = headerOD / 2;
    const R_b = 0.100;
    const runZ = headerOffset - R_b;
    const bendLength90 = (Math.PI / 2) * R_b + (runZ - R_h);

    const zInlet = headerOffset - R_h;
    const dzBends = 2 * R_b * (1 - Math.cos(45 * Math.PI / 180));
    const L_slant = (zInlet - dzBends) / Math.sin(45 * Math.PI / 180);
    const bendLength45 = (2 * R_b * (45 * Math.PI / 180)) + L_slant;

    let totalTubeLen = 0;
    let totalFinVol = 0;
    let totalHeaderLen = 0;
    let numTubesCount = 0;
    let numInternalFins = 0;

    panelConfigs.forEach((cfg, panelIdx) => {
      const N = cfg.numTubes;
      const pitch = cfg.pitch;
      const gap = cfg.gap;
      numTubesCount += N;
      numInternalFins += (N - 1);

      const isTop45 = cfg.isCenter && state.centerInletAngle === 45;
      const topBendLen = isTop45 ? bendLength45 : bendLength90;
      const botBendLen = bendLength90;

      const panelWidth = (N - 1) * pitch + tubeOD;
      const headerLen = panelWidth + 0.200;
      totalHeaderLen += 2 * headerLen;

      for (let i = 0; i < N; i++) {
        let straightLen = cfg.length;
        const activeOpenings = getTubeOpenings(panelIdx, i);
        if (activeOpenings.length > 0) {
          const hasManhole = activeOpenings.some(op => op.type === 'manhole');
          const addedLength = hasManhole 
            ? (0.08 * activeOpenings.filter(op => op.type === 'manhole').length + 0.02 * activeOpenings.filter(op => op.type === 'peephole').length) 
            : (0.02 * activeOpenings.length);
          straightLen += addedLength;
        }
        totalTubeLen += (straightLen + topBendLen + botBendLen);
      }

      for (let i = 0; i < N - 1; i++) {
        const activeFinOpenings = getFinOpenings(panelIdx, i);
        let finLen = cfg.length;
        if (activeFinOpenings.length > 0) {
          let bypassedLen = 0;
          activeFinOpenings.forEach(op => {
            const hBend = (op.type === 'manhole') ? 0.45 : 0.20;
            bypassedLen += 2 * hBend;
          });
          finLen = Math.max(0, finLen - bypassedLen);
        }
        totalFinVol += finLen * gap * finThick;
      }
    });

    let totalJoiningFinMass = 0;
    for (let j = 0; j < 17; j++) {
      const cfgLeft = panelConfigs[j];
      const cfgRight = panelConfigs[j + 1];
      const yStartOverlap = Math.max(cfgLeft.botY, cfgRight.botY);

      const xLeft = getTubeGlobalX(panelEndIdx[j]);
      const xRight = getTubeGlobalX(panelStartIdx[j + 1]);
      const jointGap = (xRight - xLeft) - tubeOD;

      const seamOpenings = getSeamOpenings(j);
      let jointLength = 5.5 - yStartOverlap;
      if (seamOpenings.length > 0) {
        let bypassedLen = 0;
        seamOpenings.forEach(op => {
          const hBend = 0.20;
          bypassedLen += 2 * hBend;
        });
        jointLength = Math.max(0, jointLength - bypassedLen);
      }
      totalJoiningFinMass += jointLength * jointGap * joinThick * rho;
    }

    const rawTubeMass = totalTubeLen * tubeArea * rho;
    const rawFinMass = totalFinVol * rho + totalJoiningFinMass;
    const headerThick = 0.016; // 16mm thick
    const headerArea = Math.PI * (Math.pow(headerOD / 2, 2) - Math.pow(headerOD / 2 - headerThick, 2));
    const rawHeaderMass = totalHeaderLen * headerArea * rho;

    // Both front & rear are rendered, so double
    wwTubeMass = rawTubeMass * 2;
    wwFinMass = rawFinMass * 2;
    wwHeaderMass = rawHeaderMass * 2;

    const avgLen = totalTubeLen / numTubesCount;
    wwTubesQtyText = `${numTubesCount * 2} tubes x ~${avgLen.toFixed(1)}m`;
    wwFinsQtyText = `${numInternalFins * 2} int. + 34 joints`;
    wwHdrsQtyText = `72 hdrs x ~${(totalHeaderLen / 36).toFixed(2)}m`;
  }

  // --- Layer 2: Roof Panel Assembly ---
  let roofTubeFinMass = 0;
  let roofHeaderMass = 0;
  let roofTubesQtyText = "--";
  let roofHdrsQtyText = "--";

  if (state.showRoof) {
    const TUBE_OD = 0.032;  // 32 mm
    const TUBE_THICK = 0.006; // 6 mm
    const FIN_THICK = state.finThick / 1000;
    const JOIN_THICK = state.joinThick / 1000;
    const HEADER_OD = state.headerOD / 1000;
    const HEADER_THICK = 0.016;

    // 18 panels, each panel has 54 tubes. Total = 972 tubes.
    // Each tube length is approximately the distance from center (0) to outer edge.
    const leftEndX = tubeGlobalX.length > 0 ? tubeGlobalX[0] : -21.0;
    const rightEndX = tubeGlobalX.length > 0 ? tubeGlobalX[tubeGlobalX.length - 1] : 21.0;
    const avgRoofTubeLen = (Math.abs(leftEndX) + Math.abs(rightEndX)) / 2;

    const tubeArea = Math.PI * (Math.pow(TUBE_OD / 2, 2) - Math.pow(TUBE_OD / 2 - TUBE_THICK, 2));
    const rawTubeMass = 972 * avgRoofTubeLen * tubeArea * rho;

    // Fin Plates: 18 panels * 53 internal fins * gap (0.014 m) * thick * length
    const gapZ = 0.046 - TUBE_OD; // 0.014 m
    const finVol = 18 * 53 * gapZ * FIN_THICK * avgRoofTubeLen;
    // Joining fins: 17 joints per side * 2 sides = 34 joints.
    const jointVol = 34 * avgRoofTubeLen * 0.05 * JOIN_THICK;
    const rawFinMass = (finVol + jointVol) * rho;

    roofTubeFinMass = rawTubeMass + rawFinMass;

    // Headers: 36 headers total (1 inlet + 1 outlet per panel * 18 panels).
    const hdrLen = 2.438 + HEADER_OD;
    const headerArea = Math.PI * (Math.pow(HEADER_OD / 2, 2) - Math.pow(HEADER_OD / 2 - HEADER_THICK, 2));
    roofHeaderMass = 36 * hdrLen * headerArea * rho;

    roofTubesQtyText = `972 tubes x ~${avgRoofTubeLen.toFixed(1)}m`;
    roofHdrsQtyText = `36 hdrs x ~${hdrLen.toFixed(2)}m`;
  }

  // --- Layer 3: LTRH Zone ---
  let ltrhTubeMass = 0;
  let ltrhHeaderMass = 0;
  let ltrhTubesQtyText = "--";
  let ltrhHdrsQtyText = "--";

  if (state.showLTRH) {
    const ltrhOD = state.ltrhOD / 1000;
    const ltrhThick = 0.005; // 5 mm thick
    const hangerOD = 0.042; // 42 mm
    const hangerThick = 0.005; // 5 mm

    const tubeArea = Math.PI * (Math.pow(ltrhOD / 2, 2) - Math.pow(ltrhOD / 2 - ltrhThick, 2));
    const hangerArea = Math.PI * (Math.pow(hangerOD / 2, 2) - Math.pow(hangerOD / 2 - hangerThick, 2));

    // 180 coils total * 29.2 m serpentine path
    const serpentineLen = 180 * 29.2;
    const serpentineMass = serpentineLen * tubeArea * rho;

    // 270 hanger tubes * 25.7 m height
    const hangerLenTotal = 270 * 25.7;
    const hangerMass = hangerLenTotal * hangerArea * rho;

    ltrhTubeMass = serpentineMass + hangerMass;

    // Headers: 12 headers total, each 6.2 m long, 250 mm OD
    const headerOD = 0.250;
    const headerThick = 0.016;
    const headerArea = Math.PI * (Math.pow(headerOD / 2, 2) - Math.pow(headerOD / 2 - headerThick, 2));
    ltrhHeaderMass = 12 * 6.2 * headerArea * rho;

    ltrhTubesQtyText = `180 cls + 270 hgrs`;
    ltrhHdrsQtyText = `12 hdrs x 6.20m`;
  }

  // Update elements in DOM
  // Water Walls
  document.getElementById('bom-ww-tubes-qty').innerText = wwTubesQtyText;
  document.getElementById('bom-ww-tubes-mass').innerText = state.showWaterWall ? Math.round(wwTubeMass).toLocaleString() + ' kg' : '--';
  document.getElementById('bom-ww-fins-qty').innerText = wwFinsQtyText;
  document.getElementById('bom-ww-fins-mass').innerText = state.showWaterWall ? Math.round(wwFinMass).toLocaleString() + ' kg' : '--';
  document.getElementById('bom-ww-hdrs-qty').innerText = wwHdrsQtyText;
  document.getElementById('bom-ww-hdrs-mass').innerText = state.showWaterWall ? Math.round(wwHeaderMass).toLocaleString() + ' kg' : '--';

  // Roof Panel
  document.getElementById('bom-roof-tubes-qty').innerText = roofTubesQtyText;
  document.getElementById('bom-roof-tubes-mass').innerText = state.showRoof ? Math.round(roofTubeFinMass).toLocaleString() + ' kg' : '--';
  document.getElementById('bom-roof-hdrs-qty').innerText = roofHdrsQtyText;
  document.getElementById('bom-roof-hdrs-mass').innerText = state.showRoof ? Math.round(roofHeaderMass).toLocaleString() + ' kg' : '--';

  // LTRH
  document.getElementById('bom-ltrh-tubes-qty').innerText = ltrhTubesQtyText;
  document.getElementById('bom-ltrh-tubes-mass').innerText = state.showLTRH ? Math.round(ltrhTubeMass).toLocaleString() + ' kg' : '--';
  document.getElementById('bom-ltrh-hdrs-qty').innerText = ltrhHdrsQtyText;
  document.getElementById('bom-ltrh-hdrs-mass').innerText = state.showLTRH ? Math.round(ltrhHeaderMass).toLocaleString() + ' kg' : '--';

  // Total Summary
  const grandTotal = wwTubeMass + wwFinMass + wwHeaderMass + roofTubeFinMass + roofHeaderMass + ltrhTubeMass + ltrhHeaderMass;
  document.getElementById('bom-total-mass').innerText = Math.round(grandTotal).toLocaleString() + ' kg';
}

// Draw Dimensions on Scene
function clearDimensions() {
  while (dimensionsGroup.children.length > 0) {
    dimensionsGroup.remove(dimensionsGroup.children[0]);
  }
}

function drawDimensionAnnotations() {
  clearDimensions();
  
  const tubeOD = state.tubeOD / 1000;
  const pitch = state.pitch / 1000;
  const totalTubes = tubeGlobalX.length;
  
  const getTubeGlobalX = (k) => {
    return tubeGlobalX[k];
  };
  
  const midK = Math.floor(totalTubes / 2);
  const x1 = getTubeGlobalX(midK);
  const x2 = getTubeGlobalX(midK + 1);
  createDimLine(
    new THREE.Vector3(x1, 1, 0.1),
    new THREE.Vector3(x2, 1, 0.1),
    `${state.pitch} mm Pitch`,
    new THREE.Vector3(0, 0.2, 0)
  );

  createDimLine(
    new THREE.Vector3(x1 - tubeOD/2, 2, 0.15),
    new THREE.Vector3(x1 + tubeOD/2, 2, 0.15),
    `OD ${state.tubeOD}mm`,
    new THREE.Vector3(0, 0.2, 0)
  );

  const firstX = getTubeGlobalX(0) - tubeOD/2;
  const lastX = getTubeGlobalX(totalTubes - 1) + tubeOD/2;

  // Panel 1 length (26.8m)
  createDimLine(
    new THREE.Vector3(firstX - 0.2, -20.8, 0),
    new THREE.Vector3(firstX - 0.2, state.lenOuter/2, 0),
    `Panel 1 Length: 26.8 m`,
    new THREE.Vector3(-0.4, 0, 0)
  );

  // Panel 4 length (12.0m)
  const p4StartX = getTubeGlobalX(panelStartIdx[3]) - tubeOD/2;
  createDimLine(
    new THREE.Vector3(p4StartX - 0.2, -state.lenOuter/2, 0),
    new THREE.Vector3(p4StartX - 0.2, state.lenOuter/2, 0),
    `Panel 4 Length: ${state.lenOuter.toFixed(1)} m`,
    new THREE.Vector3(-0.4, 0, 0)
  );

  // Panel 5 length (10.0m)
  const seamX = getTubeGlobalX(panelStartIdx[4]) - tubeOD/2 - 0.1;
  createDimLine(
    new THREE.Vector3(seamX, state.lenOuter/2 - state.lenCentre, 0),
    new THREE.Vector3(seamX, state.lenOuter/2, 0),
    `Panel 5 Length: ${state.lenCentre.toFixed(1)} m`,
    new THREE.Vector3(-0.3, 0, 0)
  );

  // Panel 12 length (40.0m)
  const seam9X = getTubeGlobalX(panelStartIdx[11]) - tubeOD/2 - 0.1;
  createDimLine(
    new THREE.Vector3(seam9X, state.lenOuter/2 - 40.0, 0),
    new THREE.Vector3(seam9X, state.lenOuter/2, 0),
    `Panel 12 Length: 40.0 m`,
    new THREE.Vector3(-0.4, 0, 0)
  );

  // Panel 15 length (12.0m)
  const p15LastX = getTubeGlobalX(panelEndIdx[14]) + tubeOD/2;
  createDimLine(
    new THREE.Vector3(p15LastX + 0.2, -state.lenOuter/2, 0),
    new THREE.Vector3(p15LastX + 0.2, state.lenOuter/2, 0),
    `Panel 15 Length: ${state.lenOuter.toFixed(1)} m`,
    new THREE.Vector3(0.4, 0, 0)
  );

  // Panel 18 length (26.8m)
  createDimLine(
    new THREE.Vector3(lastX + 0.2, -20.8, 0),
    new THREE.Vector3(lastX + 0.2, state.lenOuter/2, 0),
    `Panel 18 Length: 26.8 m`,
    new THREE.Vector3(0.4, 0, 0)
  );

  createDimLine(
    new THREE.Vector3(lastX - tubeOD/2, -20.8, 0),
    new THREE.Vector3(lastX - tubeOD/2, -20.8, state.headerOffset/1000),
    `Offset ${state.headerOffset}mm`,
    new THREE.Vector3(0, 0.2, 0.2)
  );

  // --- Add Elevation Annotation Tags ---
  // Top Elevation (EL. 90.0 m)
  createElevationTag(state.lenOuter/2, firstX, 0, "EL. 90.0 m", new THREE.Vector3(-0.55, 0, 0));
  createElevationTag(state.lenOuter/2, lastX, 0, "EL. 90.0 m", new THREE.Vector3(0.55, 0, 0));

  // Bottom Green Elevation (EL. 78.0 m)
  createElevationTag(-state.lenOuter/2, p4StartX, 0, "EL. 78.0 m", new THREE.Vector3(-0.55, 0, 0));
  createElevationTag(-state.lenOuter/2, p15LastX, 0, "EL. 78.0 m", new THREE.Vector3(0.55, 0, 0));

  // Bottom Green Elevation for Center Panels 5 & 14 (original 2 & 11)
  const p5CenterXForTag = (getTubeGlobalX(panelStartIdx[4]) + getTubeGlobalX(panelEndIdx[4])) / 2;
  const p14CenterXForTag = (getTubeGlobalX(panelStartIdx[13]) + getTubeGlobalX(panelEndIdx[13])) / 2;
  const botYCenter = state.lenOuter / 2 - state.lenCentre;
  const elevCenter = botYCenter + 84.0;
  createElevationTag(botYCenter, p5CenterXForTag, 0, `EL. ${elevCenter.toFixed(1)} m`, new THREE.Vector3(0, -0.25, 0.1));
  createElevationTag(botYCenter, p14CenterXForTag, 0, `EL. ${elevCenter.toFixed(1)} m`, new THREE.Vector3(0, -0.25, 0.1));

  // Bottom Pink Elevation (EL. 50.0 m)
  const xPinkLeft = getTubeGlobalX(panelStartIdx[6]) - tubeOD/2;
  const xPinkRight = getTubeGlobalX(panelEndIdx[11]) + tubeOD/2;
  createElevationTag(-34.0, xPinkLeft, 0, "EL. 50.0 m", new THREE.Vector3(-0.55, 0, 0));
  createElevationTag(-34.0, xPinkRight, 0, "EL. 50.0 m", new THREE.Vector3(0.55, 0, 0));

  // New panels inlet elevations (EL. 63.2 m and EL. 62.8 m)
  createElevationTag(-20.8, firstX, 0, "EL. 63.2 m", new THREE.Vector3(-0.55, 0, 0));
  createElevationTag(-20.8, lastX, 0, "EL. 63.2 m", new THREE.Vector3(0.55, 0, 0));
  
  const p2CenterXForTag = (getTubeGlobalX(panelStartIdx[1]) + getTubeGlobalX(panelEndIdx[1])) / 2;
  createElevationTag(-21.2, p2CenterXForTag, 0, "EL. 62.8 m", new THREE.Vector3(0, -0.25, 0.1));
  
  const p17CenterXForTag = (getTubeGlobalX(panelStartIdx[16]) + getTubeGlobalX(panelEndIdx[16])) / 2;
  createElevationTag(-21.2, p17CenterXForTag, 0, "EL. 62.8 m", new THREE.Vector3(0, -0.25, 0.1));

  // Split Point Elevation (EL. 89.5 m)
  const p5CenterX = getTubeGlobalX(panelStartIdx[4] + Math.floor(panelTubes[4]/2));
  createElevationTag(5.5, p5CenterX, -0.2, "Split EL. 89.5 m", new THREE.Vector3(0, 0.22, 0.1));

  // --- Add Manhole & Peephole Annotation Tags dynamically ---
  for (let panelIdx = 0; panelIdx < 18; panelIdx++) {
    const panelOpenings = getPanelOpenings(panelIdx);
    const N = panelTubes[panelIdx];
    const pitch = panelPitches[panelIdx];
    const pStartX = getTubeGlobalX(panelStartIdx[panelIdx]);
    const pEndX = getTubeGlobalX(panelEndIdx[panelIdx]);
    const pCenterX = (pStartX + pEndX) / 2;
    
    panelOpenings.forEach(op => {
      const label = op.type === 'manhole' ? `Manhole EL. ${op.elev.toFixed(1)} m` : `Peephole EL. ${op.elev.toFixed(1)} m`;
      let tagX = pCenterX;
      if (op.startTube !== undefined && op.numTubes !== undefined) {
        const leftStart = op.startTube - 1;
        const rightEnd = leftStart + op.numTubes - 1;
        const localOpCenterX = ( (leftStart + rightEnd) / 2 - (N - 1) / 2 ) * pitch;
        tagX = pCenterX + localOpCenterX;
      }
      createElevationTag(op.y, tagX, 0.12, label, new THREE.Vector3(0, 0.22, 0.1));
    });
  }

  // --- Add Seam Openings Annotation Tags dynamically ---
  for (let j = 0; j < 17; j++) {
    const seamOpenings = getSeamOpenings(j);
    const xLeft = getTubeGlobalX(panelEndIdx[j]);
    const xRight = getTubeGlobalX(panelStartIdx[j + 1]);
    const jointX = (xLeft + xRight) / 2;
    
    seamOpenings.forEach(op => {
      const label = `Peephole EL. ${op.elev.toFixed(1)} m`;
      createElevationTag(op.y, jointX, 0.12, label, new THREE.Vector3(0, 0.22, 0.1));
    });
  }
}

function createDimLine(start, end, label, labelOffset) {
  const color = COLORS.dimension;
  
  const points = [start, end];
  const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({ color: color, linewidth: 1 });
  const line = new THREE.Line(lineGeom, lineMat);
  dimensionsGroup.add(line);
  
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  let tickDir = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.y) > 0.9) {
    tickDir.set(1, 0, 0);
  } else {
    tickDir.set(0, 1, 0);
  }
  
  const tickLength = 0.08;
  const drawTick = (pt) => {
    const pt1 = pt.clone().addScaledVector(tickDir, tickLength);
    const pt2 = pt.clone().addScaledVector(tickDir, -tickLength);
    const tickGeom = new THREE.BufferGeometry().setFromPoints([pt1, pt2]);
    const tick = new THREE.Line(tickGeom, lineMat);
    dimensionsGroup.add(tick);
  };
  
  drawTick(start);
  drawTick(end);
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  roundRect(2, 2, canvas.width - 4, canvas.height - 4, 8);
  
  ctx.shadowBlur = 0;
  ctx.font = 'bold 20px Outfit, Arial';
  ctx.fillStyle = '#f3f4f6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  sprite.position.copy(midpoint).add(labelOffset);
  
  sprite.scale.set(0.6, 0.15, 1.0);
  dimensionsGroup.add(sprite);
}

// Draw a horizontal line and a sprite label indicating header elevation
function createElevationTag(y, x, z, text, offset) {
  const color = COLORS.dimension;
  const lineStart = new THREE.Vector3(x, y, z);
  const lineEnd = new THREE.Vector3(x + (offset.x > 0 ? 0.4 : (offset.x < 0 ? -0.4 : 0)), y, z);
  const points = [lineStart, lineEnd];
  const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({ color: color });
  const line = new THREE.Line(lineGeom, lineMat);
  dimensionsGroup.add(line);
  
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#3b82f6'; // blue theme for elevation tags
  ctx.lineWidth = 2;
  
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  
  roundRect(1, 1, canvas.width - 2, canvas.height - 2, 4);
  
  ctx.font = 'bold 13px Outfit, sans-serif';
  ctx.fillStyle = '#60a5fa'; // light blue text color
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(lineEnd).add(offset);
  sprite.scale.set(0.45, 0.1, 1.0);
  dimensionsGroup.add(sprite);
}

function clearOrientationLabels() {
  if (!orientationLabelsGroup) return;
  while (orientationLabelsGroup.children.length > 0) {
    const obj = orientationLabelsGroup.children[0];
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
    orientationLabelsGroup.remove(obj);
  }
}

function drawOrientationLabels() {
  clearOrientationLabels();
  if (!orientationLabelsGroup) return;
  
  const getTubeGlobalX = (k) => {
    return tubeGlobalX[k];
  };
  
  const p1StartX = getTubeGlobalX(panelStartIdx[0]);
  const p1EndX = getTubeGlobalX(panelEndIdx[0]);
  const p1CenterX = (p1StartX + p1EndX) / 2;
  
  const p18StartX = getTubeGlobalX(panelStartIdx[17]);
  const p18EndX = getTubeGlobalX(panelEndIdx[17]);
  const p18CenterX = (p18StartX + p18EndX) / 2;
  
  const yTopLabel = state.lenOuter / 2 + 1.5;
  const yBotLabel = state.lenOuter / 2 - 40.0 - 1.5;
  const xLeftLabel = p1CenterX - 1.0;
  const xRightLabel = p18CenterX + 1.0;
  
  if (state.rotateModel180) {
    createWorldLabel("BOTTOM (INLET) - EL. 63.2m / 62.8m / 78m / 80m / 50m", new THREE.Vector3(0, yTopLabel, 0), "#10b981");
    createWorldLabel("TOP (OUTLET) - EL. 90m", new THREE.Vector3(0, yBotLabel, 0), "#3b82f6");
    createWorldLabel("LEFT SIDE (PANEL 18)", new THREE.Vector3(xLeftLabel, 0, 0), "#f59e0b");
    createWorldLabel("RIGHT SIDE (PANEL 1)", new THREE.Vector3(xRightLabel, 0, 0), "#f59e0b");
  } else {
    createWorldLabel("TOP (OUTLET) - EL. 90m", new THREE.Vector3(0, yTopLabel, 0), "#3b82f6");
    createWorldLabel("BOTTOM (INLET) - EL. 63.2m / 62.8m / 78m / 80m / 50m", new THREE.Vector3(0, yBotLabel, 0), "#10b981");
    createWorldLabel("LEFT SIDE (PANEL 1)", new THREE.Vector3(xLeftLabel, 0, 0), "#f59e0b");
    createWorldLabel("RIGHT SIDE (PANEL 18)", new THREE.Vector3(xRightLabel, 0, 0), "#f59e0b");
  }
  
  createWorldLabel("FRONT SIDE", new THREE.Vector3(0, 0, 0.5), "#ef4444");
  createWorldLabel("BACK SIDE", new THREE.Vector3(0, 0, -0.5), "#a855f7");
}

function createWorldLabel(text, position, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 4;
  
  const r = 12;
  const w = canvas.width;
  const h = canvas.height;
  
  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  roundRect(3, 3, w - 6, h - 6, r);
  
  ctx.shadowBlur = 0;
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(position);
  sprite.scale.set(1.2, 0.32, 1.0);
  orientationLabelsGroup.add(sprite);
}

// UI Controls Binding
function initUI() {
  // --- Parameters Inputs ---
  const bindSlider = (id, stateKey, unit, rebuild = true) => {
    const slider = document.getElementById(`input-${id}`);
    const display = document.getElementById(`val-${id}`);
    if (!slider || !display) return;
    
    slider.addEventListener('input', (e) => {
      let val = parseFloat(e.target.value);
      state[stateKey] = val;
      display.innerText = val + (unit ? ' ' + unit : '');
      
      // Auto enforce constraints
      if (stateKey === 'tubeOD' || stateKey === 'pitch') {
        const pitchSlider = document.getElementById('input-pitch');
        const odSlider = document.getElementById('input-tube-od');
        
        if (state.pitch <= state.tubeOD) {
          if (stateKey === 'tubeOD') {
            state.pitch = state.tubeOD + 4;
            pitchSlider.value = state.pitch;
            document.getElementById('val-pitch').innerText = state.pitch + ' mm';
          } else {
            state.tubeOD = state.pitch - 4;
            odSlider.value = state.tubeOD;
            document.getElementById('val-tube-od').innerText = state.tubeOD + ' mm';
          }
        }
      }
      
      if (rebuild) {
        if (stateKey === 'exploded') {
          applyExplodedSeparation();
        } else {
          buildBoilerModel();
        }
      }
    });
  };

  bindSlider('tubes', 'numTubes', '', true);
  bindSlider('tube-od', 'tubeOD', 'mm', true);
  bindSlider('tube-thick', 'tubeThickness', 'mm', true);
  bindSlider('pitch', 'pitch', 'mm', true);
  bindSlider('len-outer', 'lenOuter', 'm', true);
  bindSlider('len-centre', 'lenCentre', 'm', true);
  bindSlider('fin-thick', 'finThick', 'mm', true);
  bindSlider('join-thick', 'joinThick', 'mm', true);
  bindSlider('header-od', 'headerOD', 'mm', true);
  bindSlider('header-offset', 'headerOffset', 'mm', true);
  bindSlider('exploded', 'exploded', '%', false);
  bindSlider('ltrh-od', 'ltrhOD', 'mm', true);
  bindSlider('ltrh-pitch', 'ltrhPitch', 'mm', true);

  // --- Color Picker Inputs ---
  const bindColorPicker = (id, materialKey, cssVar, colorKey) => {
    const picker = document.getElementById(`input-color-${id}`);
    const display = document.getElementById(`val-color-${id}`);
    if (!picker || !display) return;
    
    display.innerText = picker.value.toUpperCase();
    
    picker.addEventListener('input', (e) => {
      const hex = e.target.value;
      display.innerText = hex.toUpperCase();
      
      COLORS[colorKey] = parseInt(hex.replace('#', '0x'), 16);
      if (materials[materialKey]) {
        materials[materialKey].color.setHex(COLORS[colorKey]);
      }
      
      document.documentElement.style.setProperty(cssVar, hex);
    });
  };

  bindColorPicker('tube', 'tube', '--tube-color', 'tube');
  bindColorPicker('fin', 'fin', '--fin-color', 'fin');
  bindColorPicker('header', 'header', '--header-color', 'header');

  // Center Inlet Angle Toggles
  const btn45 = document.getElementById('btn-angle-45');
  const btn90 = document.getElementById('btn-angle-90');
  
  if (btn45 && btn90) {
    btn45.addEventListener('click', () => {
      state.centerInletAngle = 45;
      btn45.classList.add('active');
      btn90.classList.remove('active');
      buildBoilerModel();
    });
    btn90.addEventListener('click', () => {
      state.centerInletAngle = 90;
      btn90.classList.add('active');
      btn45.classList.remove('active');
      buildBoilerModel();
    });
  }

  // Render Mode Buttons
  const btnSolid = document.getElementById('btn-mode-solid');
  const btnXray = document.getElementById('btn-mode-xray');
  const btnWire = document.getElementById('btn-mode-wireframe');
  
  const setRenderMode = (mode) => {
    state.renderMode = mode;
    [btnSolid, btnXray, btnWire].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    
    if (mode === 'solid') btnSolid.classList.add('active');
    if (mode === 'xray') btnXray.classList.add('active');
    if (mode === 'wireframe') btnWire.classList.add('active');
    
    updateMaterialsForMode();
    buildBoilerModel();
  };

  if (btnSolid) btnSolid.addEventListener('click', () => setRenderMode('solid'));
  if (btnXray) btnXray.addEventListener('click', () => setRenderMode('xray'));
  if (btnWire) btnWire.addEventListener('click', () => setRenderMode('wireframe'));

  // Camera Presets
  const camBtnIso = document.getElementById('btn-cam-iso');
  const camBtnFront = document.getElementById('btn-cam-front');
  const camBtnSide = document.getElementById('btn-cam-side');
  const camBtnTop = document.getElementById('btn-cam-top');

  if (camBtnIso) camBtnIso.addEventListener('click', () => { setCameraPresetSmooth('iso'); updateCamBtnActive('iso'); });
  if (camBtnFront) camBtnFront.addEventListener('click', () => { setCameraPresetSmooth('front'); updateCamBtnActive('front'); });
  if (camBtnSide) camBtnSide.addEventListener('click', () => { setCameraPresetSmooth('side'); updateCamBtnActive('side'); });
  if (camBtnTop) camBtnTop.addEventListener('click', () => { setCameraPresetSmooth('top'); updateCamBtnActive('top'); });

  // Viewport Tool Binding (Orbit vs Pan)
  const btnToolOrbit = document.getElementById('btn-tool-orbit');
  const btnToolPan = document.getElementById('btn-tool-pan');
  const canvasElement = renderer.domElement;

  window.setControlTool = (tool) => {
    if (tool === 'orbit') {
      if (btnToolOrbit) btnToolOrbit.classList.add('active');
      if (btnToolPan) btnToolPan.classList.remove('active');
      
      if (controls) {
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        };
        controls.update();
      }
    } else if (tool === 'pan') {
      if (btnToolPan) btnToolPan.classList.add('active');
      if (btnToolOrbit) btnToolOrbit.classList.remove('active');
      
      if (controls) {
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE
        };
        controls.update();
      }
    }
  };

  if (btnToolOrbit) btnToolOrbit.addEventListener('click', () => window.setControlTool('orbit'));
  if (btnToolPan) btnToolPan.addEventListener('click', () => window.setControlTool('pan'));

  // Attach pointerdown and pointerup listeners to the canvas for grab/grabbing cursor states
  canvasElement.addEventListener('pointerdown', (e) => {
    if (e.button === 0) { // Left-click
      canvasElement.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('pointerup', () => {
    if (renderer && renderer.domElement) {
      renderer.domElement.style.cursor = 'grab';
    }
  });

  // Rotate 180 Degrees
  const btnRotate180 = document.getElementById('btn-rotate-180');
  if (btnRotate180) {
    btnRotate180.addEventListener('click', () => {
      const target = controls.target.clone();
      const offset = new THREE.Vector3().subVectors(camera.position, target);
      offset.y = -offset.y;
      offset.z = -offset.z;
      controls.reset();
      camera.position.copy(target).add(offset);
      controls.target.copy(target);
      controls.update();
    });
  }

  // Dimension Toggle
  const dimToggle = document.getElementById('dimensions-toggle');
  if (dimToggle) {
    dimToggle.addEventListener('click', () => {
      state.showDimensions = !state.showDimensions;
      dimToggle.classList.toggle('active', state.showDimensions);
      dimensionsGroup.visible = state.showDimensions && (state.exploded === 0);
      orientationLabelsGroup.visible = state.showDimensions;
      drawDimensionAnnotations();
      drawOrientationLabels();
    });
  }

  // Screenshot Button
  const btnScreenshot = document.getElementById('btn-screenshot');
  if (btnScreenshot) {
    btnScreenshot.addEventListener('click', () => {
      window.takeScreenshot();
    });
  }

  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sideToggle = document.getElementById('sidebar-toggle');
  if (sideToggle && sidebar) {
    sideToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sideToggle.classList.toggle('active');
      setTimeout(onWindowResize, 310);
    });
  }

  // Model Rotation Toggle (Z-axis 180 deg)
  const rotateModelToggle = document.getElementById('input-rotate-model');
  if (rotateModelToggle) {
    rotateModelToggle.addEventListener('change', (e) => {
      state.rotateModel180 = e.target.checked;
      buildBoilerModel();
    });
  }

  // Show Text & Details Toggle
  const labelsToggle = document.getElementById('input-show-labels');
  if (labelsToggle) {
    labelsToggle.addEventListener('change', (e) => {
      state.showLabels = e.target.checked;
      applyExplodedSeparation();
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Restore default state parameters
      state.numTubes = 54;
      state.tubeOD = 32;
      state.tubeThickness = 6;
      state.pitch = 46;
      state.lenOuter = 12.0;
      state.lenCentre = 10.0;
      state.finThick = 6.0;
      state.joinThick = 14.0;
      state.headerOD = 250;
      state.headerOffset = 400;
      state.centerInletAngle = 45;
      state.exploded = 0;
      state.renderMode = 'solid';
      state.showDimensions = true;
      state.rotateModel180 = false;
      state.showLTRH = true;
      if (orientationLabelsGroup) {
        orientationLabelsGroup.visible = true;
      }

      // Restore control mode to orbit
      setControlTool('orbit');

      // Update UI elements
      document.getElementById('input-tubes').value = 54;
      document.getElementById('val-tubes').innerText = '54';
      document.getElementById('input-tube-od').value = 32;
      document.getElementById('val-tube-od').innerText = '32 mm';
      document.getElementById('input-tube-thick').value = 6;
      document.getElementById('val-tube-thick').innerText = '6.0 mm';
      document.getElementById('input-pitch').value = 46;
      document.getElementById('val-pitch').innerText = '46 mm';
      document.getElementById('input-len-outer').value = 12;
      document.getElementById('val-len-outer').innerText = '12.0 m';
      document.getElementById('input-len-centre').value = 10.0;
      document.getElementById('val-len-centre').innerText = '10.0 m';
      document.getElementById('input-fin-thick').value = 6;
      document.getElementById('val-fin-thick').innerText = '6.0 mm';
      document.getElementById('input-join-thick').value = 14;
      document.getElementById('val-join-thick').innerText = '14.0 mm';
      document.getElementById('input-header-od').value = 250;
      document.getElementById('val-header-od').innerText = '250 mm';
      document.getElementById('input-header-offset').value = 400;
      document.getElementById('val-header-offset').innerText = '400 mm';
      document.getElementById('input-exploded').value = 0;
      document.getElementById('val-exploded').innerText = '0%';
      
      // Reset custom colors
      COLORS.tube = 0x10b981;
      COLORS.fin = 0xf59e0b;
      COLORS.header = 0x2563eb;
      
      materials.tube.color.setHex(COLORS.tube);
      materials.fin.color.setHex(COLORS.fin);
      materials.header.color.setHex(COLORS.header);
      
      document.documentElement.style.setProperty('--tube-color', '#10b981');
      document.documentElement.style.setProperty('--fin-color', '#f59e0b');
      document.documentElement.style.setProperty('--header-color', '#2563eb');
      
      const tubePicker = document.getElementById('input-color-tube');
      const finPicker = document.getElementById('input-color-fin');
      const headerPicker = document.getElementById('input-color-header');
      
      if (tubePicker) {
        tubePicker.value = '#10b981';
        document.getElementById('val-color-tube').innerText = '#10B981';
      }
      if (finPicker) {
        finPicker.value = '#f59e0b';
        document.getElementById('val-color-fin').innerText = '#F59E0B';
      }
      if (headerPicker) {
        headerPicker.value = '#2563eb';
        document.getElementById('val-color-header').innerText = '#2563EB';
      }

      btn45.classList.add('active');
      btn90.classList.remove('active');
      
      setRenderMode('solid');
      dimToggle.classList.add('active');
      
      const rotateModelToggle = document.getElementById('input-rotate-model');
      if (rotateModelToggle) rotateModelToggle.checked = false;
      
      state.showLabels = true;
      const labelsToggle = document.getElementById('input-show-labels');
      if (labelsToggle) labelsToggle.checked = true;

      const ltrhToggle = document.getElementById('input-show-ltrh');
      if (ltrhToggle) ltrhToggle.checked = true;
      state.showLTRH = true;
      
      state.showWaterWall = true;
      state.showRoof = true;
      const checkboxWaterWall = document.getElementById('layer-waterwall');
      const checkboxRoof = document.getElementById('layer-roof');
      const checkboxLTRH = document.getElementById('layer-ltrh');
      
      if (checkboxWaterWall) checkboxWaterWall.checked = true;
      if (checkboxRoof) checkboxRoof.checked = true;
      if (checkboxLTRH) checkboxLTRH.checked = true;

      if (boilerGroup) boilerGroup.visible = true;
      if (roofGroup) roofGroup.visible = true;
      if (ltrhGroup) ltrhGroup.visible = true;
      
      updateCamBtnActive('iso');
      setCameraPreset('iso');

      state.lightDirection = 'default';
      updateLightBtnsActive('default');
      updateLighting();

      buildBoilerModel();
    });
  }

  // Lighting Control Buttons
  const lightBtns = {
    default: document.getElementById('btn-light-default'),
    front: document.getElementById('btn-light-front'),
    rear: document.getElementById('btn-light-rear'),
    left: document.getElementById('btn-light-left'),
    right: document.getElementById('btn-light-right'),
    top: document.getElementById('btn-light-top'),
    bottom: document.getElementById('btn-light-bottom'),
    'top-front': document.getElementById('btn-light-top-front')
  };

  const updateLightBtnsActive = (activeKey) => {
    Object.keys(lightBtns).forEach(key => {
      const btn = lightBtns[key];
      if (btn) {
        if (key === activeKey) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  };

  Object.keys(lightBtns).forEach(key => {
    const btn = lightBtns[key];
    if (btn) {
      btn.addEventListener('click', () => {
        state.lightDirection = key;
        updateLightBtnsActive(key);
        updateLighting();
      });
    }
  });

  // Panel Visibility toggles (Front Wall)
  initPanelVisibility();

  // Roof Panel Visibility toggles
  initRoofVisibility();

  // LTRH Toggle
  const ltrhToggle = document.getElementById('input-show-ltrh');
  if (ltrhToggle) {
    ltrhToggle.addEventListener('change', (e) => {
      state.showLTRH = e.target.checked;
      if (ltrhGroup) ltrhGroup.visible = state.showLTRH;
      buildBoilerModel();
    });
  }

  // Unified Layer visibility controls
  initLayerVisibilityControls();

  // Model Detail (Quality) Buttons
  const btnQLow = document.getElementById('btn-quality-low');
  const btnQMed = document.getElementById('btn-quality-medium');
  const btnQHigh = document.getElementById('btn-quality-high');
  
  const setQualityMode = (mode) => {
    state.qualityMode = mode;
    [btnQLow, btnQMed, btnQHigh].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    
    if (mode === 'low' && btnQLow) btnQLow.classList.add('active');
    if (mode === 'medium' && btnQMed) btnQMed.classList.add('active');
    if (mode === 'high' && btnQHigh) btnQHigh.classList.add('active');
    
    // Rebuild all layers
    buildBoilerModel();
    buildRoofModel();
    buildLTRHModel();
  };

  if (btnQLow) btnQLow.addEventListener('click', () => setQualityMode('low'));
  if (btnQMed) btnQMed.addEventListener('click', () => setQualityMode('medium'));
  if (btnQHigh) btnQHigh.addEventListener('click', () => setQualityMode('high'));

  // Interactive Ruler (Measurement Tool)
  const btnRuler = document.getElementById('btn-interactive-ruler');
  if (btnRuler) {
    btnRuler.addEventListener('click', () => {
      state.rulerActive = !state.rulerActive;
      btnRuler.classList.toggle('active', state.rulerActive);
      if (state.rulerActive) {
        showToast("Ruler Active: Click two points on components to measure distance.");
        if (renderer && renderer.domElement) {
          renderer.domElement.style.cursor = 'crosshair';
        }
      } else {
        clearRuler();
        showToast("Ruler Deactivated. Cleared measurement.");
        if (renderer && renderer.domElement) {
          renderer.domElement.style.cursor = 'grab';
        }
      }
    });
  }

  // Pointer drag prevention tracking
  let clickStartX = 0;
  let clickStartY = 0;
  canvasElement.addEventListener('mousedown', (e) => {
    clickStartX = e.clientX;
    clickStartY = e.clientY;
  });

  canvasElement.addEventListener('mouseup', (e) => {
    // Only trigger if click didn't involve panning/dragging (mouse moved less than 4px)
    if (Math.abs(e.clientX - clickStartX) < 4 && Math.abs(e.clientY - clickStartY) < 4) {
      if (state.rulerActive && e.button === 0) { // Left click
        raycaster.setFromCamera(mouse, camera);
        const intersectTargets = [];
        boilerGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
        if (roofGroup) roofGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
        if (ltrhGroup) ltrhGroup.traverse(c => { if (c.isMesh) intersectTargets.push(c); });
        
        const intersects = raycaster.intersectObjects(intersectTargets, true);
        if (intersects.length > 0) {
          handleRulerClick(intersects[0].point);
        }
      }
    }
  });
}

// ─── Panel Visibility Control ────────────────────────────────────────────────
function initPanelVisibility() {
  // Wire up individual panel toggle buttons
  for (let p = 1; p <= 18; p++) {
    const btn = document.getElementById(`pvis-${p}`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const panelIdx = p - 1; // 0-based index
      if (!panelGroups[panelIdx]) return;

      const isVisible = panelGroups[panelIdx].visible;
      panelGroups[panelIdx].visible = !isVisible;
      if (rearPanelGroups[panelIdx]) {
        rearPanelGroups[panelIdx].visible = !isVisible;
      }

      if (!isVisible) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Show All
  const showAll = document.getElementById('btn-show-all-panels');
  if (showAll) {
    showAll.addEventListener('click', () => {
      panelGroups.forEach((g, idx) => {
        g.visible = true;
        if (rearPanelGroups[idx]) rearPanelGroups[idx].visible = true;
        const btn = document.getElementById(`pvis-${idx + 1}`);
        if (btn) btn.classList.add('active');
      });
    });
  }

  // Hide All
  const hideAll = document.getElementById('btn-hide-all-panels');
  if (hideAll) {
    hideAll.addEventListener('click', () => {
      panelGroups.forEach((g, idx) => {
        g.visible = false;
        if (rearPanelGroups[idx]) rearPanelGroups[idx].visible = false;
        const btn = document.getElementById(`pvis-${idx + 1}`);
        if (btn) btn.classList.remove('active');
      });
    });
  }
}

// Restore panel visibility from DOM button state (called after every rebuild)
function restorePanelVisibility() {
  for (let p = 1; p <= 18; p++) {
    const btn = document.getElementById(`pvis-${p}`);
    if (!btn) continue;
    const panelIdx = p - 1;
    if (!panelGroups[panelIdx]) continue;
    // If button is active → visible, if not active → hidden
    panelGroups[panelIdx].visible = btn.classList.contains('active');
    if (rearPanelGroups[panelIdx]) {
      rearPanelGroups[panelIdx].visible = btn.classList.contains('active');
    }
  }
}

// ─── Roof Tube Panel Model ────────────────────────────────────────────────────
function buildRoofModel() {
  if (!roofGroup) return;
  const q = getGeometryQuality();

  // Clear previous roof geometry
  roofPanelGroups.forEach(g => { disposeHierarchy(g); roofGroup.remove(g); });
  roofPanelGroups = [];
  while (roofGroup.children.length > 0) {
    const obj = roofGroup.children[0];
    disposeHierarchy(obj);
    roofGroup.remove(obj);
  }

  // ── Constants ──────────────────────────────────────────────────────────────
  const TUBE_OD    = 0.032;  // 32 mm
  const PITCH_Z    = 0.046;  // 46 mm tube pitch (Z-direction, spacing between tube courses)
  const TUBE_Y     = 5.0;    // EL 89 m  (Y = EL − 84)
  const HEADER_Y   = 7.0;    // EL 91 m
  const HEADER_OD  = state.headerOD / 1000;  // 0.25 m
  const FIN_THICK  = state.finThick  / 1000; // 0.006 m
  const JOIN_THICK = state.joinThick / 1000;
  const PANELS_PER_SIDE = 9;
  const TUBES_PER_PANEL = 54;
  const TOTAL_TUBES     = PANELS_PER_SIDE * TUBES_PER_PANEL; // 486 per side

  // ── Z positions ────────────────────────────────────────────────────────────
  // First roof tube: 30 mm gap from front-wall tube inner surface
  // front-wall tube inner Z = -(TUBE_OD/2) → first roof tube centre:
  const Z_START = -(TUBE_OD / 2 + 0.030 + TUBE_OD / 2); // -0.062 m

  // Helper: Z-centre of tube at global index i (0 = frontmost)
  const tubeZ = i => Z_START - i * PITCH_Z;

  // ── Roof Platen Slots (Left side only) ──────────────────────────────────────
  // 28 slots, each slot is formed by bending 2 adjacent tubes (global tube indices i and i+1)
  // Z positions: start at 925 mm, spacing 782 mm
  const slots = [];
  for (let k = 0; k < 28; k++) {
    const i = Math.round((0.925 + k * 0.782) / PITCH_Z);
    slots.push(i);
  }

  // ── X positions (from front-wall tube grid) ──────────────────────────────
  // tubeGlobalX[] is populated by buildBoilerModel() – already runs before us.
  // If somehow empty (first call timing), fall back to a default half-width.
  const leftEndX   = tubeGlobalX.length > 0 ? tubeGlobalX[0] : -21.0;
  const rightEndX  = tubeGlobalX.length > 0 ? tubeGlobalX[tubeGlobalX.length - 1] : 21.0;
  const leftTubeLen  = Math.abs(leftEndX);   // distance from center to left edge
  const rightTubeLen = Math.abs(rightEndX);  // distance from center to right edge
  const leftCentreX  = leftEndX  / 2;        // X centre of left-side tubes
  const rightCentreX = rightEndX / 2;        // X centre of right-side tubes

  // ── Header X offsets ──────────────────────────────────────────────────────
  // Inlet: alternate 180 mm / 510 mm (staggered)
  const INLET_HDR_OFFSET_A = 0.180;
  const INLET_HDR_OFFSET_B = 0.510;
  // Outlet: alternate 760 mm / 1160 mm (staggered)
  const OUTLET_HDR_OFFSET_A = 0.760;
  const OUTLET_HDR_OFFSET_B = 1.160;

  // ── Per-panel geometry ───────────────────────────────────────────────────
  const panelZLength = (TUBES_PER_PANEL - 1) * PITCH_Z; // 2.438 m per panel
  const GAP_Z = PITCH_Z - TUBE_OD; // 0.014 m fin gap

  for (let side = 0; side < 2; side++) {     // 0 = left (R1-R9), 1 = right (R10-R18)
    const isLeft   = side === 0;
    const tubeLen  = isLeft ? leftTubeLen  : rightTubeLen;
    const centrX   = isLeft ? leftCentreX  : rightCentreX;
    const tubeEndX = isLeft ? leftEndX     : rightEndX;

    for (let p = 0; p < PANELS_PER_SIDE; p++) {
      const panelNum   = side * PANELS_PER_SIDE + p + 1; // 1-18
      const panelGroup = new THREE.Group();
      panelGroup.name  = `Roof Panel ${panelNum}`;

      // ── Per-panel staggered header offsets ──
      const inletOffset  = p % 2 === 0 ? INLET_HDR_OFFSET_A : INLET_HDR_OFFSET_B;
      const outletOffset = p % 2 === 0 ? OUTLET_HDR_OFFSET_A : OUTLET_HDR_OFFSET_B;
      const inletHdrX  = isLeft ? -inletOffset        :  inletOffset;
      const outletHdrX = isLeft ? (leftEndX  + outletOffset) : (rightEndX - outletOffset);

      const tubesG   = new THREE.Group(); tubesG.name   = 'Roof Tubes';
      const finsG    = new THREE.Group(); finsG.name    = 'Roof Fins';
      const headersG = new THREE.Group(); headersG.name = 'Roof Headers';
      const bendsG   = new THREE.Group(); bendsG.name   = 'Roof Bends';
      panelGroup.add(tubesG, finsG, headersG, bendsG);

      // ── Panel-level Z extents ───────────────────────────────────────────
      const globalOffset = p * TUBES_PER_PANEL; // first tube index within this panel
      const panelZStart  = tubeZ(globalOffset);
      const panelZEnd    = tubeZ(globalOffset + TUBES_PER_PANEL - 1);
      const panelZCentre = (panelZStart + panelZEnd) / 2;
      // Header drum length covers all 54 tube positions + one OD extension each end
      const hdrLength = panelZLength + HEADER_OD;

      // ── Tubes ──────────────────────────────────────────────────────────
      for (let t = 0; t < TUBES_PER_PANEL; t++) {
        const z = tubeZ(globalOffset + t);
        const globalIdx = globalOffset + t;
        let isBent = false;
        let zShiftVal = 0;
        
        if (slots.includes(globalIdx)) {
          isBent = true;
          zShiftVal = 0.018; // shift towards front (Z increases)
        } else if (slots.includes(globalIdx - 1)) {
          isBent = true;
          zShiftVal = -0.018; // shift towards rear (Z decreases)
        }
        
        if (isBent) {
          const z0 = z;
          const y_rise = 0.15; // 150 mm hump height
          const sign = isLeft ? -1 : 1;
          
          // Generate curve points from X = 0 to X = tubeEndX (decreasing X for left, increasing X for right)
          const pts = [
            new THREE.Vector3(0, TUBE_Y, z0),
            new THREE.Vector3(0.700 * sign, TUBE_Y, z0),
            new THREE.Vector3(0.790 * sign, TUBE_Y, z0),
            
            // Slot 1 (X = 990 to 3270 mm from center)
            new THREE.Vector3(0.990 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(2.130 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(3.270 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(3.470 * sign, TUBE_Y, z0),
            
            // Gap between slots (X = 3470 to 4070 mm from center)
            new THREE.Vector3(3.770 * sign, TUBE_Y, z0),
            new THREE.Vector3(4.070 * sign, TUBE_Y, z0),
            
            // Slot 2 (X = 4270 to 6730 mm from center)
            new THREE.Vector3(4.270 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(5.500 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(6.730 * sign, TUBE_Y + y_rise, z0 + zShiftVal),
            new THREE.Vector3(6.930 * sign, TUBE_Y, z0),
            
            new THREE.Vector3(tubeEndX, TUBE_Y, z0)
          ];
          
          const curve = new THREE.CatmullRomCurve3(pts);
          const geom = new THREE.TubeGeometry(curve, q.tubeRoofSamples, TUBE_OD / 2, q.tubeRoofRadial, false);
          const mesh = new THREE.Mesh(geom, materials.tubeRoof);
          mesh.castShadow = true;
          mesh.userData = {
            type: `Roof Tube (Bent for Slot)`,
            panel: `Roof Panel ${panelNum}`,
            id: t + 1,
            od: '32 mm',
            pitch: '46 mm',
            elevation: 'EL. 89.0 m (staggered)',
            length: tubeLen.toFixed(2) + ' m'
          };
          tubesG.add(mesh);
        } else {
          const geom = new THREE.CylinderGeometry(TUBE_OD / 2, TUBE_OD / 2, tubeLen, q.cylTube, 1);
          const mesh = new THREE.Mesh(geom, materials.tubeRoof);
          mesh.rotation.z = Math.PI / 2; // cylinder default Y-axis → runs in X
          mesh.position.set(centrX, TUBE_Y, z);
          mesh.castShadow = true;
          mesh.userData = {
            type: `Roof Tube`,
            panel: `Roof Panel ${panelNum}`,
            id: t + 1,
            od: '32 mm',
            pitch: '46 mm',
            elevation: 'EL. 89.0 m',
            length: tubeLen.toFixed(2) + ' m'
          };
          tubesG.add(mesh);
        }
      }

      // Fin plates start and end coordinates based on the 100mm spacing from headers
      // The straight section has fins for its entire length (from 0 to tubeEndX)
      const finStartX = 0;
      const finEndX   = tubeEndX;

      // Helper to add a fin segment clipped to the active finned region [finStartX, finEndX]
      const addFinSegment = (x1, x2, finZ) => {
        const leftLimit = Math.min(finStartX, finEndX);
        const rightLimit = Math.max(finStartX, finEndX);
        
        const s1 = Math.max(Math.min(x1, x2), leftLimit);
        const s2 = Math.min(Math.max(x1, x2), rightLimit);
        
        if (s2 - s1 > 0.005) {
          const len = s2 - s1;
          const cx = (s1 + s2) / 2;
          const geom = new THREE.BoxGeometry(len, FIN_THICK, GAP_Z);
          const mesh = new THREE.Mesh(geom, materials.fin);
          mesh.position.set(cx, TUBE_Y, finZ);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = { type: 'Roof Fin Plate', panel: `Roof Panel ${panelNum}` };
          finsG.add(mesh);
        }
      };

      // Helper to draw a curved fin segment following the S-bend path, continuing all the way to the header
      const drawCurvedFin = (x_tube_end, x_header, finZ, thick, gap) => {
        const dx  = x_header - x_tube_end;
        const pts = [
          new THREE.Vector3(x_tube_end,            TUBE_Y,        finZ),
          new THREE.Vector3(x_tube_end + dx * 0.15, TUBE_Y + 0.5, finZ),
          new THREE.Vector3(x_tube_end + dx * 0.50, TUBE_Y + 1.1, finZ),
          new THREE.Vector3(x_tube_end + dx * 0.80, TUBE_Y + 1.6, finZ),
          new THREE.Vector3(x_header,               HEADER_Y,     finZ)
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const curvePts = curve.getPoints(10); // 10 segments along the curve
        
        for (let i = 0; i < curvePts.length - 1; i++) {
          const pA = curvePts[i];
          const pB = curvePts[i + 1];
          const pM = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
          
          const dist = pA.distanceTo(pB);
          const geom = new THREE.BoxGeometry(dist, thick, Math.max(gap, 0.001));
          const mesh = new THREE.Mesh(geom, materials.fin);
          
          const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
          mesh.position.copy(pM);
          const axis = new THREE.Vector3(1, 0, 0);
          const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
          mesh.quaternion.copy(quaternion);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          mesh.userData = { type: 'Roof Fin Plate (Curved)', panel: `Roof Panel ${panelNum}` };
          finsG.add(mesh);
        }
      };

      // ── Fin plates between adjacent tube courses (gap in Z) ────────────
      for (let t = 0; t < TUBES_PER_PANEL - 1; t++) {
        const z1 = tubeZ(globalOffset + t);
        const z2 = tubeZ(globalOffset + t + 1);
        const finZ = (z1 + z2) / 2;
        
        const g1 = globalOffset + t;
        const isBentFin = slots.includes(g1) || slots.includes(g1 + 1) || slots.includes(g1 - 1);
        const sign = isLeft ? -1 : 1;
        
        if (isBentFin) {
          addFinSegment(0, 0.600 * sign, finZ);
          addFinSegment(3.570 * sign, 3.970 * sign, finZ);
          addFinSegment(7.030 * sign, tubeEndX, finZ);
        } else {
          addFinSegment(finStartX, finEndX, finZ);
        }

        // Add curved S-bend fin plates on both ends
        drawCurvedFin(0, inletHdrX, finZ, FIN_THICK, GAP_Z);
        drawCurvedFin(tubeEndX, outletHdrX, finZ, FIN_THICK, GAP_Z);
      }

      // ── Joining fin between this panel and the next (inter-panel gap Z) ─
      if (p < PANELS_PER_SIDE - 1) {
        const z1 = tubeZ(globalOffset + TUBES_PER_PANEL - 1);
        const z2 = tubeZ(globalOffset + TUBES_PER_PANEL);
        const joinZ  = (z1 + z2) / 2;
        const joinGap = Math.abs(z2 - z1) - TUBE_OD; // = GAP_Z (same pitch)
        
        const g1 = globalOffset + TUBES_PER_PANEL - 1; // last tube of this panel
        const g2 = g1 + 1; // first tube of next panel
        const isBentJoin = slots.includes(g1) || slots.includes(g2) || slots.includes(g1 - 1) || slots.includes(g2 + 1);
        const sign = isLeft ? -1 : 1;

        const addJoinSegment = (x1, x2) => {
          const leftLimit = Math.min(finStartX, finEndX);
          const rightLimit = Math.max(finStartX, finEndX);
          
          const s1 = Math.max(Math.min(x1, x2), leftLimit);
          const s2 = Math.min(Math.max(x1, x2), rightLimit);
          
          if (s2 - s1 > 0.005) {
            const len = s2 - s1;
            const cx = (s1 + s2) / 2;
            const geom = new THREE.BoxGeometry(len, JOIN_THICK, Math.max(joinGap, 0.001));
            const mesh = new THREE.Mesh(geom, materials.fin);
            mesh.position.set(cx, TUBE_Y, joinZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { type: 'Roof Joining Fin', panel: `Roof Panel ${panelNum}` };
            finsG.add(mesh);
          }
        };
        
        if (isBentJoin) {
          addJoinSegment(0, 0.600 * sign);
          addJoinSegment(3.570 * sign, 3.970 * sign);
          addJoinSegment(7.030 * sign, tubeEndX);
        } else {
          addJoinSegment(finStartX, finEndX);
        }

        // Add curved S-bend joining fins on both ends
        drawCurvedFin(0, inletHdrX, joinZ, JOIN_THICK, joinGap);
        drawCurvedFin(tubeEndX, outletHdrX, joinZ, JOIN_THICK, joinGap);
      }

      // ── Headers (each panel has its own inlet + outlet drum) ────────────
      // Drum axis runs in Z; CylinderGeometry default = Y → rotate X by PI/2
      const makeHdr = (x, label) => {
        const geom = new THREE.CylinderGeometry(HEADER_OD / 2, HEADER_OD / 2, hdrLength, q.cylHeader);
        const mesh = new THREE.Mesh(geom, materials.header);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(x, HEADER_Y, panelZCentre);
        mesh.castShadow = true;
        mesh.userData = {
          type: 'Roof Header',
          subtype: label,
          panel: `Roof Panel ${panelNum}`,
          od: state.headerOD + ' mm',
          elevation: 'EL. 91.0 m'
        };
        return mesh;
      };
      headersG.add(makeHdr(inletHdrX,  isLeft ? 'Left Inlet Header'  : 'Right Inlet Header'));
      headersG.add(makeHdr(outletHdrX, isLeft ? 'Left Outlet Header' : 'Right Outlet Header'));

      // ── S-bend connections (all 54 tubes per panel) ───
      // The S-bend goes from tube end (Y=5.0) up to header centre (Y=7.0)
      // with a horizontal offset along X matching the T-T/U-U drawing profile.
      const makeBend = (x_tube_end, x_header, z_pos) => {
        const dx  = x_header - x_tube_end;
        const pts = [
          new THREE.Vector3(x_tube_end,            TUBE_Y,        z_pos),
          new THREE.Vector3(x_tube_end + dx * 0.15, TUBE_Y + 0.5, z_pos),
          new THREE.Vector3(x_tube_end + dx * 0.50, TUBE_Y + 1.1, z_pos),
          new THREE.Vector3(x_tube_end + dx * 0.80, TUBE_Y + 1.6, z_pos),
          new THREE.Vector3(x_header,               HEADER_Y,     z_pos)
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const bGeom = new THREE.TubeGeometry(curve, 16, TUBE_OD / 2, 8, false);
        const bMesh = new THREE.Mesh(bGeom, materials.tubeRoof);
        bMesh.castShadow = true;
        bMesh.userData = { type: 'Roof Tube Bend', elevation: 'EL. 89–91 m' };
        return bMesh;
      };

      for (let t = 0; t < TUBES_PER_PANEL; t++) {
        const z = tubeZ(globalOffset + t);
        // Centre-side bend (inlet): tube inner end at X=0, header at inletHdrX
        bendsG.add(makeBend(0,         inletHdrX,  z));
        // Outer-side bend (outlet): tube outer end at leftEndX/rightEndX, header at outletHdrX
        bendsG.add(makeBend(tubeEndX,  outletHdrX, z));
      }

      roofPanelGroups.push(panelGroup);
      roofGroup.add(panelGroup);
    }
  }

  // Apply visibility from sidebar button state
  restoreRoofVisibility();

  // Apply current render mode to roof
  updateMaterialsForMode();
}

// Wire up R1-R18 panel visibility buttons (called once from initUI)
function initRoofVisibility() {
  for (let p = 1; p <= 18; p++) {
    const btn = document.getElementById(`rvis-${p}`);
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const idx = p - 1;
      if (!roofPanelGroups[idx]) return;
      roofPanelGroups[idx].visible = !roofPanelGroups[idx].visible;
      if (roofPanelGroups[idx].visible) { btn.classList.add('active'); }
      else                               { btn.classList.remove('active'); }
    });
  }

  // Entire roof show/hide toggle
  const roofToggle = document.getElementById('input-show-roof');
  if (roofToggle) {
    roofToggle.addEventListener('change', () => {
      state.showRoof = roofToggle.checked;
      roofGroup.visible = state.showRoof;
    });
  }

  // Show All / Hide All roof panels
  const showAllR = document.getElementById('btn-show-all-roof');
  if (showAllR) {
    showAllR.addEventListener('click', () => {
      roofPanelGroups.forEach((g, i) => {
        g.visible = true;
        const btn = document.getElementById(`rvis-${i + 1}`);
        if (btn) btn.classList.add('active');
      });
    });
  }
  const hideAllR = document.getElementById('btn-hide-all-roof');
  if (hideAllR) {
    hideAllR.addEventListener('click', () => {
      roofPanelGroups.forEach((g, i) => {
        g.visible = false;
        const btn = document.getElementById(`rvis-${i + 1}`);
        if (btn) btn.classList.remove('active');
      });
    });
  }
}

// Re-apply roof panel visibility after every rebuild (reads from DOM button state)
function restoreRoofVisibility() {
  for (let p = 1; p <= 18; p++) {
    const btn = document.getElementById(`rvis-${p}`);
    if (!btn) continue;
    const idx = p - 1;
    if (!roofPanelGroups[idx]) continue;
    roofPanelGroups[idx].visible = btn.classList.contains('active');
  }
  if (roofGroup) {
    const roofToggle = document.getElementById('input-show-roof');
    roofGroup.visible = roofToggle ? roofToggle.checked : true;
  }
}

// Update light source position based on active direction
function updateLighting() {
  if (!dirLight1) return;
  
  // Conditionally disable shadows for the 'top-front' light preset to prevent self-shadowing/shadow artifacts
  if (state.lightDirection === 'top-front') {
    dirLight1.castShadow = false;
  } else {
    dirLight1.castShadow = true;
  }
  
  switch (state.lightDirection) {
    case 'front':
      dirLight1.position.set(0, 0, 40);
      break;
    case 'rear':
      dirLight1.position.set(0, 0, -40);
      break;
    case 'left':
      dirLight1.position.set(-40, 0, 0);
      break;
    case 'right':
      dirLight1.position.set(40, 0, 0);
      break;
    case 'top':
      dirLight1.position.set(0, 40, 0);
      break;
    case 'bottom':
      dirLight1.position.set(0, -40, 0);
      break;
    case 'top-front':
      dirLight1.position.set(0, 40, 40);
      break;
    case 'default':
    default:
      dirLight1.position.set(20, 40, 20);
      break;
  }
}

// Camera Preset Vectors
function setCameraPreset(preset) {
  if (!camera || !controls) return;
  
  controls.reset();
  
  if (preset === 'iso') {
    camera.position.set(30, 25, 45);
    controls.target.set(0, 0, 0);
  } else if (preset === 'front') {
    camera.position.set(0, 0, 48);
    controls.target.set(0, 0, 0);
  } else if (preset === 'side') {
    camera.position.set(48, 0, 0);
    controls.target.set(0, 0, 0);
  } else if (preset === 'top') {
    camera.position.set(0, 48, 0);
    controls.target.set(0, 0, 0);
  }
  
  controls.update();
}

// Window resizing handler
function onWindowResize() {
  if (!camera || !renderer) return;
  const container = document.getElementById('canvas-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Render loop
function animate() {
  requestAnimationFrame(animate);
  
  // Smoothly interpolate model rotation clockwise around Z-axis
  if (modelGroup && dimensionsGroup) {
    const diff = targetModelRotationZ - modelGroup.rotation.z;
    if (Math.abs(diff) > 0.001) {
      modelGroup.rotation.z += diff * 0.08;
      dimensionsGroup.rotation.z += diff * 0.08;
    } else {
      modelGroup.rotation.z = targetModelRotationZ;
      dimensionsGroup.rotation.z = targetModelRotationZ;
      if (targetModelRotationZ === -2 * Math.PI) {
        targetModelRotationZ = 0;
        modelGroup.rotation.z = 0;
        dimensionsGroup.rotation.z = 0;
      }
    }
  }

  // Camera smooth interpolation transition
  if (targetCamPos) {
    controls.enabled = false;
    camera.position.lerp(targetCamPos, 0.12);
    camera.up.lerp(targetCamUp, 0.12);
    controls.target.lerp(targetCamTarget, 0.12);
    controls.update();
    
    if (camera.position.distanceTo(targetCamPos) < 0.02) {
      camera.position.copy(targetCamPos);
      camera.up.copy(targetCamUp);
      controls.target.copy(targetCamTarget);
      controls.update();
      targetCamPos = null;
      controls.enabled = true;
    }
  } else if (controls) {
    controls.update();
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
  
  // Sync orientation view gizmo
  updateGizmo();
}

// --- Camera Direction View Gizmo (Orientation Widget) ---

function initGizmo() {
  const container = document.getElementById('orientation-gizmo');
  if (!container) return;

  // Gizmo Scene
  gizmoScene = new THREE.Scene();

  // Gizmo Camera (Orthographic for view alignment)
  gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
  gizmoCamera.position.set(0, 0, 4);

  // Gizmo Renderer
  gizmoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  gizmoRenderer.setSize(100, 100);
  gizmoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(gizmoRenderer.domElement);

  // Gizmo Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  gizmoScene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(2, 4, 3);
  gizmoScene.add(dirLight);

  // Main Gizmo Group
  gizmoGroup = new THREE.Group();
  gizmoScene.add(gizmoGroup);

  // Central Semi-Transparent Sphere
  const centerGeo = new THREE.SphereGeometry(0.35, 24, 24);
  const centerMat = new THREE.MeshBasicMaterial({ 
    color: 0x334155, 
    transparent: true, 
    opacity: 0.6 
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  gizmoGroup.add(centerMesh);

  // Helper to draw axes lines
  const createAxis = (endPoint, colorHex, dashed = false) => {
    const points = [new THREE.Vector3(0, 0, 0), endPoint];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    let mat;
    if (dashed) {
      mat = new THREE.LineDashedMaterial({ 
        color: colorHex, 
        dashSize: 0.1, 
        gapSize: 0.1,
        linewidth: 1.5
      });
    } else {
      mat = new THREE.LineBasicMaterial({ 
        color: colorHex, 
        linewidth: 3 
      });
    }
    const line = new THREE.Line(geom, mat);
    if (dashed) line.computeLineDistances();
    gizmoGroup.add(line);
  };

  // Draw Positive Axes (Solid)
  createAxis(new THREE.Vector3(1.2, 0, 0), 0xa855f7); // +X (RIGHT): Purple
  createAxis(new THREE.Vector3(0, 1.2, 0), 0x3b82f6); // +Y (TOP): Blue
  createAxis(new THREE.Vector3(0, 0, 1.2), 0xef4444); // +Z (FRONT): Red

  // Draw Negative Axes (Dashed)
  createAxis(new THREE.Vector3(-1.2, 0, 0), 0x475569, true); // -X (LEFT): Grey
  createAxis(new THREE.Vector3(0, -1.2, 0), 0x475569, true); // -Y (BOTTOM): Grey
  createAxis(new THREE.Vector3(0, 0, -1.2), 0x475569, true); // -Z (BACK): Grey

  // Add 6 Labeled Node Buttons
  gizmoInteractiveObjects = [];
  
  // TOP (+Y, Blue)
  addGizmoNode("TOP", new THREE.Vector3(0, 1.3, 0), "rgba(37, 99, 235, 0.85)", "top", new THREE.Vector3(0, 1, 0));
  // BOTTOM (-Y, Green)
  addGizmoNode("BOT", new THREE.Vector3(0, -1.3, 0), "rgba(16, 185, 129, 0.85)", "bot", new THREE.Vector3(0, -1, 0));
  // RIGHT (+X, Purple)
  addGizmoNode("RGT", new THREE.Vector3(1.3, 0, 0), "rgba(168, 85, 247, 0.85)", "side", new THREE.Vector3(1, 0, 0));
  // LEFT (-X, Yellow/Amber)
  addGizmoNode("LFT", new THREE.Vector3(-1.3, 0, 0), "rgba(245, 158, 11, 0.85)", "left", new THREE.Vector3(-1, 0, 0));
  // FRONT (+Z, Red)
  addGizmoNode("FRN", new THREE.Vector3(0, 0, 1.3), "rgba(239, 68, 68, 0.85)", "front", new THREE.Vector3(0, 0, 1));
  // BACK (-Z, Dark Grey)
  addGizmoNode("BCK", new THREE.Vector3(0, 0, -1.3), "rgba(71, 85, 105, 0.85)", "back", new THREE.Vector3(0, 0, -1));

  // Add Interaction Event Listeners
  container.addEventListener('click', onGizmoClick);
  container.addEventListener('mousemove', onGizmoMouseMove);
  container.addEventListener('mouseleave', () => {
    gizmoInteractiveObjects.forEach(obj => {
      obj.material.opacity = 0.85;
      obj.material.color.setHex(0xffffff);
    });
    container.style.cursor = 'default';
  });
}

function addGizmoNode(text, position, bgColorHex, presetName, targetDirection) {
  const texture = createGizmoLabelTexture(text, bgColorHex);
  const mat = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: true
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(position);
  sprite.scale.set(0.65, 0.325, 1.0);
  sprite.userData = { 
    presetName: presetName, 
    targetDirection: targetDirection 
  };
  
  gizmoGroup.add(sprite);
  gizmoInteractiveObjects.push(sprite);
}

function createGizmoLabelTexture(text, bgColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  
  const r = 10;
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  
  ctx.fillStyle = bgColor;
  ctx.fill();
  
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.stroke();
  
  ctx.font = 'bold 15px Outfit, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function updateGizmo() {
  if (!gizmoCamera || !camera || !gizmoRenderer || !gizmoScene || !controls) return;
  
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  
  const distance = 3.5;
  gizmoCamera.position.copy(dir).multiplyScalar(-distance);
  gizmoCamera.up.copy(camera.up);
  gizmoCamera.lookAt(0, 0, 0);
  
  gizmoRenderer.render(gizmoScene, gizmoCamera);
}

function onGizmoMouseMove(event) {
  const container = document.getElementById('orientation-gizmo');
  if (!container || !gizmoCamera) return;
  
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x, y), gizmoCamera);
  const intersects = ray.intersectObjects(gizmoInteractiveObjects);
  
  gizmoInteractiveObjects.forEach(obj => {
    obj.material.opacity = 0.85;
    obj.material.color.setHex(0xffffff);
  });
  
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    obj.material.opacity = 1.0;
    obj.material.color.setHex(0xe0f2fe);
    container.style.cursor = 'pointer';
  } else {
    container.style.cursor = 'default';
  }
}

function onGizmoClick(event) {
  const container = document.getElementById('orientation-gizmo');
  if (!container || !gizmoCamera) return;
  
  event.stopPropagation();
  
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x, y), gizmoCamera);
  const intersects = ray.intersectObjects(gizmoInteractiveObjects);
  
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const direction = obj.userData.targetDirection;
    const presetName = obj.userData.presetName;
    if (direction) {
      transitionCameraTo(direction);
      updateCamBtnActive(presetName);
    }
  }
}

function transitionCameraTo(directionVector) {
  if (!camera || !controls) return;
  
  const currentDistance = camera.position.distanceTo(controls.target);
  targetCamTarget = controls.target.clone();
  targetCamPos = targetCamTarget.clone().addScaledVector(directionVector, currentDistance);
  
  if (Math.abs(directionVector.y - 1.0) < 0.01) {
    targetCamUp = new THREE.Vector3(0, 0, -1);
  } else if (Math.abs(directionVector.y + 1.0) < 0.01) {
    targetCamUp = new THREE.Vector3(0, 0, 1);
  } else {
    targetCamUp = new THREE.Vector3(0, 1, 0);
  }
  
  controls.enabled = false;
}

function updateCamBtnActive(presetName) {
  const camBtnIso = document.getElementById('btn-cam-iso');
  const camBtnFront = document.getElementById('btn-cam-front');
  const camBtnSide = document.getElementById('btn-cam-side');
  const camBtnTop = document.getElementById('btn-cam-top');
  
  [camBtnIso, camBtnFront, camBtnSide, camBtnTop].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  
  if (presetName === 'iso' && camBtnIso) camBtnIso.classList.add('active');
  if (presetName === 'front' && camBtnFront) camBtnFront.classList.add('active');
  if (presetName === 'side' && camBtnSide) camBtnSide.classList.add('active');
  if (presetName === 'top' && camBtnTop) camBtnTop.classList.add('active');
}

function setCameraPresetSmooth(presetName) {
  if (!camera || !controls) return;
  
  let targetPos;
  let targetUp = new THREE.Vector3(0, 1, 0);
  
  if (presetName === 'iso') {
    targetPos = new THREE.Vector3(30, 25, 45);
  } else if (presetName === 'front') {
    targetPos = new THREE.Vector3(0, 0, 48);
  } else if (presetName === 'side') {
    targetPos = new THREE.Vector3(48, 0, 0);
  } else if (presetName === 'top') {
    targetPos = new THREE.Vector3(0, 48, 0);
    targetUp.set(0, 0, -1);
  } else if (presetName === 'bot') {
    targetPos = new THREE.Vector3(0, -48, 0);
    targetUp.set(0, 0, 1);
  } else if (presetName === 'left') {
    targetPos = new THREE.Vector3(-48, 0, 0);
  } else if (presetName === 'back') {
    targetPos = new THREE.Vector3(0, 0, -48);
  }
  
  if (targetPos) {
    targetCamTarget = new THREE.Vector3(0, 0, 0);
    targetCamPos = targetPos;
    targetCamUp = targetUp;
    controls.enabled = false;
  }
}

// Memory Management
function disposeHierarchy(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      
      if (child.material && 
          child.material !== materials.tube && 
          child.material !== materials.tubePink && 
          child.material !== materials.tubeBrown && 
          child.material !== materials.tubeRoof && 
          child.material !== materials.tubeInner && 
          child.material !== materials.fin && 
          child.material !== materials.header &&
          child.material !== materials.ltrh) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

// Take Screenshot of Boiler Panel as transparent PNG (clipart)
window.takeScreenshot = () => {
  if (!renderer || !scene || !camera) return;
  
  // 1. Temporarily hide visual helpers
  const gridVisible = gridHelper ? gridHelper.visible : false;
  if (gridHelper) gridHelper.visible = false;
  
  const dimensionsVisible = dimensionsGroup ? dimensionsGroup.visible : false;
  if (dimensionsGroup) dimensionsGroup.visible = false;
  
  const labelsVisible = orientationLabelsGroup ? orientationLabelsGroup.visible : false;
  if (orientationLabelsGroup) orientationLabelsGroup.visible = false;
  
  // 2. Render frame
  renderer.render(scene, camera);
  
  // 3. Capture canvas data
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  // 4. Restore visibility
  if (gridHelper) gridHelper.visible = gridVisible;
  if (dimensionsGroup) dimensionsGroup.visible = dimensionsVisible;
  if (orientationLabelsGroup) orientationLabelsGroup.visible = labelsVisible;
  
  // 5. Trigger download
  const link = document.createElement('a');
  link.download = 'boiler_panel_clipart.png';
  link.href = dataURL;
  link.click();
};

// ─── LTRH Reheater Model ──────────────────────────────────────────────────────
// Helper function to generate a smooth 180-degree U-bend in the Y-Z plane.
// Limiting the Z bulge (rZ) ensures the bends stay compact and don't protrude.
function addUValuePoints(points, x, yA, zA, yB, zB, bulgeDirection, steps = 16) {
  const yMid = (yA + yB) / 2;
  const rY = Math.abs(yA - yB) / 2;
  const rZ = Math.min(rY, 0.080); // Limit Z-bulge to 80 mm to prevent collisions
  
  const angleStart = (yA > yB) ? 0 : Math.PI;
  const angleEnd = (yA > yB) ? Math.PI : 0;
  
  // Skip the first point if it's already the last element of the points array
  const startIdx = (points.length > 0) ? 1 : 0;
  
  for (let i = startIdx; i <= steps; i++) {
    const t = i / steps;
    const theta = angleStart + t * (angleEnd - angleStart);
    const y = yMid + rY * Math.cos(theta);
    const zLinear = zA + t * (zB - zA);
    const z = zLinear + bulgeDirection * rZ * Math.sin(theta);
    points.push(new THREE.Vector3(x, y, z));
  }
}

// Helper to interpolate straight collinear segments with intermediate points to prevent spline overshoot
function addCollinearPoints(points, pA, pB, maxStep = 0.4) {
  const dist = pA.distanceTo(pB);
  if (dist <= maxStep) {
    points.push(pB.clone());
    return;
  }
  const steps = Math.ceil(dist / maxStep);
  // If points is not empty and the last element is very close to pA, we skip adding pA to avoid duplicate points
  const startIdx = (points.length > 0 && points[points.length - 1].distanceTo(pA) < 1e-4) ? 1 : 0;
  for (let i = startIdx; i <= steps; i++) {
    const t = i / steps;
    const p = new THREE.Vector3().lerpVectors(pA, pB, t);
    points.push(p);
  }
}

function buildLTRHModel() {
  if (!ltrhGroup) return;
  const q = getGeometryQuality();

  // Clear previous LTRH geometry
  while (ltrhGroup.children.length > 0) {
    const obj = ltrhGroup.children[0];
    disposeHierarchy(obj);
    ltrhGroup.remove(obj);
  }

  if (!state.showLTRH) {
    ltrhGroup.visible = false;
    return;
  }
  ltrhGroup.visible = true;

  const ltrhOD = state.ltrhOD / 1000;       // 50 mm -> 0.05 m
  const ltrhPitch = state.ltrhPitch / 1000; // 100 mm -> 0.1 m
  
  // Z coordinates parameters from drawing:
  // Hanger centerlines per unit (Z-axis, front is +Z, rear is -Z)
  const hangersZ = [
    [-1.410, -3.860, -6.310],    // Unit 1 (Front)
    [-9.070, -11.520, -13.970],  // Unit 2 (Middle)
    [-16.730, -19.180, -21.630]  // Unit 3 (Rear)
  ];

  // Serpentine boundaries in Z for the coils
  const coilsZ = [
    { start: -0.100, end: -7.620 },   // Unit 1
    { start: -7.760, end: -15.280 },  // Unit 2
    { start: -15.420, end: -22.940 }  // Unit 3
  ];

  // Bottom headers:
  const zHeaderA = [-2.760, -10.420, -18.080];
  const zHeaderB = [-4.960, -12.620, -20.280];

  // Height definitions for sections (Y = Elevation - 84.0)
  // Shifted by -3.0m means Y_model = Elevation - 87.0
  const yLowerTop = -14.624;
  const yMiddleTop = -10.369;
  const yUpperTop = -6.614;

  const lowerH = [2.100, 2.0267, 1.9533, 1.880];
  const upperH = [2.100, 2.0267, 1.9533, 1.880];
  const dyStep = 0.0733;

  // Bottom headers: EL 67.000 (model Y = -17.000)
  const headerBotY = [-17.000, -17.000];
  // Top headers: EL 95.700 and 94.700 -> Y: 8.700 and 7.700
  const headerTopY = [8.700, 7.700];

  // Width: Panels 16-18 center is X = 17.917m
  // 60 coils with 100mm pitch: centered on 17.917m
  const startX = 17.917 - (59 * ltrhPitch) / 2;

  // Render bottom and top headers
  for (let u = 0; u < 3; u++) {
    const unitHangers = hangersZ[u];
    const zhA = zHeaderA[u];
    const zhB = zHeaderB[u];
    
    // Top headers align with the coil exit points (shifted by 60mm to clear water wall physically, and shifted by 940mm due to bank stagger)
    const zhA_top = coilsZ[u].start - 1.000;
    const zhB_top = coilsZ[u].end;
    
    // Bottom Header A
    const botHeaderGeomA = new THREE.CylinderGeometry(0.125, 0.125, 6.2, q.cylHeader);
    const botHeaderMeshA = new THREE.Mesh(botHeaderGeomA, materials.header);
    botHeaderMeshA.rotation.z = Math.PI / 2;
    botHeaderMeshA.position.set(17.917, headerBotY[0], zhA);
    botHeaderMeshA.castShadow = true;
    botHeaderMeshA.receiveShadow = true;
    botHeaderMeshA.userData = {
      type: 'LTRH Bottom Inlet Header A',
      panel: `LTRH Unit ${u + 1}`,
      od: 250,
      length: '6200 mm',
      offsetZ: zhA.toFixed(3) + ' m'
    };
    ltrhGroup.add(botHeaderMeshA);

    // Bottom Header B
    const botHeaderGeomB = new THREE.CylinderGeometry(0.125, 0.125, 6.2, q.cylHeader);
    const botHeaderMeshB = new THREE.Mesh(botHeaderGeomB, materials.header);
    botHeaderMeshB.rotation.z = Math.PI / 2;
    botHeaderMeshB.position.set(17.917, headerBotY[1], zhB);
    botHeaderMeshB.castShadow = true;
    botHeaderMeshB.receiveShadow = true;
    botHeaderMeshB.userData = {
      type: 'LTRH Bottom Outlet Header B',
      panel: `LTRH Unit ${u + 1}`,
      od: 250,
      length: '6200 mm',
      offsetZ: zhB.toFixed(3) + ' m'
    };
    ltrhGroup.add(botHeaderMeshB);

    // Top Header A
    const topHeaderGeomA = new THREE.CylinderGeometry(0.125, 0.125, 6.2, q.cylHeader);
    const topHeaderMeshA = new THREE.Mesh(topHeaderGeomA, materials.header);
    topHeaderMeshA.rotation.z = Math.PI / 2;
    topHeaderMeshA.position.set(17.917, headerTopY[0], zhA_top);
    topHeaderMeshA.castShadow = true;
    topHeaderMeshA.receiveShadow = true;
    topHeaderMeshA.userData = {
      type: 'LTRH Top Suspension Header A',
      panel: `LTRH Unit ${u + 1}`,
      od: 250,
      length: '6200 mm',
      offsetZ: zhA_top.toFixed(3) + ' m'
    };
    ltrhGroup.add(topHeaderMeshA);

    // Top Header B
    const topHeaderGeomB = new THREE.CylinderGeometry(0.125, 0.125, 6.2, q.cylHeader);
    const topHeaderMeshB = new THREE.Mesh(topHeaderGeomB, materials.header);
    topHeaderMeshB.rotation.z = Math.PI / 2;
    topHeaderMeshB.position.set(17.917, headerTopY[1], zhB_top);
    topHeaderMeshB.castShadow = true;
    topHeaderMeshB.receiveShadow = true;
    topHeaderMeshB.userData = {
      type: 'LTRH Top Suspension Header B',
      panel: `LTRH Unit ${u + 1}`,
      od: 250,
      length: '6200 mm',
      offsetZ: zhB_top.toFixed(3) + ' m'
    };
    ltrhGroup.add(topHeaderMeshB);

    // Draw Hanger tubes (vertical support pipes)
    // 30 vertical structures along the width X (in between every Coil 1 & Coil 2 combination)
    const hangerRadius = 42 / 2 / 1000; // 42mm OD -> 21mm radius (0.021 m)
    const hangerGeom = new THREE.CylinderGeometry(hangerRadius, hangerRadius, headerTopY[0] - headerBotY[1], q.cylHanger);
    
    for (let i = 0; i < 30; i++) {
      const hx = startX + (2 * i + 0.5) * ltrhPitch;
      unitHangers.forEach(hz => {
        const hangerMesh = new THREE.Mesh(hangerGeom, materials.header);
        hangerMesh.position.set(hx, (headerTopY[0] + headerBotY[1]) / 2, hz);
        hangerMesh.castShadow = true;
        hangerMesh.receiveShadow = true;
        hangerMesh.userData = {
          type: 'LTRH Hanger Support Tube',
          panel: `LTRH Unit ${u + 1}`,
          od: 42,
          length: (headerTopY[0] - headerBotY[1]).toFixed(1) + ' m'
        };
        ltrhGroup.add(hangerMesh);
      });
    }

    // Draw Coils
    const unitCoilLimits = coilsZ[u];
    const coilZStart = unitCoilLimits.start;
    const coilZEnd = unitCoilLimits.end;

    // Middle Bank Loop heights for this unit (identical profile for all 3 units)
    const middleH = [1.880, 1.8067, 1.7333, 1.660];

    for (let c = 0; c < 60; c++) {
      const x = startX + c * ltrhPitch;
      const isCoil2 = (c % 2 !== 0); // Alternating index
      const points = [];

      const zStart = isCoil2 ? coilZStart - 0.040 : coilZStart;
      const zEnd = isCoil2 ? coilZEnd + 0.040 : coilZEnd;
      
      const zStartLimit = zStart - 0.060;

      // Boundaries for each bank
      const zStartLower = zStartLimit;
      const zEndLower = zEnd + 0.940;
      
      const zStartMiddle = zStartLimit - 0.940;
      const zEndMiddle = zEnd;

      const zStartUpper = zStartMiddle;
      const zEndUpper = zEndMiddle;

      const coilStaggerY = isCoil2 ? -0.040 : 0.0;
      const zStep = 0.150; // Nesting step for concentric loops

      // --- 1. Inlet Connection from Bottom Headers ---
      const yLowerBot0 = yLowerTop - lowerH[0] + coilStaggerY;
      if (!isCoil2) {
        // Coil 1 connects to Bottom Header A (front, Z = zhA)
        points.push(new THREE.Vector3(x, headerBotY[0], zhA));
        addCollinearPoints(points, new THREE.Vector3(x, headerBotY[0], zhA), new THREE.Vector3(x, yLowerBot0, zhA), 0.4);
        addCollinearPoints(points, new THREE.Vector3(x, yLowerBot0, zhA), new THREE.Vector3(x, yLowerBot0, zStartLower), 0.4);
      } else {
        // Coil 2 connects to Bottom Header B (rear, Z = zhB)
        points.push(new THREE.Vector3(x, headerBotY[1], zhB));
        addCollinearPoints(points, new THREE.Vector3(x, headerBotY[1], zhB), new THREE.Vector3(x, yLowerBot0, zhB), 0.4);
        addCollinearPoints(points, new THREE.Vector3(x, yLowerBot0, zhB), new THREE.Vector3(x, yLowerBot0, zStartLower), 0.4);
      }

      // --- 2. LOWER BANK (4 concentric nested loops with diagonal bottom legs) ---
      for (let i = 0; i < 4; i++) {
        const h = lowerH[i];
        const yTopLeg = yLowerTop - i * dyStep + coilStaggerY;
        const yBotLeg = yLowerTop - h + coilStaggerY;
        const zStartLoop = zStartLower - i * zStep;
        const zEndLoop = zEndLower + i * zStep;

        // Front vertical rise
        addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zStartLoop), 0.4);
        // Top horizontal leg (front to rear)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zEndLoop), 0.4);
        // Bottom diagonal leg (rear-top to front-bottom)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zEndLoop), new THREE.Vector3(x, yBotLeg, zStartLoop), 0.4);

        // Transition to next loop inside lower bank
        if (i < 3) {
          const hNext = lowerH[i+1];
          const yBotLegNext = yLowerTop - hNext + coilStaggerY;
          const zStartLoopNext = zStartLower - (i+1) * zStep;
          addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yBotLegNext, zStartLoopNext), 0.4);
        }
      }

      // --- 3. LOWER TO MIDDLE BANK TRANSITION ---
      const yLowerLastBot = yLowerTop - lowerH[3] + coilStaggerY;
      const yMiddleFirstBot = yMiddleTop - middleH[0] + coilStaggerY;
      // Go horizontally to transition rise point
      addCollinearPoints(points, new THREE.Vector3(x, yLowerLastBot, zStartLower - 3 * zStep), new THREE.Vector3(x, yLowerLastBot, zStartMiddle), 0.4);
      // Rise vertically to Middle Bank bottom
      addCollinearPoints(points, new THREE.Vector3(x, yLowerLastBot, zStartMiddle), new THREE.Vector3(x, yMiddleFirstBot, zStartMiddle), 0.4);

      // --- 4. MIDDLE BANK (4 concentric nested loops with diagonal bottom legs) ---
      for (let i = 0; i < 4; i++) {
        const h = middleH[i];
        const yTopLeg = yMiddleTop - i * dyStep + coilStaggerY;
        const yBotLeg = yMiddleTop - h + coilStaggerY;
        const zStartLoop = zStartMiddle - i * zStep;
        const zEndLoop = zEndMiddle + i * zStep;

        // Front vertical rise
        addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zStartLoop), 0.4);
        // Top horizontal leg (front to rear)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zEndLoop), 0.4);
        // Bottom diagonal leg (rear-top to front-bottom)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zEndLoop), new THREE.Vector3(x, yBotLeg, zStartLoop), 0.4);

        // Transition to next loop inside middle bank
        if (i < 3) {
          const hNext = middleH[i+1];
          const yBotLegNext = yMiddleTop - hNext + coilStaggerY;
          const zStartLoopNext = zStartMiddle - (i+1) * zStep;
          addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yBotLegNext, zStartLoopNext), 0.4);
        }
      }

      // --- 5. MIDDLE TO UPPER BANK TRANSITION ---
      const yMiddleLastBot = yMiddleTop - middleH[3] + coilStaggerY;
      const yUpperFirstBot = yUpperTop - upperH[0] + coilStaggerY;
      // Go horizontally to transition rise point
      addCollinearPoints(points, new THREE.Vector3(x, yMiddleLastBot, zStartMiddle - 3 * zStep), new THREE.Vector3(x, yMiddleLastBot, zStartUpper), 0.4);
      // Rise vertically to Upper Bank bottom
      addCollinearPoints(points, new THREE.Vector3(x, yMiddleLastBot, zStartUpper), new THREE.Vector3(x, yUpperFirstBot, zStartUpper), 0.4);

      // --- 6. UPPER BANK (4 concentric nested loops with diagonal bottom legs) ---
      for (let i = 0; i < 4; i++) {
        const h = upperH[i];
        const yTopLeg = yUpperTop - i * dyStep + coilStaggerY;
        const yBotLeg = yUpperTop - h + coilStaggerY;
        const zStartLoop = zStartUpper - i * zStep;
        const zEndLoop = zEndUpper + i * zStep;

        // Front vertical rise
        addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zStartLoop), 0.4);
        // Top horizontal leg (front to rear)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zStartLoop), new THREE.Vector3(x, yTopLeg, zEndLoop), 0.4);
        // Bottom diagonal leg (rear-top to front-bottom)
        addCollinearPoints(points, new THREE.Vector3(x, yTopLeg, zEndLoop), new THREE.Vector3(x, yBotLeg, zStartLoop), 0.4);

        // Transition to next loop inside upper bank
        if (i < 3) {
          const hNext = upperH[i+1];
          const yBotLegNext = yUpperTop - hNext + coilStaggerY;
          const zStartLoopNext = zStartUpper - (i+1) * zStep;
          addCollinearPoints(points, new THREE.Vector3(x, yBotLeg, zStartLoop), new THREE.Vector3(x, yBotLegNext, zStartLoopNext), 0.4);
        }
      }

      // --- 7. TOP CONNECTION ---
      const yUpperLastBot = yUpperTop - upperH[3] + coilStaggerY;
      const yExit = yUpperTop + 0.5;
      // Go horizontally from last loop front to rise point
      addCollinearPoints(points, new THREE.Vector3(x, yUpperLastBot, zStartUpper - 3 * zStep), new THREE.Vector3(x, yUpperLastBot, zStartUpper), 0.4);
      // Rise vertically to Exit Y
      addCollinearPoints(points, new THREE.Vector3(x, yUpperLastBot, zStartUpper), new THREE.Vector3(x, yExit, zStartUpper), 0.4);

      if (!isCoil2) {
        // Coil 1 exits vertically to Top Header A (front, Z = zhA_top = zStartUpper)
        addCollinearPoints(points, new THREE.Vector3(x, yExit, zStartUpper), new THREE.Vector3(x, headerTopY[0] - 0.125, zStartUpper), 0.4);
      } else {
        // Coil 2 exits horizontally to Top Header B (rear, Z = zhB_top = zEndUpper) then vertically up
        addCollinearPoints(points, new THREE.Vector3(x, yExit, zStartUpper), new THREE.Vector3(x, yExit, zhB_top), 0.4);
        addCollinearPoints(points, new THREE.Vector3(x, yExit, zhB_top), new THREE.Vector3(x, headerTopY[1] - 0.125, zhB_top), 0.4);
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeom = new THREE.TubeGeometry(curve, q.tubeLtrhSamples, ltrhOD / 2, q.tubeLtrhRadial, false); // Higher resolution for nested loops
      const tubeMesh = new THREE.Mesh(tubeGeom, materials.ltrh);
      tubeMesh.castShadow = true;
      tubeMesh.receiveShadow = true;
      tubeMesh.userData = {
        type: 'LTRH Reheater Coil Tube',
        panel: `LTRH Unit ${u + 1}`,
        id: `Coil ${c + 1} (${isCoil2 ? 'Coil 2 - Dotted' : 'Coil 1 - Solid'})`,
        od: state.ltrhOD,
        thickness: 5,
        length: '29.2 m (serpentine)'
      };
      
      ltrhGroup.add(tubeMesh);
    }
  }
}

function initLayerVisibilityControls() {
  const checkboxWaterWall = document.getElementById('layer-waterwall');
  const checkboxRoof = document.getElementById('layer-roof');
  const checkboxLTRH = document.getElementById('layer-ltrh');

  const oldShowRoof = document.getElementById('input-show-roof');
  const oldShowLTRH = document.getElementById('input-show-ltrh');

  if (checkboxWaterWall) {
    checkboxWaterWall.addEventListener('change', (e) => {
      state.showWaterWall = e.target.checked;
      if (boilerGroup) boilerGroup.visible = state.showWaterWall;
      calculateBOM();
    });
  }

  if (checkboxRoof) {
    checkboxRoof.addEventListener('change', (e) => {
      state.showRoof = e.target.checked;
      if (roofGroup) roofGroup.visible = state.showRoof;
      if (oldShowRoof) oldShowRoof.checked = state.showRoof;
      calculateBOM();
    });
  }

  if (checkboxLTRH) {
    checkboxLTRH.addEventListener('change', (e) => {
      state.showLTRH = e.target.checked;
      if (ltrhGroup) ltrhGroup.visible = state.showLTRH;
      if (oldShowLTRH) oldShowLTRH.checked = state.showLTRH;
      calculateBOM();
    });
  }

  // Sync older UI checks to new checkboxes
  if (oldShowRoof) {
    oldShowRoof.addEventListener('change', (e) => {
      state.showRoof = e.target.checked;
      if (checkboxRoof) checkboxRoof.checked = state.showRoof;
      calculateBOM();
    });
  }

  if (oldShowLTRH) {
    oldShowLTRH.addEventListener('change', (e) => {
      state.showLTRH = e.target.checked;
      if (checkboxLTRH) checkboxLTRH.checked = state.showLTRH;
      calculateBOM();
    });
  }
}

// --- 3D Measurement Ruler Helpers ---
function handleRulerClick(point) {
  if (rulerPoints.length >= 2) {
    clearRuler();
  }
  
  rulerPoints.push(point.clone());
  
  // Create sphere mesh at click point
  const sphereGeom = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false }); // green indicator
  const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
  sphereMesh.position.copy(point);
  sphereMesh.renderOrder = 999;
  scene.add(sphereMesh);
  rulerVisualObjects.push(sphereMesh);
  
  if (rulerPoints.length === 2) {
    const p1 = rulerPoints[0];
    const p2 = rulerPoints[1];
    
    // Draw connecting dashed line
    const pointsArr = [p1, p2];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(pointsArr);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x22c55e,
      dashSize: 0.08,
      gapSize: 0.04,
      depthTest: false
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.computeLineDistances();
    line.renderOrder = 998;
    scene.add(line);
    rulerVisualObjects.push(line);
    
    // Calculate exact Euclidean distance
    const distance = p1.distanceTo(p2);
    const distText = `${distance.toFixed(3)} m (${Math.round(distance * 1000)} mm)`;
    
    // Create text sprite label at midpoint
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const labelSprite = createTextSprite(distText);
    labelSprite.position.copy(midPoint);
    labelSprite.position.y += 0.15; // float slightly above the line
    labelSprite.renderOrder = 1000;
    scene.add(labelSprite);
    rulerVisualObjects.push(labelSprite);
    
    // Show toast overlay
    showToast(`Measured Distance: ${distText}`);
  }
}

function clearRuler() {
  rulerVisualObjects.forEach(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    scene.remove(obj);
  });
  rulerVisualObjects = [];
  rulerPoints = [];
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Background box styling
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#22c55e'; // green border
  ctx.lineWidth = 3;
  
  roundRect(ctx, 4, 4, 248, 56, 8, true, true);
  
  // Text styling
  ctx.font = 'bold 20px Outfit, Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.3, 1.0); // proportioned for 256x64 aspect ratio
  return sprite;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function showToast(message) {
  let toast = document.getElementById('ruler-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ruler-toast';
    toast.style.position = 'absolute';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(15, 23, 42, 0.95)';
    toast.style.border = '1px solid #22c55e';
    toast.style.color = '#ffffff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
    toast.style.backdropFilter = 'blur(8px)';
    document.getElementById('canvas-container').appendChild(toast);
  }
  toast.innerText = message;
  toast.style.display = 'block';
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 5000);
}

