/**
 * Unified NTPC Gadarwara & Barh Stage 1 Boiler Expert Cockpit v2.0
 * Content Script - Enhanced Full-Screen Industrial Dashboard Overlay
 *
 * NEW IN v2:
 *  - Full 7-Day Deviation History (localStorage-persisted, day-bucketed)
 *  - Load Ramp Rate gauge (MW/min) with warning/critical thresholds
 *  - Thermal Cycle Crossing Counter (simplified fatigue accumulation proxy)
 *  - Per-Wall Internal Spread Arc Gauges (Front/Left/Right/Rear individually)
 *  - Wall Temperature Gradient Sparkline profiles (spatial tube distribution)
 *  - Tabbed bottom panel: Live Alarms | Today Summary | 7-Day History
 *  - L/R and F/R imbalance breakdown in Fatigue card
 *  - Shift Handover Report generator (downloadable .txt)
 *  - Robust SPA routing with debounced reinit
 */

(function () {
  'use strict';

  ['boiler-expert-launch-btn', 'boiler-fullscreen-dashboard-overlay', 'boiler-launch-widget']
    .forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });

  if (window.boilerCockpitInterval) {
    clearInterval(window.boilerCockpitInterval);
    window.boilerCockpitInterval = null;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. PLANT CONFIGURATION VARIABLES
  // ═══════════════════════════════════════════════════════════════
  let isBarh      = false;
  let isWallFired = false;
  let FIRING_TYPE = 'tangential'; // 'tangential' | 'wall'
  let PLANT_NAME  = 'Gadarwara';
  let PLANT_TECH  = '2×800 MW GE';
  let UNITS       = ['U1', 'U2'];
  let TUBE_RANGE  = { min: 31, max: 51 };
  let DESIGN_MW   = 800;
  const LIMITS    = {};
  let reinitTimeout = null;
  let dataCheckInterval = null;
  let lastRouteSignature = '';
  let transitionToastTimer = null;

  // ── Station Registry: add new NTPC plants here ──
  // All supercritical plants are tangential-fired EXCEPT Barh (wall-fired Doosan)
  // Pattern keys are matched against page URL / title (lowercase)
  const STATION_REGISTRY = [
    { pattern: /barh-stage-ii|barh.*st-?ii|barh.*stage.*2|barh2|82180/i,  name:'Barh Stage 2', firing:'tangential', units:['U4','U5'],      mw:660, tubeRange:{min:11,max:28}, tech:'2×660 MW Tangential Corner-Fired' },
    { pattern: /81956|barh-combustion|barh.*st-?i(?!i)|barh.*stage.*1|barh(?!.*2)(?!.*ii)/i, name:'Barh Stage 1', firing:'wall',       units:['U1','U2','U3'], mw:660, tubeRange:{min:11,max:28}, tech:'Doosan 3×660' },
    { pattern: /83510|47440|gadarwara/i,                            name:'Gadarwara',    firing:'tangential', units:['U1','U2'],      mw:800, tubeRange:{min:31,max:51}, tech:'GE 2×800'    },
    { pattern: /khargone/i,                                         name:'Khargone',     firing:'tangential', units:['U1','U2'],      mw:660, tubeRange:{min:31,max:51}, tech:'BHEL 2×660'  },
    { pattern: /lara/i,                                             name:'Lara',         firing:'tangential', units:['U1','U2'],      mw:800, tubeRange:{min:31,max:51}, tech:'GE 2×800'    },
    { pattern: /82306|sipat/i,                                      name:'Sipat St-II',  firing:'tangential', units:['U4','U5'],      mw:500, tubeRange:{min:31,max:51}, tech:'BHEL 2×500'  },
    { pattern: /mouda/i,                                            name:'Mouda',        firing:'tangential', units:['U1','U2','U3','U4'], mw:660, tubeRange:{min:31,max:51}, tech:'BHEL 4×Unit' },
    { pattern: /telangana/i,                                        name:'Telangana',    firing:'tangential', units:['U1','U2'],      mw:800, tubeRange:{min:31,max:51}, tech:'BHEL 2×800'  },
    { pattern: /kudgi/i,                                            name:'Kudgi',        firing:'tangential', units:['U1','U2','U3'], mw:800, tubeRange:{min:31,max:51}, tech:'L&T 3×800'   },
    { pattern: /tanda/i,                                            name:'Tanda',        firing:'tangential', units:['U5','U6'],      mw:660, tubeRange:{min:31,max:51}, tech:'BHEL 2×660'  },
    { pattern: /nabinagar/i,                                        name:'Nabinagar',    firing:'tangential', units:['U1','U2','U3'], mw:660, tubeRange:{min:31,max:51}, tech:'BHEL 3×660'  },
    { pattern: /darlipali/i,                                        name:'Darlipali',    firing:'tangential', units:['U1','U2'],      mw:800, tubeRange:{min:31,max:51}, tech:'L&T 2×800'   },
    { pattern: /north-karanpura|n.*karanpura/i,                     name:'N Karanpura',  firing:'tangential', units:['U1','U2','U3'], mw:660, tubeRange:{min:31,max:51}, tech:'BHEL 3×660'  },
    { pattern: /talcher/i,                                          name:'Talcher',      firing:'tangential', units:['U1','U2','U3','U4','U5','U6'], mw:500, tubeRange:{min:31,max:51}, tech:'BHEL 600MW' },
    { pattern: /patratu/i,                                          name:'Patratu',      firing:'tangential', units:['U1'], mw:800, tubeRange:{min:31,max:51}, tech:'BHEL 3×800'  }
  ];

  // ═══════════════════════════════════════════════════════════════
  // 3. GLOBAL STATE
  // ═══════════════════════════════════════════════════════════════
  let activeAlarms    = [];
  let lifecycleEvents = [];
  const shiftLogs     = [];    // current session in-memory alarm log
  const history       = {};    // per-unit TMT history for RoC smoothing
  const loadHistory   = {};    // per-unit load circular buffer for ramp rate
  const cycleCrossings = {};   // per-unit thermal cycle crossing counter
  const prevMeanTmt          = {};  // per-unit previous mean WW temperature
  const subcriticalHistory    = {};  // per-unit rolling TMT buffer for oscillation σ detection
  const cdfAccumulation       = {};  // uncalibrated session thermal-exposure screening accumulator
  const wwMeanHistory         = {};  // per-unit rolling meanWW history for Cyclic Index (CI)
  const performanceStats      = [];

  // ═══════════════════════════════════════════════════════════════
  // 4. LOCALSTORAGE HELPERS (7-day persistent history)
  // ═══════════════════════════════════════════════════════════════

  function getDayKey(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - (daysAgo || 0));
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function getStoragePrefix() {
    return `ntpc_boiler_${PLANT_NAME.replace(/\s+/g, '_')}`;
  }

  function saveAlarmToStorage(alarm) {
    try {
      const key = `${getStoragePrefix()}_events_${getDayKey(0)}`;
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(alarm);
      if (arr.length > 500) arr.splice(0, arr.length - 500);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (_) {}
  }

  function loadEventsForDay(daysAgo) {
    try {
      const key = `${getStoragePrefix()}_events_${getDayKey(daysAgo)}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (_) { return []; }
  }

  function saveDailyStats(stats) {
    try {
      const key = `${getStoragePrefix()}_daily_${getDayKey(0)}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      const merged = {
        peakTmt:      Math.max(prev.peakTmt      || 0, stats.peakTmt      || 0),
        maxSpread:    Math.max(prev.maxSpread     || 0, stats.maxSpread    || 0),
        maxStress:    Math.max(prev.maxStress     || 0, stats.maxStress    || 0),
        maxRampRate:  Math.max(prev.maxRampRate   || 0, stats.maxRampRate  || 0),
        maxFatigueRisk: Math.max(prev.maxFatigueRisk || 0, stats.maxFatigueRisk || 0),
        alarmCount:   (prev.alarmCount   || 0) + (stats.newAlarms   || 0),
        criticalCount:(prev.criticalCount|| 0) + (stats.newCritical || 0),
        cycleCount:   Math.max(prev.cycleCount  || 0, stats.cycleCount  || 0),
      };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (_) {}
  }

  function loadDailyStats(daysAgo) {
    try {
      const key = `${getStoragePrefix()}_daily_${getDayKey(daysAgo)}`;
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_) { return null; }
  }

  function purgeOldData() {
    try {
      const cutoff = getDayKey(8);
      const prefix = getStoragePrefix();
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(prefix)) {
          const m = k.match(/(\d{4}-\d{2}-\d{2})$/);
          if (m && m[1] < cutoff) localStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }

  function isHubPage() {
    const hrefL = window.location.href.toLowerCase();
    const titleL = document.title.toLowerCase();
    return hrefL.includes('combusion-monitoring-dashboards') || 
           hrefL.includes('combustion-monitoring-dashboards') ||
           titleL.includes('combusion-monitoring-dashboards') ||
           titleL.includes('combustion-monitoring-dashboards');
  }

  function isMockPage() {
    const host = window.location.hostname;
    return window.location.href.includes('mock-pivision') || host === 'localhost' || host === '127.0.0.1';
  }

  function getRouteSignature() {
    return `${window.location.href}|${document.title}`;
  }

  function findStationMatch(allowLocalFallback) {
    const hrefL  = window.location.href.toLowerCase();
    const titleL = document.title.toLowerCase();

    for (const plant of STATION_REGISTRY) {
      if (plant.pattern.test(hrefL)) return plant;
    }
    for (const plant of STATION_REGISTRY) {
      if (plant.pattern.test(titleL)) return plant;
    }
    if (allowLocalFallback && isMockPage()) {
      return STATION_REGISTRY.find(p => p.name === 'Gadarwara') || STATION_REGISTRY[2];
    }
    return null;
  }

  function showStationTransition(message) {
    let toast = document.getElementById('boiler-transition-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'boiler-transition-toast';
      toast.className = 'boiler-transition-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="bt-spinner"></span><span>${message}</span>`;
    toast.classList.add('active');
    if (transitionToastTimer) clearTimeout(transitionToastTimer);
    transitionToastTimer = setTimeout(() => toast.classList.remove('active'), 1800);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. PLANT CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  function configurePlant() {
    let matched = findStationMatch(true);
    if (!matched) {
      console.log('[BoilerCockpit] No matching station page found in registry. Extension idle.');
      return false;
    }

    isBarh      = matched.name.toLowerCase().includes('barh');
    isWallFired = (matched.firing === 'wall');
    PLANT_NAME  = matched.name;
    PLANT_TECH  = matched.tech || (isBarh ? '3×660 MW Doosan' : '2×800 MW GE');
    UNITS       = matched.units;
    TUBE_RANGE  = Object.assign({}, matched.tubeRange);
    FIRING_TYPE = matched.firing;
    DESIGN_MW   = matched.mw || 800;

    UNITS.forEach(u => {
      if (!history[u])             history[u]             = { values: {}, timestamps: {}, trend: [], rates: {} };
      if (!loadHistory[u])         loadHistory[u]         = [];
      if (!cycleCrossings[u])      cycleCrossings[u]      = 0;
      if (prevMeanTmt[u] === undefined)      prevMeanTmt[u]      = null;
      if (!subcriticalHistory[u])  subcriticalHistory[u]  = [];
      if (cdfAccumulation[u] === undefined)  cdfAccumulation[u]  = 0;
      if (!wwMeanHistory[u])       wwMeanHistory[u]       = [];
    });

    LIMITS.tempWarning   = isWallFired ? 470 : 480;
    LIMITS.tempCritical  = isWallFired ? 500 : 510;
    LIMITS.tempFatal     = isWallFired ? 530 : 540;
    LIMITS.deltaTWarning = 30;
    LIMITS.deltaTCritical= 45;
    LIMITS.rocWarning    = 1.5;
    LIMITS.rocCritical   = 3.0;
    LIMITS.rocFatal      = 5.0;
    LIMITS.balanceWarning   = 25;
    LIMITS.balanceCritical  = 50;
    LIMITS.stressWarning    = 100;
    LIMITS.stressCritical   = 150;
    LIMITS.rampWarning      = 3.0;   // MW/min
    LIMITS.rampCritical     = 6.0;
    LIMITS.spreadWallWarning  = isWallFired ? 40 : 50;
    LIMITS.spreadWallCritical = isWallFired ? 60 : 75;

    // ── Barh Stage 1 subcritical pressure thresholds ──
    LIMITS.subcriticalLoadPct = isWallFired ? 0.50 : 0.35;  // < 50% MCR → subcritical steam state
    LIMITS.bensonMinFlowPct   = isWallFired ? 0.35 : 0.25;  // < 35% MCR → Benson recirculation valve opens
    LIMITS.tmtOscThreshold    = isWallFired ? 12   : 18;    // °C std-dev — oscillation alarm threshold

    // ── Weld fatigue (all stations) ──
    LIMITS.weldStressCritical = 170;   // screening-index threshold; not validated MPa
    LIMITS.cdfWarning         = 0.50;  // session exposure screening threshold
    LIMITS.cdfCritical        = 0.75;  // session exposure screening threshold

    // ── Differential Expansion Index ──
    LIMITS.deiWarning         = 0.12;  // 12% above expected → weld stress amplified
    LIMITS.deiCritical        = 0.22;  // 22% above expected → critical crack risk
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. REINIT & SCHEDULE
  // ═══════════════════════════════════════════════════════════════
  function reinitCockpit() {
    if (dataCheckInterval) clearInterval(dataCheckInterval);
    if (window.boilerCockpitInterval) clearInterval(window.boilerCockpitInterval);
    window.boilerCockpitInterval = null;

    // Save previous active state of the overlay
    const oldOverlay = document.getElementById('boiler-fullscreen-dashboard-overlay');
    const wasActive  = oldOverlay ? oldOverlay.classList.contains('active') : false;
    if (oldOverlay) oldOverlay.remove();

    const oldBtn = document.getElementById('boiler-launch-widget');
    if (oldBtn) oldBtn.remove();

    if (isHubPage()) {
      console.log('[BoilerCockpit] Navigated to Hub page. Cleaning up cockpit overlay.');
      document.body.style.overflow = '';
      return;
    }

    // Clear all history maps to prevent stale data between station switching
    for (const key in history) delete history[key];
    for (const key in loadHistory) delete loadHistory[key];
    for (const key in cycleCrossings) delete cycleCrossings[key];
    for (const key in prevMeanTmt) delete prevMeanTmt[key];
    for (const key in subcriticalHistory) delete subcriticalHistory[key];
    for (const key in cdfAccumulation) delete cdfAccumulation[key];
    for (const key in wwMeanHistory) delete wwMeanHistory[key];

    if (!configurePlant()) {
      document.body.style.overflow = '';
      return;
    }

    purgeOldData();
    console.log('[BoilerCockpit v2] Re-initializing for: ' + PLANT_NAME);
    showStationTransition(`Loading ${PLANT_NAME} cockpit`);

    injectFullScreenOverlay();

    if (wasActive) {
      const newOverlay = document.getElementById('boiler-fullscreen-dashboard-overlay');
      if (newOverlay) { newOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    }

    injectLaunchButton();
    startCockpitEngine(true); // Start in Fast-Polling Mode
    lastRouteSignature = getRouteSignature();
  }

  function scheduleReinit(delay) {
    if (reinitTimeout) clearTimeout(reinitTimeout);
    showStationTransition('Switching boiler station');
    reinitTimeout = setTimeout(() => { reinitTimeout = null; reinitCockpit(); }, delay);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  function average(arr) {
    const v = arr.filter(x => !isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  }

  function parseValueFromText(text) {
    if (!text) return NaN;
    if (text.includes('\n')) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const clean = line.replace(/(mw|t\/h|tph|deg|°c|%|tmt|vww)/i, '').trim();
        const num = parseFloat(clean);
        if (!isNaN(num) && /^[-+]?[0-9]*\.?[0-9]+$/.test(clean)) {
          return num;
        }
      }
      if (lines.length > 1) {
        const cleanVal = lines[1].replace(/(mw|t\/h|tph|deg|°c|%|tmt|vww)/i, '').trim();
        const num = parseFloat(cleanVal);
        if (!isNaN(num)) return num;
      }
    }
    const clean = text.replace(/(mw|t\/h|tph|deg|°c|%|tmt|vww)/i, '').trim();
    const m = clean.match(/[-+]?[0-9]*\.?[0-9]+/);
    return m ? parseFloat(m[0]) : NaN;
  }

  function getElementGeometry(el) {
    const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return {
      xPos: rect ? rect.left : Number.NaN,
      yPos: rect ? rect.top : Number.NaN
    };
  }

  function compareTubeGeometry(a, b) {
    const ay = Number.isFinite(a.yPos) ? a.yPos : Number.NaN;
    const by = Number.isFinite(b.yPos) ? b.yPos : Number.NaN;
    const ax = Number.isFinite(a.xPos) ? a.xPos : Number.NaN;
    const bx = Number.isFinite(b.xPos) ? b.xPos : Number.NaN;

    if (!Number.isNaN(ay) && !Number.isNaN(by) && Math.abs(ay - by) > 12) return ay - by;
    if (!Number.isNaN(ax) && !Number.isNaN(bx) && Math.abs(ax - bx) > 2) return ax - bx;
    if ((a.screenOrder || 0) !== (b.screenOrder || 0)) return (a.screenOrder || 0) - (b.screenOrder || 0);
    return (a.tube || 0) - (b.tube || 0);
  }

  function normalizeParsedTubes(unitsData) {
    Object.values(unitsData).forEach(data => {
      data.duplicateTubeCount = 0;
      ['left','right','front','rear'].forEach(wall => {
        const ordered = [...(data.tubes[wall] || [])].sort(compareTubeGeometry);
        const seen = new Set();
        const unique = [];
        ordered.forEach(t => {
          const key = Number.isFinite(t.tube) ? String(t.tube) : String(t.tag || '');
          if (seen.has(key)) {
            data.duplicateTubeCount += 1;
            return;
          }
          seen.add(key);
          unique.push(t);
        });
        data.tubes[wall] = unique;
      });
    });
  }

  function pickByGeometry(list, count, sidePreference) {
    const ordered = [...(list || [])].sort(compareTubeGeometry);
    if (ordered.length <= count) return ordered;

    if (sidePreference === 'inner-left' || sidePreference === 'inner-right') {
      const withX = ordered.filter(t => Number.isFinite(t.xPos));
      if (withX.length >= count) {
        const xs = withX.map(t => t.xPos).sort((a, b) => a - b);
        const medianX = xs[Math.floor(xs.length / 2)];
        const preferred = withX
          .filter(t => sidePreference === 'inner-left' ? t.xPos >= medianX : t.xPos <= medianX)
          .sort(compareTubeGeometry);
        if (preferred.length >= count) return preferred.slice(0, count);
      }
    }

    if (sidePreference === 'inner-front' || sidePreference === 'inner-rear') {
      const withY = ordered.filter(t => Number.isFinite(t.yPos));
      if (withY.length >= count) {
        const ys = withY.map(t => t.yPos).sort((a, b) => a - b);
        const medianY = ys[Math.floor(ys.length / 2)];
        const preferred = withY
          .filter(t => sidePreference === 'inner-front' ? t.yPos <= medianY : t.yPos >= medianY)
          .sort(compareTubeGeometry);
        if (preferred.length >= count) return preferred.slice(0, count);
      }
    }

    return ordered.slice(0, count);
  }

  function remapBarhStage1TubesByScreenGeometry(unitsData) {
    if (PLANT_NAME !== 'Barh Stage 1') return;

    Object.values(unitsData).forEach(data => {
      const all = ['left','right','front','rear'].flatMap(wall => data.tubes[wall] || []);
      const visible = all.filter(t => Number.isFinite(t.xPos) && Number.isFinite(t.yPos));
      if (visible.length < 8) return;

      const xs = visible.map(t => t.xPos).sort((a, b) => a - b);
      const ys = visible.map(t => t.yPos).sort((a, b) => a - b);
      const centerX = xs[Math.floor(xs.length / 2)];
      const centerY = ys[Math.floor(ys.length / 2)];

      data.tubes = { left: [], right: [], front: [], rear: [] };
      visible.forEach(t => {
        const dx = t.xPos - centerX;
        const dy = t.yPos - centerY;
        let wall;
        if (Math.abs(dy) > Math.abs(dx)) wall = dy < 0 ? 'rear' : 'front';
        else wall = dx < 0 ? 'left' : 'right';
        data.tubes[wall].push(t);
      });
    });
  }

  function applyBarhStage1Run3Selection(unitsData) {
    if (PLANT_NAME !== 'Barh Stage 1') return;

    Object.values(unitsData).forEach(data => {
      data.run3ExcludedTubeCount = 0;
      const before = ['left','right','front','rear'].reduce((sum, wall) => sum + (data.tubes[wall] || []).length, 0);

      data.tubes.front = pickByGeometry(data.tubes.front, 6, 'inner-front');
      data.tubes.rear  = pickByGeometry(data.tubes.rear,  6, 'inner-rear');
      data.tubes.left  = pickByGeometry(data.tubes.left,  11, 'inner-left');
      data.tubes.right = pickByGeometry(data.tubes.right, 11, 'inner-right');

      const after = ['left','right','front','rear'].reduce((sum, wall) => sum + (data.tubes[wall] || []).length, 0);
      data.run3ExcludedTubeCount = Math.max(0, before - after);
    });
  }


  function formatDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. DIAGNOSTICS ENGINE
  // ═══════════════════════════════════════════════════════════════
  function performDiagnostics() {
    // SPA routing check
    const matched = findStationMatch(true) || STATION_REGISTRY.find(p => p.name === 'Gadarwara') || STATION_REGISTRY[2];
    
    const checkBarh = matched.name.toLowerCase().includes('barh');
    if (checkBarh !== isBarh || PLANT_NAME !== matched.name) {
      console.log(`[BoilerCockpit] Plant changed → ${matched.name}. Reinit...`);
      scheduleReinit(100);
      return null;
    }

    const now = Date.now();
    const unitsData = {};
    UNITS.forEach(u => {
      unitsData[u] = {
        load: NaN, o2: NaN, air: NaN, pa: NaN, coal: NaN,
        eco: NaN, ecoPathA: NaN, ecoPathB: NaN, mshrh: NaN,
        burnerTilt: NaN, mills: {},
        dampers: {}, hfgLhs: NaN, hfgRhs: NaN, pressure: NaN, bensonValve: NaN,
        tubes: { left: [], right: [], front: [], rear: [] }
      };
    });

    let minTube = Infinity;
    let maxTube = -Infinity;

    let screenOrder = 0;
    document.querySelectorAll('[title]').forEach(el => {
      screenOrder += 1;
      const title   = el.title || '';
      const valEl   = el.querySelector('.piv-value') || el.querySelector('[class*="value"]');
      const text    = (valEl ? valEl.innerText : (el.innerText || el.textContent || '')).trim();
      const tagLine = title.split('\n')[0].trim();
      const val     = parseValueFromText(text);
      if (isNaN(val)) return;

      if (isBarh) {
        // ─── BARH 3×660 MW & STAGE 2 WALL-FIRED TAG PARSER ───
        let m;
        // Barh Stage 1 Load
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0BAC10CE101/i) || tagLine.match(/([1-9])0BAC10CE101/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].load = val; }

        // Barh Stage 2 Load (Active Power)
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0CLPM_MW_PV/i) || tagLine.match(/([45])0CLPM_MW_PV/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].load = val; }

        // Barh Stage 1 O2
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HBK[23]0CQ00[34]XQ10/i) || tagLine.match(/([1-9])0HBK[23]0CQ00[34]XQ10/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].o2 = val; }

        // Barh Stage 2 O2
        m = tagLine.match(/#([45])\s*O2\s*AT\s*ECO/i) || tagLine.match(/([45])0HNA02CQ001/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].o2 = val; }

        // Barh Stage 1 Air Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HHY02EU005/i) || tagLine.match(/([1-9])0HHY02EU005/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].air = val; }

        // Barh Stage 2 Air Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0CLPM_AF_PV/i) || tagLine.match(/([45])0CLPM_AF_PV/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].air = val; }

        // Barh Stage 1 PA Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HYY02EU002XQ10/i) || tagLine.match(/([1-9])0HYY02EU002XQ10/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].pa = val; }

        // Barh Stage 2 PA Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\0([45])_PA_Flow/i) || tagLine.match(/0([45])_PA_Flow/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].pa = val; }

        // Barh Stage 1 Coal Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HYY04EU005/i) || tagLine.match(/([1-9])0HYY04EU005/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].coal = val; }

        // Barh Stage 2 Coal Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0CV_COAL_FLOW/i) || tagLine.match(/([45])0CV_COAL_FLOW/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].coal = val; }

        // Barh Stage 1 Eco Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HYY02EU004([AB])/i) || tagLine.match(/([1-9])0HYY02EU004([AB])/i);
        if (m) {
          const u='U'+m[1];
          if (unitsData[u]) {
            if (m[2]==='A') unitsData[u].ecoPathA = val;
            else            unitsData[u].ecoPathB = val;
          }
        }

        // Barh Stage 2 Eco Flow
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0HLA01CF100/i) || tagLine.match(/([45])0HLA01CF100/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].eco = val; }

        // Barh Stage 1 Steam Temp
        m = tagLine.match(/\\\\10\.1\.65\.130\\([1-9])0HAH[78]4CT90[14]/i) || tagLine.match(/([1-9])0HAH[78]4CT90[14]/i);
        if (m) { const u='U'+m[1]; if(unitsData[u]) unitsData[u].mshrh = val; }

        // Barh Stage 2 Steam Temp style 1 (e.g. 40LBA11CT100_S)
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0LB([AB])\d+CT\d+/i) || tagLine.match(/([45])0LB([AB])\d+CT\d+/i);
        if (m) {
          const u = 'U' + m[1];
          if (unitsData[u]) {
            if (isNaN(unitsData[u].mshrh) || val > unitsData[u].mshrh) {
              unitsData[u].mshrh = val;
            }
          }
        }

        // Barh Stage 2 Steam Temp style 2 (e.g. 40SH_FINISH_MAX)
        m = tagLine.match(/\\\\10\.1\.65\.130\\([45])0(?:SH|RH)_(?:FINISH|PLATEN)_MAX/i) || tagLine.match(/([45])0(?:SH|RH)_(?:FINISH|PLATEN)_MAX/i);
        if (m) {
          const u = 'U' + m[1];
          if (unitsData[u]) {
            if (isNaN(unitsData[u].mshrh) || val > unitsData[u].mshrh) {
              unitsData[u].mshrh = val;
            }
          }
        }

        // Barh Stage 1 Run-3 inner tier is HAD53/HAD63. HAD54/HAD64 are the
        // outer tier and must not enter analytics. Screen geometry assigns the
        // accepted points to front/rear/LHS/RHS (6/6/11/11).
        // Barh Stage 2 remains tangential/corner-fired and uses U4/U5 water-wall code families.
        const isStage1 = (PLANT_NAME === 'Barh Stage 1');
        const allowedCodes = isStage1 ? '53|63' : '10|20|30|40|1|2|3|4';
        const allowedUnits = isStage1 ? '[123]' : '[45]';
        const tubeRegex = new RegExp(`\\\\\\\\10\\.1\\.65\\.130\\\\(${allowedUnits})0HAD(${allowedCodes})0?CT(\\d+)\\b`, 'i');
        const tubeRegexFallback = new RegExp(`(?:^|\\\\|\\s)(${allowedUnits})0HAD(${allowedCodes})0?CT(\\d+)\\b`, 'i');

        const normalizedTubeTag = tagLine.replace(/XQ10\b/i, '').replace(/\.OUT\b/i, '');
        m = normalizedTubeTag.match(tubeRegex) || normalizedTubeTag.match(tubeRegexFallback);
        if (m) {
          const u = 'U'+m[1];
          const wallMap = isStage1
            ? { '53':'left', '63':'right' }
            : {
              '10':'left', '1':'left',
              '20':'right', '2':'right',
              '30':'front', '3':'front',
              '40':'rear', '4':'rear'
            };
          const wall = wallMap[m[2]];
          const tubeNum = parseInt(m[3]);
          if (unitsData[u] && wall) {
            const geom = getElementGeometry(el);
            unitsData[u].tubes[wall].push({ tube: tubeNum, val, tag: tagLine, xPos: geom.xPos, yPos: geom.yPos, screenOrder });
            if (tubeNum < minTube) minTube = tubeNum;
            if (tubeNum > maxTube) maxTube = tubeNum;
          }
        }

      } else {
        // ─── TANGENTIAL / GENERIC TAG PARSER ───
        const unitLoadMatch = tagLine.match(/([1-9])LOAD_ACTUAL_MV3/i) || tagLine.match(/LOAD_ACTUAL_MV3_([1-9])/i);
        if (unitLoadMatch) {
          const u = 'U' + unitLoadMatch[1];
          if (unitsData[u]) unitsData[u].load = val;
        }

        // Darlipali-specific active power (load) tag matching: 10-GEN-MW or 20-GEN-MW
        const darlipaliLoadMatch = tagLine.match(/([1-9])0-GEN-MW/i);
        if (darlipaliLoadMatch) {
          const u = 'U' + darlipaliLoadMatch[1];
          if (unitsData[u]) unitsData[u].load = val;
        }

        // Darlipali-specific O2 tag matching: #1 Darlipali FG O2
        const o2Match = tagLine.match(/([1-9])(?:.*Darlipali.*)?FG\s*O2\.Value/i) || tagLine.match(/([1-9])O2_FG/i);
        if (o2Match) {
          const u = 'U' + o2Match[1];
          if (unitsData[u]) unitsData[u].o2 = val;
        }

        // Darlipali-specific air flow tag matching: 10-TOTAL-AIR-FLW1
        const darlipaliAirMatch = tagLine.match(/([1-9])0-TOTAL-AIR-FLW/i);
        if (darlipaliAirMatch) {
          const u = 'U' + darlipaliAirMatch[1];
          if (unitsData[u]) unitsData[u].air = val;
        }

        // Patratu-specific tag scrapers
        const patratuLoad = tagLine.match(/U([1-9])_LOAD_ACTUAL/i);
        if (patratuLoad) {
          const u = 'U' + patratuLoad[1];
          if (unitsData[u]) unitsData[u].load = val;
        }
        const patratuO2 = tagLine.match(/([1-9])0?CLPM_O2_PV/i);
        if (patratuO2) {
          const u = 'U' + patratuO2[1];
          if (unitsData[u]) unitsData[u].o2 = val;
        }
        const patratuAir = tagLine.match(/([1-9])0?CLPM_AF_PV/i);
        if (patratuAir) {
          const u = 'U' + patratuAir[1];
          if (unitsData[u]) unitsData[u].air = val;
        }
        const patratuCoal = tagLine.match(/([1-9])TOT_RAWCOAL_FLO/i);
        if (patratuCoal) {
          const u = 'U' + patratuCoal[1];
          if (unitsData[u]) unitsData[u].coal = val;
        }
        const patratuTilt = tagLine.match(/([1-9])0?CLPM_BT_U_CMD/i);
        if (patratuTilt) {
          const u = 'U' + patratuTilt[1];
          if (unitsData[u]) unitsData[u].burnerTilt = val;
        }
        const patratuMill = tagLine.match(/([1-9])0?CLPM_Feedrate_Mill([A-J])/i);
        if (patratuMill) {
          const u = 'U' + patratuMill[1];
          const mill = patratuMill[2].toUpperCase();
          if (unitsData[u]) {
            if (!unitsData[u].mills) unitsData[u].mills = {};
            unitsData[u].mills[mill] = val;
          }
        }

        // Steam temperature parser (LBA11/LBB11 main/reheat steam style)
        const mSteam = tagLine.match(/([1-9])0?LB([AB])\d+(?:CT)?\d+/i);
        if (mSteam && !tagLine.toUpperCase().includes('SP')) {
          const u = 'U' + mSteam[1];
          if (unitsData[u]) {
            if (isNaN(unitsData[u].mshrh) || val > unitsData[u].mshrh) {
              unitsData[u].mshrh = val;
            }
          }
        }

        if      (tagLine.includes('1LOAD_ACTUAL_MV3') && unitsData.U1)  unitsData.U1.load  = val;
        else if (tagLine.includes('2LOAD_ACTUAL_MV3') && unitsData.U2)  unitsData.U2.load  = val;
        else if (tagLine.includes('1O2_FG') && unitsData.U1)             unitsData.U1.o2   = val;
        else if (tagLine.includes('2O2_FG_AHIL_AVG') && unitsData.U2)   unitsData.U2.o2   = val;
        else if (tagLine.includes('1TotalAir') && unitsData.U1)          unitsData.U1.air  = val;
        else if (tagLine.includes('2TotalAirFlow') && unitsData.U2)      unitsData.U2.air  = val;
        else if (tagLine.includes('1TOTALPA') && unitsData.U1)           unitsData.U1.pa   = val;
        else if (tagLine.includes('2TOTALPA') && unitsData.U2)           unitsData.U2.pa   = val;
        else if (tagLine.includes('1TOT_RawCoal_Flw') && unitsData.U1)  unitsData.U1.coal = val;
        else if (tagLine.includes('2TOT_RawCoal_Flw') && unitsData.U2)  unitsData.U2.coal = val;
        else if (tagLine.includes('1HAC10DF901') && unitsData.U1)        unitsData.U1.eco  = val;
        else if (tagLine.includes('2HAC10DF901') && unitsData.U2)        unitsData.U2.eco  = val;
        else if (tagLine.includes('1FINALSHMAX') && unitsData.U1)        unitsData.U1.mshrh = val;
        else if (tagLine.includes('2FINALSHMAX') && unitsData.U2)        unitsData.U2.mshrh = val;

        // Gadarwara OFA/SOFA/CCOFA actual feedback.
        const namedDamper = tagLine.match(/U([1-9])\s+(CCOFA|SOFA)-([A-E])\s+Damper/i);
        if (namedDamper) {
          const u = 'U' + namedDamper[1];
          if (unitsData[u]) unitsData[u].dampers[`${namedDamper[2].toUpperCase()}-${namedDamper[3].toUpperCase()}`] = val;
        }
        const kksSofa = tagLine.match(/([1-9])0HHL95AA(11[3-5])YT23/i);
        if (kksSofa) {
          const u = 'U' + kksSofa[1];
          const suffixMap = { '113': 'SOFA-C', '114': 'SOFA-D', '115': 'SOFA-E' };
          if (unitsData[u]) unitsData[u].dampers[suffixMap[kksSofa[2]]] = val;
        }

        // Hot flue-gas temperatures at PSH outlet: HBK10=LHS, HBK30=RHS.
        const hfg = tagLine.match(/([1-9])HBK(10|30)CT002/i);
        if (hfg) {
          const u = 'U' + hfg[1];
          if (unitsData[u]) {
            if (hfg[2] === '10') unitsData[u].hfgLhs = val;
            else unitsData[u].hfgRhs = val;
          }
        }

        // Generic KKS code parser for load, o2, air, pa, coal, etc.
        const uMatches = tagLine.match(/(?:\\|^)(?:[a-zA-Z0-9_\-\.]+)?\\?([1-9])0?([A-Z]{3})\d+([A-Z0-9]{2,5})\d*/i);
        if (uMatches && !tagLine.toUpperCase().includes('SP')) {
          const u = 'U' + uMatches[1];
          const kksSub = uMatches[2];
          const kksComp = uMatches[3];
          if (unitsData[u]) {
            if (kksSub === 'BAC' && isNaN(unitsData[u].load)) unitsData[u].load = val;
            if (kksSub === 'HBK' && isNaN(unitsData[u].o2)) unitsData[u].o2 = val;
            if (kksSub === 'HHY' && isNaN(unitsData[u].air)) unitsData[u].air = val;
            if (kksSub === 'HAC' && isNaN(unitsData[u].eco)) unitsData[u].eco = val;
            if (kksSub === 'HFE' && isNaN(unitsData[u].pa)) unitsData[u].pa = val;
            if (kksSub === 'HFB' && isNaN(unitsData[u].coal)) unitsData[u].coal = val;
            if (kksSub === 'HYY' && kksComp.includes('EU')) {
              if (tagLine.includes('EU002') && isNaN(unitsData[u].pa)) unitsData[u].pa = val;
              if (tagLine.includes('EU005') && isNaN(unitsData[u].coal)) unitsData[u].coal = val;
            }
          }
        }

        // Generic waterwall KKS: ([1-9])0?HAD(10|20|30|40|1|2|3|4)0?CT(\d+)
        const m = tagLine.match(/(?:\\|^)(?:[a-zA-Z0-9_\-\.]+)?\\?([1-9])0?HAD(10|20|30|40|1|2|3|4)0?CT(\d+)/i);
        if (m) {
          const u = 'U'+m[1];
          const wallMap = {
            '1':'left','10':'left',
            '2':'right','20':'right',
            '3':'front','30':'front',
            '4':'rear','40':'rear'
          };
          const wall = wallMap[m[2]];
          const tubeNum = parseInt(m[3]);
          if (unitsData[u] && wall) {
            const geom = getElementGeometry(el);
            unitsData[u].tubes[wall].push({ tube: tubeNum, val, tag: tagLine, xPos: geom.xPos, yPos: geom.yPos, screenOrder });
            if (tubeNum < minTube) minTube = tubeNum;
            if (tubeNum > maxTube) maxTube = tubeNum;
          }
        }
      }

      // ─── MOCK / PISERVER TAG PARSER FOR LOCAL TESTING ───
      let mMock = tagLine.match(/\\\\PISERVER\\(?:Gadarwara|Barh)\.U([1-9])\.WW_TMT_(LEFT|RIGHT|FRONT|REAR)_(\d+)\.PV/i);
      if (mMock) {
        const u = 'U' + mMock[1];
        const wall = mMock[2].toLowerCase();
        const mockTubeId = parseInt(mMock[3]); // 1 or 2
        const tubeNum = isBarh ? (mockTubeId === 1 ? 15 : 25) : (mockTubeId === 1 ? 35 : 45);
        if (unitsData[u]) {
          const geom = getElementGeometry(el);
          unitsData[u].tubes[wall].push({ tube: tubeNum, val, tag: tagLine, xPos: geom.xPos, yPos: geom.yPos, screenOrder });
        }
      }
      
      let mLoadMock = tagLine.match(/\\\\PISERVER\\(?:Gadarwara|Barh)\.U([1-9])\.BoilerLoad\.PV/i);
      if (mLoadMock) {
        const u = 'U' + mLoadMock[1];
        if (unitsData[u]) {
          unitsData[u].load = val;
        }
      }
    });

    normalizeParsedTubes(unitsData);
    remapBarhStage1TubesByScreenGeometry(unitsData);
    normalizeParsedTubes(unitsData);
    applyBarhStage1Run3Selection(unitsData);

    if (minTube !== Infinity && maxTube !== -Infinity) {
      if (TUBE_RANGE.min !== minTube || TUBE_RANGE.max !== maxTube) {
        TUBE_RANGE = { min: minTube, max: maxTube };
        console.log(`[BoilerCockpit] Dynamic Tube Range detected: ${minTube} - ${maxTube}`);
      }
    }

    const mockMode = isMockPage();
    UNITS.forEach(u => {
      const data = unitsData[u];
      const noTubesScraped = ['left','right','front','rear'].every(w => !data.tubes[w] || data.tubes[w].length === 0);
      data.dataQuality = {
        source: mockMode ? 'MOCK' : 'LIVE_PI',
        syntheticTubes: false,
        duplicateTubeCount: data.duplicateTubeCount || 0,
        run3ExcludedTubeCount: data.run3ExcludedTubeCount || 0,
        tubeCount: ['left','right','front','rear'].reduce((sum, w) => sum + ((data.tubes[w] || []).length), 0),
        missingInputs: [],
        assumedInputs: []
      };

      if (mockMode) {
        ['left','right','front','rear'].forEach(wall => {
          const t1 = data.tubes[wall] ? (data.tubes[wall].find(t => t.tube === (isBarh ? 15 : 35)) || data.tubes[wall].find(t => t.tube === 1)) : null;
          const t2 = data.tubes[wall] ? (data.tubes[wall].find(t => t.tube === (isBarh ? 25 : 45)) || data.tubes[wall].find(t => t.tube === 2)) : null;
          const unitOffline = (!isNaN(data.load) && data.load < 20);
          const val1 = t1 ? t1.val : (unitOffline ? 50 : 410);
          const val2 = t2 ? t2.val : (unitOffline ? 52 : 415);
          
          const ampMap = { left: 8, right: 6, front: 4, rear: 5 };
          const amp = ampMap[wall] || 5;
          data.tubes[wall] = [];
          let tMin, tMax;
          if (PLANT_NAME === 'Barh Stage 1') {
            if (wall === 'left' || wall === 'right') {
              tMin = 1; tMax = 11; // Run-3 inner tier: 11 side-wall points
            } else {
              tMin = 1; tMax = 6; // Run-3 inner tier: 6 front/rear points
            }
          } else if (!isBarh) { // Gadarwara and generic
            tMin = 31;
            tMax = (wall === 'left' || wall === 'rear') ? 50 : 51; // 20 or 21 tubes
          } else { // Barh Stage 2 (tangential)
            tMin = TUBE_RANGE.min || 11;
            tMax = TUBE_RANGE.max || 28; // default 18 tubes
          }
          const diff = tMax - tMin;
          for (let t = tMin; t <= tMax; t++) {
            const pct = diff > 0 ? (t - tMin) / diff : 0;
            let val = val1 + pct * (val2 - val1);
            val += Math.sin(t * 0.8) * (unitOffline ? 0.5 : amp);
            data.tubes[wall].push({ tube: t, val, tag: `\\\\PISERVER\\${PLANT_NAME}.${u}.WW_TMT_${wall.toUpperCase()}_${t}.PV` });
          }
        });
        data.dataQuality.syntheticTubes = noTubesScraped;
        data.dataQuality.tubeCount = ['left','right','front','rear'].reduce((sum, w) => sum + ((data.tubes[w] || []).length), 0);
      } else if (noTubesScraped) {
        data.dataQuality.missingInputs.push('WW MTM');
      }

      ['load','o2','air','pa','coal','eco','mshrh'].forEach(k => {
        if (isNaN(data[k])) data.dataQuality.missingInputs.push(k.toUpperCase());
      });
    });

    const results = {};
    UNITS.forEach(u => {
      const data = unitsData[u];
      if (isWallFired && !isNaN(data.ecoPathA) && !isNaN(data.ecoPathB)) data.eco = data.ecoPathA + data.ecoPathB;
      results[u] = processUnitDiagnostics(u, data, now);
    });
    return results;
  }

  function processUnitDiagnostics(unit, data, now) {
    const wallAves={}, wallMaxs={}, wallMins={}, wallSpreads={}, maxAdjDeltas={};
    let maxTmt=0, minTmt=999, maxAdjDelta=0, maxRateOfRise=0;
    let hottestTube=null, fastestRisingTube=null;
    const dataQuality = data.dataQuality || { source: 'LIVE_PI', missingInputs: [], assumedInputs: [], tubeCount: 0, syntheticTubes: false };
    const analytics = window.NTPCBoilerAnalytics;
    if (analytics && !isMockPage()) {
      const sensorHealth = analytics.validateTubes(unit, data.tubes, now, { offline: Number.isFinite(data.load) && data.load < 20 });
      data.sensorHealth = sensorHealth;
      data.tubes = sensorHealth.valid;
      dataQuality.suspectTubeCount = sensorHealth.suspect.length;
      dataQuality.validTubeCount = sensorHealth.validCount;
    } else {
      data.sensorHealth = { valid: data.tubes, suspect: [], validCount: dataQuality.tubeCount || 0 };
    }

    const loadVal  = isNaN(data.load)  ? 0  : data.load;
    const isOffline = loadVal < 20;

    const assume = (key, value) => {
      if (!dataQuality.assumedInputs.includes(key)) dataQuality.assumedInputs.push(key);
      return isMockPage() ? value : Number.NaN;
    };

    const o2Val    = isNaN(data.o2)    ? assume('O2',    (isOffline ? 21.0 : (isBarh ? 3.0  : 3.5)))  : data.o2;
    const airVal   = isNaN(data.air)   ? assume('AIR',   (isOffline ? 0    : (isBarh ? 2100 : 2450))) : data.air;
    const paVal    = isNaN(data.pa)    ? assume('PA',    (isOffline ? 0    : (isBarh ? 1350 : 960)))  : data.pa;
    const coalVal  = isNaN(data.coal)  ? assume('COAL',  (isOffline ? 0    : (isBarh ? 380  : 450)))  : data.coal;
    const ecoVal   = isNaN(data.eco)   ? assume('ECO',   (isOffline ? 0    : (isBarh ? 1850 : 2380))) : data.eco;
    const mshrhVal = isNaN(data.mshrh) ? assume('MS/RH', (isOffline ? 100  : (isBarh ? 565  : 585)))  : data.mshrh;

    ['left','right','front','rear'].forEach(wall => {
      const list = (data.tubes[wall] || []);
      list.sort(compareTubeGeometry);
      const vals = list.map(t => t.val);
      wallAves[wall] = average(vals);

      if (vals.length) {
        const wMax = Math.max(...vals), wMin = Math.min(...vals);
        wallMaxs[wall]   = wMax; wallMins[wall]   = wMin;
        wallSpreads[wall]= wMax - wMin;
        if (wMax > maxTmt) maxTmt = wMax;
        if (wMin < minTmt) minTmt = wMin;
      } else {
        wallMaxs[wall]=NaN; wallMins[wall]=NaN; wallSpreads[wall]=0;
      }

      let wMaxAdj = 0;
      for (let i=0; i<list.length-1; i++) {
        const d = Math.abs(list[i+1].val - list[i].val);
        if (d > wMaxAdj) wMaxAdj = d;
      }
      maxAdjDeltas[wall] = wMaxAdj;
      if (wMaxAdj > maxAdjDelta) maxAdjDelta = wMaxAdj;

      list.forEach(t => {
        const key  = `${wall}_${t.tube}`;
        if (!history[unit].values[key]) {
          history[unit].values[key] = [];
        }
        const buf = history[unit].values[key];
        buf.push({ time: now, val: t.val });
        if (buf.length > 180) buf.shift(); // Keep up to 15 minutes of history at 5s polling

        let roc = 0;
        let rocValid = false;
        const targetAge = 120000; // 2 minutes in ms
        
        let bestPoint = null;
        let bestDiff = Infinity;
        for (const p of buf) {
          const age = now - p.time;
          const diff = Math.abs(age - targetAge);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestPoint = p;
          }
        }

        if (bestPoint) {
          const dMins = (now - bestPoint.time) / 60000;
          if (dMins >= 1.5) { // Require at least 90 seconds baseline to avoid instant MW/min-style spikes
            const nowPoints = buf.filter(p => now - p.time <= 30000);
            const avgNow = nowPoints.reduce((sum, p) => sum + p.val, 0) / nowPoints.length;

            const thenTime = bestPoint.time;
            const thenPoints = buf.filter(p => p.time <= thenTime && p.time > thenTime - 30000);
            const avgThen = thenPoints.reduce((sum, p) => sum + p.val, 0) / thenPoints.length;

            if (nowPoints.length >= 2 && thenPoints.length >= 2 && Number.isFinite(avgNow) && Number.isFinite(avgThen)) {
              roc = (avgNow - avgThen) / dMins;
              roc = Math.max(-15, Math.min(15, roc));
              rocValid = true;
            }
          }
        }

        if (history[unit].rates[key] === undefined) {
          history[unit].rates[key] = 0;
        }
        if (rocValid) history[unit].rates[key] = history[unit].rates[key] * 0.85 + roc * 0.15;
        t.roc = rocValid ? history[unit].rates[key] : 0;
        t.rocValid = rocValid;
        if (Math.abs(t.roc) > Math.abs(maxRateOfRise)) {
          maxRateOfRise = t.roc;
          fastestRisingTube = { wall, tube: t.tube, val: t.val, roc: t.roc };
        }
        if (t.val === maxTmt) hottestTube = { wall, tube: t.tube, val: t.val };
      });
    });

    if (minTmt === 999) minTmt = 0;
    const totalWWSpread = maxTmt - minTmt;
    const lrSpread   = Math.abs(wallAves.left  - wallAves.right);
    const frSpread   = Math.abs(wallAves.front - wallAves.rear);
    const maxImbalance = Math.max(isNaN(lrSpread)?0:lrSpread, isNaN(frSpread)?0:frSpread);

    // Flow 1 & Flow 2 partition calculations
    const f1Vals = [];
    const f2Vals = [];
    ['left', 'right', 'front', 'rear'].forEach(wall => {
      const list = (data.tubes[wall] || []);
      const sorted = [...list].sort(compareTubeGeometry);
      if (wall === 'left') {
        sorted.forEach(t => f1Vals.push(t.val));
      } else if (wall === 'right') {
        sorted.forEach(t => f2Vals.push(t.val));
      } else {
        const mid = Math.ceil(sorted.length / 2);
        sorted.forEach((t, i) => {
          if (i < mid) f1Vals.push(t.val);
          else         f2Vals.push(t.val);
        });
      }
    });
    const flow1Ave = average(f1Vals);
    const flow2Ave = average(f2Vals);
    const flowImbalance = isNaN(flow1Ave) || isNaN(flow2Ave) ? 0 : Math.abs(flow1Ave - flow2Ave);

    let xOffset=50, yOffset=50;
    if (!isNaN(wallAves.left)  && !isNaN(wallAves.right))
      xOffset = Math.max(25, Math.min(75, 50 + (wallAves.right - wallAves.left)  * 0.45));
    if (!isNaN(wallAves.front) && !isNaN(wallAves.rear))
      yOffset = Math.max(25, Math.min(75, 50 + (wallAves.rear  - wallAves.front) * 0.45));

    // ── Load Ramp Rate (Longer duration 5-minute average, min 2-minute baseline) ──
    const lhBuf = loadHistory[unit];
    lhBuf.push({ time: now, load: loadVal });
    if (lhBuf.length > 240) lhBuf.shift(); // Keep up to 20 minutes of history (240 * 5s)

    let rampRate = 0;
    let rampRateValid = false;
    const targetAge = 300000; // 5 minutes in ms
    const minAge = 180000;    // 3 minutes in ms

    // Find the historical point closest to 5 minutes ago
    let bestPoint = null;
    let bestDiff = Infinity;
    for (const p of lhBuf) {
      const age = now - p.time;
      const diff = Math.abs(age - targetAge);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestPoint = p;
      }
    }

    if (bestPoint) {
      const elapsed = (now - bestPoint.time) / 60000; // in minutes
      const bothOnline = loadVal >= 20 && bestPoint.load >= 20;
      if (elapsed >= minAge / 60000 && bothOnline) {
        rampRate = (loadVal - bestPoint.load) / elapsed;
        rampRate = Math.max(-12, Math.min(12, rampRate));
        rampRateValid = true;
      }
    }

    if (history[unit].smoothedRampRate === undefined) {
      history[unit].smoothedRampRate = 0;
    }
    if (rampRateValid) history[unit].smoothedRampRate = (history[unit].smoothedRampRate * 0.85) + (rampRate * 0.15);
    rampRate = rampRateValid ? history[unit].smoothedRampRate : 0;

    // ── Thermal Cycle Crossing Counter ──
    const allTmtVals = ['left','right','front','rear'].flatMap(w => (data.tubes[w]||[]).map(t=>t.val));
    const meanWW = average(allTmtVals);
    if (!isNaN(meanWW) && prevMeanTmt[unit] !== null) {
      const prev = prevMeanTmt[unit], thresh = 15;
      if (Math.abs(meanWW - prev) > thresh) cycleCrossings[unit] = (cycleCrossings[unit]||0) + 1;
    }
    if (!isNaN(meanWW)) prevMeanTmt[unit] = meanWW;

    // ── Waterwall Cyclic Index (CI) calculation ──
    if (!isNaN(meanWW)) {
      wwMeanHistory[unit].push({ time: now, val: meanWW });
      if (wwMeanHistory[unit].length > 720) wwMeanHistory[unit].shift(); // 1 hour window (720 * 5s)
    }

    let cyclicIndex = 0;
    if (wwMeanHistory[unit].length > 0) {
      const vals = wwMeanHistory[unit].map(p => p.val);
      const maxVal = Math.max(...vals);
      const minVal = Math.min(...vals);
      const range = maxVal - minVal;
      const A = Math.min(1.0, range / 40.0);

      const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
      const variance = vals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / vals.length;
      const stdDev = Math.sqrt(variance);
      const B = Math.min(1.0, stdDev / 12.0);

      // Find the point closest to 5 minutes ago (300,000 ms)
      let best5mPoint = null;
      let best5mDiff = Infinity;
      const target5m = 300000;
      for (const p of wwMeanHistory[unit]) {
        const age = now - p.time;
        const diff = Math.abs(age - target5m);
        if (diff < best5mDiff) {
          best5mDiff = diff;
          best5mPoint = p;
        }
      }
      const deltaT = best5mPoint ? Math.abs(meanWW - best5mPoint.val) : 0;
      const C = Math.min(1.0, deltaT / 15.0);

      const D = Math.min(1.0, totalWWSpread / 80.0);

      cyclicIndex = 100.0 * (0.40 * A + 0.25 * B + 0.20 * C + 0.15 * D);
    }
    if (isOffline) {
      cyclicIndex = 0;
    }

    // ── Differential Expansion Index (DEI) ──
    const designMeanTmt = isWallFired ? 430 : 440;
    const plantMW       = DESIGN_MW;
    const loadFactor    = Math.max(0.05, Math.min(1.0, loadVal / plantMW));
    const expectedMeanTmt = 80 + (designMeanTmt - 80) * loadFactor;
    const dei = isNaN(meanWW) ? 0 : (meanWW - expectedMeanTmt) / Math.max(1, expectedMeanTmt);

    // ── Subcritical Regime Detection ──
    const loadPct       = loadFactor;
    const isSubcritical = !isOffline && (loadPct < LIMITS.subcriticalLoadPct);
    const isBensonZone  = !isOffline && (loadPct < LIMITS.bensonMinFlowPct);

    // ── TMT Oscillation σ ──
    if (!subcriticalHistory[unit]) subcriticalHistory[unit] = [];
    if (!isNaN(meanWW)) subcriticalHistory[unit].push(meanWW);
    if (subcriticalHistory[unit].length > 12) subcriticalHistory[unit].shift();
    const tmtBuf     = subcriticalHistory[unit];
    const tmtMeanBuf = average(tmtBuf);
    const tmtOscSigma = tmtBuf.length >= 4 ? Math.sqrt(average(tmtBuf.map(v => (v - tmtMeanBuf) ** 2))) : 0;

    // ── Boiler Operating Mode Label ──
    let boilerMode = 'SUPERCRITICAL';
    if (!isOffline) {
      if (isBensonZone)                                boilerMode = 'BENSON-MIN-FLOW';
      else if (isSubcritical)                          boilerMode = 'SUBCRITICAL';
      else if (loadPct < (isWallFired ? 0.65 : 0.55)) boilerMode = 'TRANSITIONAL';
      else if (loadPct < 0.80)                         boilerMode = 'PART-LOAD';
      else                                             boilerMode = 'SUPERCRITICAL';
    }

    // ── Fatigue Risk Score ──
    const scoreAbs = Math.max(0, Math.min(100, ((maxTmt        - 380)         / (LIMITS.tempFatal     - 380))         * 100));
    const scoreImb = Math.max(0, Math.min(100, ((maxImbalance  - 10)          / (LIMITS.balanceCritical - 10))        * 100));
    const scoreAdj = Math.max(0, Math.min(100, ((maxAdjDelta   - 10)          / (LIMITS.deltaTCritical - 10))         * 100));
    const scoreRoc = Math.max(0, Math.min(100, ((Math.abs(maxRateOfRise)-0.5) / (LIMITS.rocCritical   - 0.5))         * 100));
    let fatigueRisk  = Math.round(scoreAdj*0.35 + scoreAbs*0.25 + scoreImb*0.2 + scoreRoc*0.2);
    let healthScore  = Math.max(0, 100 - fatigueRisk);

    let biasDirection = 'Uniform';
    if (maxImbalance > LIMITS.balanceWarning) {
      if (lrSpread > frSpread) biasDirection = wallAves.left  > wallAves.right ? 'Left Bias'  : 'Right Bias';
      else                     biasDirection = wallAves.front > wallAves.rear  ? 'Front Bias' : 'Rear Bias';
    }


    // ── Nonlinear DEI-Corrected Weld Stress ──
    const deiMultiplier     = 1 + 0.8 * Math.max(0, dei);
    const weldThermalStress = Math.round(maxAdjDelta * 2.4 * deiMultiplier);

    // ── Session thermal-exposure screening accumulator (not validated fatigue life) ──
    const M_EXP       = 3.5;
    const DT_DESIGN   = 22;
    const LIFE_CYCLES = 30000;
    const INTERVAL_SCALE = 5 / 3600;
    if (!isOffline && maxAdjDelta > DT_DESIGN) {
      const dmgPerInterval = (Math.pow(maxAdjDelta / DT_DESIGN, M_EXP) / LIFE_CYCLES) * INTERVAL_SCALE;
      cdfAccumulation[unit] = Math.min(1.0, cdfAccumulation[unit] + dmgPerInterval);
    }
    const cdf = cdfAccumulation[unit];

    let finalStress = weldThermalStress;
    let finalMaxRateOfRise = maxRateOfRise;
    let finalRampRate = rampRate;
    let finalHottest = hottestTube;
    let finalFastest = fastestRisingTube;

    if (isOffline) {
      fatigueRisk = 0;
      healthScore = 100;
      biasDirection = 'Uniform';
      finalStress = 0;
      finalMaxRateOfRise = 0;
      finalRampRate = 0;
      finalHottest = null;
      finalFastest = null;
    }

    const criticalMissing = dataQuality.missingInputs.includes('WW MTM') || dataQuality.tubeCount === 0;
    const assumedPenalty = Math.min(35, (dataQuality.assumedInputs || []).length * 5);
    const missingPenalty = Math.min(70, (dataQuality.missingInputs || []).length * 10);
    const expectedTubeCount = PLANT_NAME === 'Barh Stage 1' ? 34 : PLANT_NAME === 'Gadarwara' ? 82 : null;
    const tubeCountDelta = expectedTubeCount === null ? 0 : Math.abs(dataQuality.tubeCount - expectedTubeCount);
    const tubeCountPenalty = expectedTubeCount === null ? 0 : Math.min(40, Math.round((tubeCountDelta / expectedTubeCount) * 100));
    dataQuality.expectedTubeCount = expectedTubeCount;
    dataQuality.tubeCountValid = expectedTubeCount === null || tubeCountDelta === 0;
    dataQuality.piQualityVerified = false;
    dataQuality.freshnessVerified = false;

    // DOM scraping cannot verify PI quality/timestamp, so live confidence is capped.
    let dataConfidence = dataQuality.source === 'MOCK' ? 70 : 85;
    if (criticalMissing && !isOffline) dataConfidence = 0;
    else dataConfidence = Math.max(0, dataConfidence - missingPenalty - assumedPenalty - tubeCountPenalty);

    const validForFatigue = isOffline || (!criticalMissing && dataConfidence >= 45);
    let confidenceLevel = 'MAPPED';
    if (isOffline) confidenceLevel = 'OFFLINE';
    else if (dataQuality.source === 'MOCK') confidenceLevel = dataQuality.syntheticTubes ? 'MOCK SYNTHETIC' : 'MOCK';
    else if (criticalMissing) confidenceLevel = 'MAPPING MISSING';
    else if (!dataQuality.tubeCountValid) confidenceLevel = 'COUNT CHECK';
    else if (dataConfidence < 70) confidenceLevel = 'PARTIAL';

    if (!validForFatigue && !isOffline) {
      fatigueRisk = 0;
      healthScore = 0;
      biasDirection = 'Data Gap';
      finalStress = 0;
      finalMaxRateOfRise = 0;
      finalRampRate = 0;
    }

    history[unit].trend.push(fatigueRisk);
    if (history[unit].trend.length > 50) history[unit].trend.shift();

    const result = {
      load: loadVal, o2: o2Val, air: airVal, pa: paVal, coal: coalVal, eco: ecoVal, mshrh: mshrhVal,
      isOffline,
      dataQuality,
      dataConfidence,
      confidenceLevel,
      validForFatigue,
      cyclicIndex,
      mills: data.mills || {},
      burnerTilt: data.burnerTilt,
      wallAves, wallMaxs, wallMins, wallSpreads,
      maxTmt, minTmt, totalWWSpread, maxAdjDelta,
      maxRateOfRise: finalMaxRateOfRise,
      rateOfRiseValid: !!(finalFastest && finalFastest.rocValid),
      thermalStress: finalStress,
      lrSpread, frSpread, maxImbalance, biasDirection,
      flow1Ave, flow2Ave, flowImbalance,
      fireball: { x: xOffset, y: yOffset },
      fatigueRisk, healthScore,
      hottestTube: finalHottest,
      fastestRisingTube: finalFastest,
      rampRate: finalRampRate,
      rampRateValid: isOffline ? true : rampRateValid,
      cycleCount: cycleCrossings[unit] || 0,
      tubes: data.tubes,
      meanWW,
      sensorHealth: data.sensorHealth,
      signals: { dampers: data.dampers || {}, mills: data.mills || {}, hfgLhs: data.hfgLhs, hfgRhs: data.hfgRhs, pressure: data.pressure, bensonValve: data.bensonValve },
      // v3 Advanced Analytics
      dei: isOffline ? 0 : dei,
      tmtOscSigma: isOffline ? 0 : tmtOscSigma,
      cdf,
      isSubcritical: isOffline ? false : isSubcritical,
      isBensonZone:  isOffline ? false : isBensonZone,
      boilerMode:    isOffline ? 'OFFLINE' : boilerMode,
      loadPct
    };
    if (analytics) {
      result.cycleAnalytics = analytics.updateSeries(unit, result, now);
      result.cycleCount = Math.round(result.cycleAnalytics.damagingCycles * 10) / 10;
      result.crackZone = analytics.crackZoneMetrics(unit, result.tubes, PLANT_NAME);
      result.causeAnalysis = analytics.rankCauses(result, result.signals, isWallFired ? 'SIDE_FIRED_J_FLAME' : 'TANGENTIAL');
    }
    return result;
  }


  // ═══════════════════════════════════════════════════════════════
  // 9. ALARM EVALUATION (with localStorage persistence)
  // ═══════════════════════════════════════════════════════════════
  function evaluateAlarms(diagnostics) {
    const nowStr = new Date().toLocaleTimeString();
    const currentAlarms = [];
    let newAlarms=0, newCritical=0;
    let gPeakTmt=0, gMaxSpread=0, gMaxStress=0, gMaxRamp=0, gMaxFatigue=0;

    UNITS.forEach(u => {
      const m = diagnostics[u];
      if (m.isOffline) return; // Skip alarms and peak statistics for offline units

      const push = (sev, param, val, limit, desc, action) =>
        currentAlarms.push({ unit:u, severity:sev, param, val, limit, desc, action });

      if (!m.validForFatigue) {
        const missing = (m.dataQuality && m.dataQuality.missingInputs || []).join(', ') || 'critical PI tags';
        push('warning', 'Data Confidence', `${m.dataConfidence}%`, '>=70%',
          `Live fatigue judgment disabled. Missing or unmapped: ${missing}.`,
          'Map WW MTM/live PI tags first. Do not use fatigue score for operation until confidence is restored.');
        return;
      }

      gPeakTmt     = Math.max(gPeakTmt,    m.maxTmt);
      gMaxSpread   = Math.max(gMaxSpread,  m.totalWWSpread);
      gMaxStress   = Math.max(gMaxStress,  m.thermalStress);
      gMaxRamp     = Math.max(gMaxRamp,    Math.abs(m.rampRate || 0));
      gMaxFatigue  = Math.max(gMaxFatigue, m.fatigueRisk);

      const peakActions = isWallFired
        ? {
            fatal: 'Initiate localized wall sootblowing. Check left/right burner bank balance and same-mill elevation firing.',
            critical: 'Start localized sootblowing. Reduce firing bias from the hot-wall burner bank/elevation.',
            advisory: 'Monitor left/right burner bank balance, secondary air distribution, and feeder loading.'
          }
        : {
            fatal: 'Initiate wall sootblowers immediately. Check SADC/SOFA dampers.',
            critical: 'Start localized sootblowing. Adjust corner air tilts.',
            advisory: 'Monitor combustion tilt/yaw angles and feeder loading.'
          };
      const stressAction = isWallFired
        ? 'Stabilize load ramp. Balance the active left/right burner banks and avoid mill/elevation changeover.'
        : 'Bias active mill feeds to center the tangential combustion pattern.';
      const spreadAction = isWallFired
        ? 'Check side-wall secondary air distribution, left/right burner bank loading, and same-mill elevation balance.'
        : 'Verify SOFA damper distributions and equalize mill loading.';
      const spreadWarnAction = isWallFired
        ? 'Check J-flame wall washing risk and balance left/right burner bank firing.'
        : 'Check yaw tilt settings for flame alignment.';

      // 1. WW TMT
      if      (m.maxTmt >= LIMITS.tempFatal)    push('critical','WW TMT Peak',   `${m.maxTmt.toFixed(0)}°C`, `${LIMITS.tempFatal}°C`,    'Severe overheating — creep cracking risk.',          peakActions.fatal);
      else if (m.maxTmt >= LIMITS.tempCritical) push('warning', 'WW TMT Peak',   `${m.maxTmt.toFixed(0)}°C`, `${LIMITS.tempCritical}°C`, 'Water-wall hotspot detected.',                      peakActions.critical);
      else if (m.maxTmt >= LIMITS.tempWarning)  push('advisory','WW TMT Peak',   `${m.maxTmt.toFixed(0)}°C`, `${LIMITS.tempWarning}°C`,  'WW metal temp elevated.',                           peakActions.advisory);

      // 2. Fin Weld Stress
      if      (m.thermalStress >= LIMITS.stressCritical) push('critical','Fin Differential Thermal Index', `${m.thermalStress}`, `${LIMITS.stressCritical}`, 'Screening index indicates severe adjacent-tube thermal differential.', 'Hold further ramp. Verify sensor validity, physical adjacency and supporting combustion signals.');
      else if (m.thermalStress >= LIMITS.stressWarning)  push('warning', 'Fin Differential Thermal Index', `${m.thermalStress}`, `${LIMITS.stressWarning}`, 'Screening index indicates elevated adjacent-tube thermal differential.', stressAction);

      // 3. WW Spread
      const sc = isBarh ? 90 : 100, sw = isBarh ? 65 : 75;
      if      (m.totalWWSpread >= sc) push('critical','WW Temp Spread', `${m.totalWWSpread.toFixed(0)}°C`, `${sc}°C`, 'Severe water-wall thermal mismatch.',   spreadAction);
      else if (m.totalWWSpread >= sw) push('warning', 'WW Temp Spread', `${m.totalWWSpread.toFixed(0)}°C`, `${sw}°C`, 'WW spread warning.',                    spreadWarnAction);

      // 4. Rate of Rise
      const ar = Math.abs(m.maxRateOfRise);
      if (m.rateOfRiseValid) {
        if      (ar >= LIMITS.rocFatal)    push('critical','Temp Rate of Rise', `${m.maxRateOfRise.toFixed(1)}°C/min`, `${LIMITS.rocFatal}°C/min`,    'Severe thermal transient.',      'HOLD load ramp. Verify PA/SA ratios.');
        else if (ar >= LIMITS.rocCritical) push('warning', 'Temp Rate of Rise', `${m.maxRateOfRise.toFixed(1)}°C/min`, `${LIMITS.rocCritical}°C/min`, 'High thermal transient.',        'Control coal flow rate adjustments.');
      }

      // 5. Load Ramp Rate
      const ar2 = Math.abs(m.rampRate || 0);
      if (m.rampRateValid) {
        if      (ar2 >= LIMITS.rampCritical) push('critical','Load Ramp Rate', `${(m.rampRate||0).toFixed(1)} MW/min`, `${LIMITS.rampCritical} MW/min`, 'Rapid load change — severe thermal cycling.',       'Reduce ramp rate immediately. Pause load changes 5 min.');
        else if (ar2 >= LIMITS.rampWarning)  push('warning', 'Load Ramp Rate', `${(m.rampRate||0).toFixed(1)} MW/min`, `${LIMITS.rampWarning} MW/min`,  'Fast ramp — moderate fatigue accumulation.',        'Verify mill changeover rate. Monitor TMT response.');
      }

      // 6. Benson Minimum-Flow Zone (wall-fired only — highest priority)
      if (m.isBensonZone) {
        push('critical','Benson Min-Flow Zone', `${((m.loadPct||0)*100).toFixed(0)}% Load`, `${(LIMITS.bensonMinFlowPct*100).toFixed(0)}% MCR`,
          'Load is within the configured low-load hydraulic-instability watch band. Valve state and pressure are not confirmed by this overlay.',
          'Verify actual pressure, minimum-flow demand and recirculation-valve feedback before acting. Stabilize the operating condition per station SOP.');
      } else if (m.isSubcritical) {
        // 7. Subcritical Steam Regime
        push('warning','Subcritical Mode', `${((m.loadPct||0)*100).toFixed(0)}% Load`, `${(LIMITS.subcriticalLoadPct*100).toFixed(0)}% MCR`,
          'Load is within the configured low-load transition watch band; actual steam pressure is not confirmed by this overlay.',
          'Verify pressure and operating mode. Avoid unnecessary disturbances while monitoring lower-waterwall TMT oscillation.');
      }

      // 8. TMT Oscillation σ
      if ((m.tmtOscSigma||0) >= LIMITS.tmtOscThreshold) {
        push('warning','TMT Oscillation', `σ=${(m.tmtOscSigma||0).toFixed(1)}°C`, `${LIMITS.tmtOscThreshold}°C σ`,
          'Cyclic TMT oscillation detected — two-phase instability or asymmetric wall-firing pattern.',
          isWallFired ? 'Check hot-wall/cool-wall burner-bank loading and actual PA/SA feedback before correction.' : 'Check firing asymmetry, burner tilt and PA/SA actual feedback before any correction.');
      }

      // 9. Differential Expansion Index
      const deiVal = m.dei || 0;
      if (deiVal >= LIMITS.deiCritical) {
        push('critical','Diff. Expansion (DEI)', `DEI=${(deiVal*100).toFixed(1)}%`, `${(LIMITS.deiCritical*100).toFixed(0)}%`,
          'Tubes are running severely above the configured load baseline; differential thermal exposure is high.',
          'HOLD load. Initiate emergency wall-blowing. Re-balance O2. Call boiler engineer for tube inspection.');
      } else if (deiVal >= LIMITS.deiWarning) {
        push('warning','Diff. Expansion (DEI)', `DEI=${(deiVal*100).toFixed(1)}%`, `${(LIMITS.deiWarning*100).toFixed(0)}%`,
          'Tubes hotter than design for current load — fin-weld stress amplified by differential expansion.',
          'Reduce load ramp rate. Start sootblowing on hot wall. Verify O2 balance at economizer exit.');
      }

      // 10. Session thermal-exposure screening
      const cdfVal = m.cdf || 0;
      if (cdfVal >= LIMITS.cdfCritical) {
        push('critical','Session Thermal Exposure', `Index=${(cdfVal*100).toFixed(1)}`, `${(LIMITS.cdfCritical*100).toFixed(0)}`,
          'Uncalibrated session screening index is high; this is not validated percentage life consumed.',
          'Escalate to boiler engineering, review historian cycles and inspect the configured crack zone per station plan.');
      } else if (cdfVal >= LIMITS.cdfWarning) {
        push('warning','Session Thermal Exposure', `Index=${(cdfVal*100).toFixed(1)}`, `${(LIMITS.cdfWarning*100).toFixed(0)}`,
          'Uncalibrated session screening index is elevated; historian rainflow analysis is required for fatigue assessment.',
          'Review recent ramps and mill changes; avoid further unnecessary thermal disturbance pending engineering review.');
      }

      // 11. High O2 with below-design steam temperature (excess air advisory)
      if ((m.o2||0) >= 5.0 && (m.mshrh||0) > 0 && (m.mshrh||0) < (isWallFired ? 540 : 555)) {
        push('advisory','Excess Air + Low SH Temp', `O2=${(m.o2||0).toFixed(1)}%`, '5.0%',
          'High excess air reduces furnace exit temperature. Combustion inefficient — fan loading elevated, SH spray increased.',
          'Reduce secondary air bias. Optimise PA/SA split at burner level. Check O2 trim controller setpoint.');
      }
    });


    // Log and store new alarms
    currentAlarms.forEach(a => {
      const alreadyLogged = shiftLogs.some(l =>
        l.unit===a.unit && l.param===a.param && l.severity===a.severity && (Date.now()-l.rawTime < 300000)
      );
      if (!alreadyLogged) {
        const entry = { rawTime: Date.now(), timestamp: nowStr, ...a };
        shiftLogs.unshift(entry);
        saveAlarmToStorage(entry);
        newAlarms++;
        if (a.severity === 'critical') newCritical++;
        playChime(a.severity);
      }
    });

    const analytics = window.NTPCBoilerAnalytics;
    if (analytics) {
      lifecycleEvents = UNITS.flatMap(u => analytics.updateEvents(u, currentAlarms.filter(a => a.unit === u), Date.now()));
    }

    // Persist daily aggregate stats
    saveDailyStats({
      peakTmt: gPeakTmt, maxSpread: gMaxSpread, maxStress: gMaxStress,
      maxRampRate: gMaxRamp, maxFatigueRisk: gMaxFatigue,
      newAlarms, newCritical,
      cycleCount: UNITS.reduce((s, u) => s + ((diagnostics[u] && diagnostics[u].cycleCount) || 0), 0)
    });

    activeAlarms = currentAlarms;
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. AUDIO CHIMES
  // ═══════════════════════════════════════════════════════════════
  let audioCtx = null;
  function playChime(severity) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      if (severity === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
      } else if (severity === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) { console.warn('[BoilerCockpit] Audio blocked:', e); }
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. HTML INJECTION — FULL SCREEN OVERLAY
  // ═══════════════════════════════════════════════════════════════
  function injectFullScreenOverlay() {
    if (document.getElementById('boiler-fullscreen-dashboard-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id        = 'boiler-fullscreen-dashboard-overlay';
    overlay.className = `boiler-fullscreen-overlay ${isWallFired ? 'is-barh' : ''}`;

    const healthBadgesHTML = UNITS.map(u => {
      const px = u.toLowerCase();
      return `<div class="fs-unit-badge">
        <span class="fs-badge-label">${u} LOAD</span>
        <span class="fs-badge-val" id="header-${px}-load">--</span>
        <span class="fs-badge-label" style="margin-left:8px;">CI</span>
        <span class="fs-badge-val" id="header-${px}-ci" style="color:#ffaa00;margin-left:4px;margin-right:8px;font-weight:800;">--</span>
        <span class="fs-badge-status" id="header-${px}-level">NORMAL</span>
      </div>`;
    }).join('');

    const columnsHTML = UNITS.map(u => {
      const px = u.toLowerCase();
      const uNum = u.substring(1);
      return `
      <div class="fs-unit-column" id="fs-${px}-column">

        <!-- ① Combustion Status & Fireball -->
        <div class="fs-card">
          <div class="fs-card-title">
            <span>${PLANT_NAME} ${u} — Combustion Status</span>
            <span id="${px}-health-badge" style="color:#00e6c3;">HEALTH: --%</span>
          </div>
          <div class="fs-split-row">
            <!-- LIVE FURNACE CROSS-SECTION VIEW (SVG rectangle) -->
            ${generateFurnaceViewHTML(px)}
            <div class="fs-stats-grid" style="flex-grow:1;">
              <div class="fs-stat-box"><span class="fs-stat-lbl">Active Load</span><span class="fs-stat-val" id="${px}-stat-load">-- MW</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Flue Gas O₂</span><span class="fs-stat-val" id="${px}-stat-o2">-- %</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Combustion Bias</span><span class="fs-stat-val" id="${px}-stat-bias" style="color:#ffa500;font-size:11px;">Uniform</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Total Air Flow</span><span class="fs-stat-val" id="${px}-stat-air">-- t/h</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Total PA Flow</span><span class="fs-stat-val" id="${px}-stat-pa">-- t/h</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Eco Water Flow</span><span class="fs-stat-val" id="${px}-stat-eco">-- TPH</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Total Coal Flow</span><span class="fs-stat-val" id="${px}-stat-coal">-- t/h</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Burner Tilt</span><span class="fs-stat-val" id="${px}-stat-tilt">-- %</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Plant Model</span><span class="fs-stat-val" id="${px}-stat-model">--</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Data Confidence</span><span class="fs-stat-val" id="${px}-stat-confidence">--</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">HFG LHS / RHS</span><span class="fs-stat-val" id="${px}-stat-hfg">-- / -- °C</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">OFA Damper Range</span><span class="fs-stat-val" id="${px}-stat-ofa-range">-- %</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">MTM Sensor Health</span><span class="fs-stat-val" id="${px}-stat-sensor-health">--</span></div>
            </div>
          </div>
        </div>

        <!-- ② Load Ramp Rate & Cyclic Operation -->
        <div class="fs-card">
          <div class="fs-card-title">${u} Load Ramp Rate &amp; Cyclic Operation</div>
          <div class="fs-split-row" style="align-items:flex-start;gap:16px;">
            <div class="ramp-gauge-container">
              <div class="ramp-gauge-label">LOAD RAMP RATE</div>
              <div class="ramp-gauge-val" id="${px}-ramp-val">0.0 MW/min</div>
              <div class="ramp-gauge-bar-bg">
                <div class="ramp-gauge-bar-fill" id="${px}-ramp-bar" style="width:0%"></div>
              </div>
              <div class="ramp-gauge-limits">
                <span>0</span><span style="color:#ffaa00;">${LIMITS.rampWarning}</span><span style="color:#ff6666;">${LIMITS.rampCritical}+ MW/min</span>
              </div>
            </div>
            <div class="fs-stats-grid" style="flex-grow:1;">
              <div class="fs-stat-box">
                <span class="fs-stat-lbl">Thermal Transient Events (Session)</span>
                <span class="fs-stat-val" id="${px}-cycle-count" style="color:#a5d6ff;">0</span>
              </div>
              <div class="fs-stat-box">
                <span class="fs-stat-lbl">MS/RH Max Temp</span>
                <span class="fs-stat-val" id="${px}-stat-ms">-- °C</span>
              </div>
              <div class="fs-stat-box">
                <span class="fs-stat-lbl">Max Adjacent ΔT</span>
                <span class="fs-stat-val" id="${px}-stat-adj-dt">-- °C</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ③ Water-Wall TMT Heatmap + Gradient Sparklines + Spread Arcs -->
        <div class="fs-card">
          <div class="fs-card-title">${PLANT_NAME} ${u} Water-Wall TMT Heatmap</div>
          <div class="heatmap-boilers-view" id="${px}-heatmap-view"><!-- programmatic --></div>
          <div class="heatmap-stats-strip">
            <div>Peak TMT: <span id="${px}-stat-hottest">--°C</span></div>
            <div>Min TMT: <span id="${px}-stat-coldest">--°C</span></div>
            <div>Wall Spread: <span id="${px}-stat-spread">--°C</span></div>
            <div>Rate of Rise: <span id="${px}-stat-roc">--°C/min</span></div>
          </div>

          <!-- Per-Wall Spreads & Gradient Profiles -->
          <div class="wall-spread-section-title">Per-Wall Spreads (Max-Min) &amp; Gradient Profiles</div>
          <div class="wall-spread-grad-container">
            ${['front','left','right','rear'].map(w => `
            <div class="wall-spread-grad-row">
              <span class="wall-sg-label">${w.toUpperCase()}</span>
              <span class="wall-sg-spread" id="${px}-spread-val-${w}">--°C</span>
              <div class="wall-sg-sparkline" id="${px}-sparkline-${w}"></div>
              <span class="wall-sg-range" id="${px}-range-${w}">--–--°C</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- ④ Thermal exposure screening + imbalance breakdown -->
        <div class="fs-card">
          <div class="fs-card-title">${u} Pressure-Part Thermal Exposure Screening</div>
          <div class="fs-split-row" style="justify-content:space-around;">
            <div class="radial-gauge-container">
              <svg class="radial-svg" viewBox="0 0 70 70">
                <circle class="radial-bg-ring"      cx="35" cy="35" r="28"></circle>
                <circle class="radial-progress-ring" cx="35" cy="35" r="28"
                  stroke-dasharray="175.9" stroke-dashoffset="175.9"
                  id="${px}-radial-ring"></circle>
              </svg>
              <div class="radial-text" id="${px}-radial-text">--%</div>
            </div>
            <div class="fs-stats-grid fatigue-stats-grid" style="flex-grow:1;">
              <div class="fs-stat-box"><span class="fs-stat-lbl">Fin Differential Thermal Index</span><span class="fs-stat-val" id="${px}-stat-stress" style="color:#58a6ff;">--</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">WW Cyclic Index (CI)</span><span class="fs-stat-val" id="${px}-stat-ci" style="color:#ffaa00;font-weight:bold;">--</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Flow 1 / 2 Mean</span><span class="fs-stat-val" id="${px}-stat-flow-mean">-- / -- °C</span></div>
              <div class="fs-stat-box"><span class="fs-stat-lbl">Flow Imbalance</span><span class="fs-stat-val" id="${px}-stat-flow-imb">-- °C</span></div>
            </div>
          </div>
        </div>

        <!-- ⑤ Boiler mode and screening exposure indicators -->
        <div class="fs-card">
          <div class="fs-card-title">${u} Boiler Mode · Thermal Exposure · Differential Expansion</div>
          <div class="fs-stats-grid">
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">Boiler Operating Mode</span>
              <span class="fs-stat-val fs-mode-label" id="${px}-stat-mode">--</span>
            </div>
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">Diff. Expansion (DEI)</span>
              <span class="fs-stat-val" id="${px}-stat-dei">--</span>
            </div>
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">TMT Oscillation σ</span>
              <span class="fs-stat-val" id="${px}-stat-osc">-- °C</span>
            </div>
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">Session Exposure Index (Screening)</span>
              <span class="fs-stat-val" id="${px}-stat-cdf">0.0 / 100</span>
              <div class="fs-cdf-bar-wrap"><div class="fs-cdf-bar" id="${px}-cdf-bar"></div></div>
            </div>
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">Load %MCR</span>
              <span class="fs-stat-val" id="${px}-stat-loadpct">--%</span>
            </div>
            <div class="fs-stat-box">
              <span class="fs-stat-lbl">Exposure Risk Level</span>
              <span class="fs-stat-val" id="${px}-stat-weld-risk">LOW</span>
            </div>
          </div>
        </div>

        <!-- ⑥ Mill Alignment -->
        <div class="fs-card">
          <div class="fs-card-title">${u} Mill-Air Alignment Matrix</div>
          <div class="mill-alignment-row" id="${px}-mills-grid"><!-- programmatic --></div>
        </div>

        <!-- ⑦ Expert Diagnostic Directives -->
        <div class="fs-card">
          <div class="fs-card-title">${u} Expert Diagnostic Directives</div>
          <div class="fs-diag-box" id="${px}-diag-box">
            <div class="fs-diag-title" id="${px}-diag-title">Vortex Balanced</div>
            <div class="fs-diag-content" id="${px}-diag-desc">No abnormal water-wall thermal imbalances detected. All stresses within parameters.</div>
          </div>
        </div>
      </div>`;
    }).join('');

    overlay.innerHTML = `
      <!-- ══ HEADER ══ -->
      <div class="fs-top-summary-strip">
        <div class="fs-title-block">
          <h1>${PLANT_NAME} Combustion Optimisation &amp; Water-Wall Exposure Advisor v3</h1>
          <span>Operator advisory | PI Vision mapped values | ${PLANT_TECH} | 2-min WW RoC · 5-min load ramp · event history</span>
        </div>
        <div class="fs-summary-badges">
          <div class="fs-unit-badge">
            <span class="fs-badge-label">SYSTEM TIME</span>
            <span class="fs-badge-val" id="fs-live-time">--:--:-- --</span>
          </div>
          <div class="fs-unit-badge" id="header-data-quality">
            <span class="fs-badge-label">DATA</span>
            <span class="fs-badge-val" id="header-data-quality-val">WAITING</span>
          </div>
          <div class="fs-unit-badge">
            <span class="fs-badge-label">REFRESH</span>
            <span class="fs-badge-val" id="header-refresh-performance">-- ms</span>
          </div>
          ${healthBadgesHTML}
          <div class="fs-alarm-summary" id="header-alarm-box">
            <span class="pulsing-dot" id="header-alarm-dot"></span>
            <span class="fs-badge-label" style="color:#ff6666;">ALARMS:</span>
            <span class="fs-badge-val" id="header-alarms-count" style="color:#ff3b30;font-weight:800;">0</span>
          </div>
          <button class="fs-close-btn" id="fs-close-btn">🖥️ Close Dashboard</button>
        </div>
      </div>

      <!-- ══ FIRST-VIEWPORT OPERATOR SIGNAL ══ -->
      <div class="fs-operator-signal-strip">
        ${UNITS.map(u => {
          const px = u.toLowerCase();
          return `<div class="fs-operator-signal" id="${px}-operator-signal">
            <div class="fs-operator-signal-head">
              <span>${u} OPERATOR SIGNAL</span>
              <strong id="${px}-operator-state">WAITING</strong>
            </div>
            <div class="fs-operator-signal-grid">
              <div><span>CONDITION</span><b id="${px}-operator-condition">Awaiting validated PI mapping</b></div>
              <div><span>EVIDENCE</span><b id="${px}-operator-evidence">--</b></div>
              <div><span>FIRST CHECK</span><b id="${px}-operator-check">Verify live tag quality</b></div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- ══ MAIN WORKSPACE ══ -->
      <div class="fs-workspace-grid">
        ${columnsHTML}

        <!-- ══ BOTTOM TABBED PANEL ══ -->
        <div class="fs-bottom-logger">
          <div class="fs-tab-bar">
            <button class="fs-tab active" data-tab="live">📡 Live Alarms</button>
            <button class="fs-tab" data-tab="today">📊 Today's Summary</button>
            <button class="fs-tab" data-tab="history">📅 7-Day History</button>
            <div style="flex:1;"></div>
            <button class="fs-close-btn" id="btn-export-fs-log" style="padding:4px 12px;font-size:10px;">📥 Export CSV</button>
            <button class="fs-close-btn" id="btn-shift-report"  style="padding:4px 12px;font-size:10px;margin-left:6px;">📋 Shift Report</button>
          </div>

          <!-- Live Tab -->
          <div class="fs-tab-content" id="tab-live">
            <div class="fs-table-container">
              <table class="fs-logger-table">
                <thead><tr>
                  <th>TIME</th><th>UNIT</th><th>DEVIATION PARAMETER</th><th>SEVERITY</th>
                  <th>ACTUAL VALUE</th><th>DESIGN LIMIT</th><th>DESCRIPTION / CAUSE</th><th>DIRECTIVE / ACTION</th>
                </tr></thead>
                <tbody id="fs-logger-tbody">
                  <tr><td colspan="8" style="text-align:center;padding:14px;color:#8b949e;">No deviation events logged this session.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Today Tab -->
          <div class="fs-tab-content hidden" id="tab-today">
            <div id="today-summary-content" class="history-tab-inner">
              <div style="text-align:center;color:#8b949e;padding:20px;">Loading today's summary…</div>
            </div>
          </div>

          <!-- 7-Day History Tab -->
          <div class="fs-tab-content hidden" id="tab-history">
            <div id="history-7day-content" class="history-tab-inner">
              <div style="text-align:center;color:#8b949e;padding:20px;">Loading 7-day history…</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    UNITS.forEach(u => {
      const el = document.getElementById(`${u.toLowerCase()}-heatmap-view`);
      if (el) el.innerHTML = generateInitialHeatmapHTML(u);
    });

    document.getElementById('fs-close-btn')    .addEventListener('click', toggleFullScreenMode);
    document.getElementById('btn-export-fs-log').addEventListener('click', exportTimelineToCSV);
    document.getElementById('btn-shift-report') .addEventListener('click', generateShiftReport);
    overlay.querySelectorAll('.fs-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  }

  function generateInitialHeatmapHTML(unitStr) {
    return ['front','left','right','rear'].map(wall => {
      let tMin = TUBE_RANGE.min;
      let tMax = TUBE_RANGE.max;
      
      if (PLANT_NAME === 'Barh Stage 1') {
        if (wall === 'left' || wall === 'right') {
          tMin = 11; tMax = 34; // 24 tubes
        } else {
          tMin = 11; tMax = 22; // 12 tubes
        }
      } else if (!isBarh && (wall === 'left' || wall === 'rear')) {
        tMin = 31; tMax = 50; // 20 tubes
      }
      
      const totalTubes = tMax - tMin + 1;
      const isCompact = totalTubes > 20;
      return `<div class="heatmap-wall-section" data-wall="${wall}">
        <div class="heatmap-wall-header"><span>${wall.toUpperCase()} WALL</span><span class="heatmap-wall-count">Waiting for PI symbols</span></div>
        <div class="heatmap-cell-grid ${isCompact ? 'hm-compact' : ''}" style="grid-template-columns: repeat(1, 1fr);"><div class="heatmap-cell hm-c-green muted">--</div></div>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // 12. HISTORY TAB CONTENT GENERATORS
  // ═══════════════════════════════════════════════════════════════
  function generateTodaySummaryHTML() {
    const events = loadEventsForDay(0);
    const stats  = loadDailyStats(0);
    const critEvents = events.filter(e=>e.severity==='critical');
    const warnEvents = events.filter(e=>e.severity==='warning');

    const statsHtml = stats ? `
      <div class="day-stats-row">
        <div class="day-stat-box"><span class="day-stat-lbl">Peak TMT</span>
          <span class="day-stat-val" style="color:${stats.peakTmt>=LIMITS.tempFatal?'#ff6666':'#f0f6fc'}">${stats.peakTmt?stats.peakTmt.toFixed(0):'--'}°C</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Max WW Spread</span>
          <span class="day-stat-val">${stats.maxSpread?stats.maxSpread.toFixed(0):'--'}°C</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Max Weld Stress</span>
          <span class="day-stat-val">${stats.maxStress?stats.maxStress.toFixed(0):'--'} index</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Max Ramp Rate</span>
          <span class="day-stat-val" style="color:${(stats.maxRampRate||0)>=LIMITS.rampCritical?'#ff6666':(stats.maxRampRate||0)>=LIMITS.rampWarning?'#ffaa00':'#3df060'}">${stats.maxRampRate?stats.maxRampRate.toFixed(1):'--'} MW/min</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Peak Fatigue Risk</span>
          <span class="day-stat-val" style="color:${(stats.maxFatigueRisk||0)>=75?'#ff6666':(stats.maxFatigueRisk||0)>=55?'#ffaa00':'#3df060'}">${stats.maxFatigueRisk?stats.maxFatigueRisk.toFixed(0):'--'}%</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Total Alarms</span>
          <span class="day-stat-val" style="color:#ffaa00;">${stats.alarmCount||0}</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Critical Events</span>
          <span class="day-stat-val" style="color:#ff6666;">${stats.criticalCount||0}</span></div>
        <div class="day-stat-box"><span class="day-stat-lbl">Thermal Cycles</span>
          <span class="day-stat-val" style="color:#a5d6ff;">${stats.cycleCount||0}</span></div>
      </div>` : '<p style="color:#8b949e;padding:8px;">No persistent data recorded yet. Data appears after first deviation event.</p>';

    const eventsHtml = events.length===0
      ? '<p style="text-align:center;color:#8b949e;padding:10px;">No deviation events recorded today.</p>'
      : `<table class="fs-logger-table"><thead><tr>
          <th>TIME</th><th>UNIT</th><th>PARAMETER</th><th>SEVERITY</th><th>VALUE</th><th>LIMIT</th><th>DESCRIPTION</th>
        </tr></thead><tbody>
        ${events.slice(-60).reverse().map(l=>`<tr>
          <td style="font-family:var(--font-mono);">${l.timestamp}</td>
          <td style="font-weight:bold;color:#ffaa00;">${l.unit}</td>
          <td>${l.param}</td>
          <td><span class="fs-badge-severity ${l.severity}">${l.severity.toUpperCase()}</span></td>
          <td style="font-family:var(--font-mono);font-weight:700;">${l.val}</td>
          <td style="color:#8b949e;">${l.limit}</td>
          <td style="color:#c9d1d9;">${l.desc}</td>
        </tr>`).join('')}
        </tbody></table>`;

    return `
      <div class="history-section-title">📊 ${formatDate(0)} — Today's Deviation Summary</div>
      ${statsHtml}
      <div class="history-section-title" style="margin-top:14px;">📋 Deviation Events (Last 60, Today)</div>
      <div class="fs-table-container">${eventsHtml}</div>`;
  }

  function generate7DayHistoryHTML() {
    const cardsHtml = [0,1,2,3,4,5,6].map(d => {
      const stats  = loadDailyStats(d);
      const events = loadEventsForDay(d);
      const label  = d===0 ? 'Today' : d===1 ? 'Yesterday' : `${d} days ago`;
      const dateStr= formatDate(d);
      const fr     = stats ? stats.maxFatigueRisk : 0;
      const riskColor = fr>=75?'#ff3b30': fr>=55?'#ff8c00': fr>=30?'#ffa500':'#238636';

      if (!stats && events.length===0) {
        return `<div class="day-history-card empty">
          <div class="day-card-header"><span class="day-card-date">${dateStr}</span><span class="day-card-label">${label}</span></div>
          <div style="color:#8b949e;font-size:10px;padding:6px 0;">No data</div>
        </div>`;
      }
      return `<div class="day-history-card">
        <div class="day-card-header">
          <span class="day-card-date">${dateStr}</span>
          <span class="day-card-label">${label}</span>
          <span class="day-card-risk" style="color:${riskColor};">⚠ ${stats?fr.toFixed(0):'--'}%</span>
        </div>
        <div class="day-card-stats">
          <div class="day-mini-stat"><span>Peak TMT</span><strong style="color:${(stats&&stats.peakTmt>=LIMITS.tempFatal)?'#ff6666':'#c9d1d9'}">${stats?stats.peakTmt.toFixed(0):'--'}°C</strong></div>
          <div class="day-mini-stat"><span>Max Spread</span><strong>${stats?stats.maxSpread.toFixed(0):'--'}°C</strong></div>
          <div class="day-mini-stat"><span>Thermal Index</span><strong>${stats?stats.maxStress:'--'}</strong></div>
          <div class="day-mini-stat"><span>Ramp Rate</span><strong style="color:${(stats&&stats.maxRampRate>=LIMITS.rampCritical)?'#ff6666':(stats&&stats.maxRampRate>=LIMITS.rampWarning)?'#ffaa00':'#c9d1d9'}">${stats?stats.maxRampRate.toFixed(1)+' MW/m':'--'}</strong></div>
          <div class="day-mini-stat"><span>Alarms</span><strong style="color:#ffaa00;">${stats?stats.alarmCount:0}</strong></div>
          <div class="day-mini-stat"><span>Critical</span><strong style="color:#ff6666;">${stats?stats.criticalCount:0}</strong></div>
          <div class="day-mini-stat"><span>Cycles</span><strong style="color:#a5d6ff;">${stats?stats.cycleCount:0}</strong></div>
          <div class="day-mini-stat"><span>Events</span><strong>${events.length}</strong></div>
        </div>
        <div class="day-card-fatigue-bar">
          <div class="day-card-fatigue-fill" style="width:${Math.min(100,fr)}%;background:${riskColor};"></div>
        </div>
      </div>`;
    }).join('');

    return `
      <div class="history-section-title">📅 7-Day Deviation History — ${PLANT_NAME}</div>
      <div class="seven-day-grid">${cardsHtml}</div>
      <p style="color:#555e6e;font-size:10px;margin-top:10px;padding:0 2px;">
        ℹ Stored in browser localStorage · Persists across page reloads · Auto-purges after 8 days
      </p>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 13. FURNACE CROSS-SECTION SVG VISUALIZATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generates a top-down rectangular cross-section of the furnace.
   * Tangential (all stations except Barh): corner burners, rotating central fireball.
   * Wall-fired (Barh only): front+rear wall burner arrays, elongated central flame zone.
   * Wall rectangle colors update live from average TMT data via updateFurnaceView().
   */
  function generateFurnaceViewHTML(px) {
    const isTang = (FIRING_TYPE === 'tangential');
    const W = isWallFired ? 160 : 230, H = isWallFired ? 240 : 170, WT = 12; // SVG dims + wall thickness
    const iX = WT, iY = WT, iW = W - 2*WT, iH = H - 2*WT;
    const cx = W/2, cy = H/2;

    // ── DEFS (gradients + glow) ──
    const defs = `<defs>
      <radialGradient id="fbg-${px}" cx="${isTang ? '38%' : '50%'}" cy="${isTang ? '35%' : '50%'}" r="${isTang ? '62%' : '55%'}">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="22%"  stop-color="#ffff80" stop-opacity="0.9"/>
        <stop offset="55%"  stop-color="#ff7c00" stop-opacity="${isTang ? '0.75' : '0.55'}"/>
        <stop offset="85%"  stop-color="#ff1a00" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#ff0000" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow-${px}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${isTang ? '5' : '7'}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    // ── WALLS (colored live by updateFurnaceView) ──
    const walls = `
      <rect id="${px}-wsvg-front" x="0"     y="0"        width="${W}"  height="${WT}" fill="#1a2540"/>
      <rect id="${px}-wsvg-rear"  x="0"     y="${H-WT}"  width="${W}"  height="${WT}" fill="#1a2540"/>
      <rect id="${px}-wsvg-left"  x="0"     y="${WT}"    width="${WT}" height="${iH}" fill="#1a2540"/>
      <rect id="${px}-wsvg-right" x="${W-WT}" y="${WT}"   width="${WT}" height="${iH}" fill="#1a2540"/>
      <rect x="${iX}" y="${iY}" width="${iW}" height="${iH}" fill="rgba(6,10,20,0.97)"/>`;

    // ── WALL LABELS ──
    const labels = `
      <text x="${W/2}"   y="${WT-1}"     text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="6.5" font-family="'JetBrains Mono',monospace" font-weight="700" letter-spacing="1">FRONT WALL</text>
      <text x="${W/2}"   y="${H-1}"      text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="6.5" font-family="'JetBrains Mono',monospace" font-weight="700" letter-spacing="1">REAR WALL</text>
      <text x="4"        y="${H/2}"      text-anchor="middle" fill="rgba(255,255,255,0.3)"  font-size="6"   font-family="'JetBrains Mono',monospace" font-weight="700" transform="rotate(-90,4,${H/2})">LEFT</text>
      <text x="${W-3}"   y="${H/2}"      text-anchor="middle" fill="rgba(255,255,255,0.3)"  font-size="6"   font-family="'JetBrains Mono',monospace" font-weight="700" transform="rotate(90,${W-3},${H/2})">RIGHT</text>`;

    let burners = '';
    let fireball = '';

    if (isTang) {
      // ── TANGENTIAL: corner burner nozzles (A/B/C/D corners) ──
      const bW = 16, bH = 5, bGap = 2;
      // Corner A = Front-Left, B = Front-Right, C = Rear-Left, D = Rear-Right
      // Each corner has 2 horizontal nozzles pointing into the furnace
      const corners = [
        { x: iX,       y: iY+4,      label:'A', lx: iX+2,       ly: iY+18  },
        { x: W-iX-bW,  y: iY+4,      label:'B', lx: W-iX-bW-2,  ly: iY+18  },
        { x: iX,       y: H-iY-bH*2-bGap-4, label:'C', lx: iX+2, ly: H-iY-bH*2-bGap-6 },
        { x: W-iX-bW,  y: H-iY-bH*2-bGap-4, label:'D', lx: W-iX-bW-2, ly: H-iY-bH*2-bGap-6 },
      ];
      corners.forEach(c => {
        burners += `<rect x="${c.x}" y="${c.y}"           width="${bW}" height="${bH}"      fill="rgba(255,120,30,0.85)" rx="1.5"/>`;
        burners += `<rect x="${c.x}" y="${c.y+bH+bGap}"  width="${bW}" height="${bH}"      fill="rgba(255,80,20,0.75)"  rx="1.5"/>`;
        burners += `<text x="${c.lx}" y="${c.ly}" fill="rgba(255,255,255,0.25)" font-size="7" font-family="monospace" font-weight="800">${c.label}</text>`;
      });

      // Tangential swirl arrows (suggest clockwise rotation)
      const r = 28;
      burners += `
        <path d="M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx},${cy-r}" fill="none" stroke="rgba(255,180,0,0.18)" stroke-width="1.5" stroke-dasharray="3,3"/>
        <path d="M ${cx+r},${cy} A ${r},${r} 0 0,1 ${cx},${cy+r}" fill="none" stroke="rgba(255,180,0,0.18)" stroke-width="1.5" stroke-dasharray="3,3"/>
        <path d="M ${cx},${cy-r} A ${r},${r} 0 0,1 ${cx+r},${cy}" fill="none" stroke="rgba(255,160,0,0.12)" stroke-width="1" stroke-dasharray="2,4"/>`;

      // Central rotating fireball (circular, positioned dynamically)
      fireball = `<circle id="${px}-fbsvg" cx="${cx}" cy="${cy}" r="26"
        fill="url(#fbg-${px})" filter="url(#glow-${px})"
        class="furnace-fb-tangential"
        style="transform-origin:${cx}px ${cy}px;"/>`;

    } else {
      // ── WALL-FIRED (BARH): left + right side wall burner arrays ──
      // 4 burners along the Left and Right walls firing horizontally towards center
      const burnersPerSide = 4;
      const bW = 8, bH = 6;
      const ySpacing = iH / (burnersPerSide + 1);

      for (let bi = 1; bi <= burnersPerSide; bi++) {
        const by = iY + bi * ySpacing - bH/2;
        // Left wall burners (shoot to the right)
        burners += `<rect x="${iX+1}" y="${by}" width="${bW}" height="${bH}" fill="rgba(255,80,0,0.85)" rx="1"/>`;
        // Right wall burners (shoot to the left)
        burners += `<rect x="${W-iX-bW-1}" y="${by}" width="${bW}" height="${bH}" fill="rgba(255,80,0,0.85)" rx="1"/>`;
        // Flame jets meeting in the center
        burners += `<path d="M ${iX+bW+2},${by+bH/2} Q ${iX+bW+16},${by+bH/2} ${cx},${cy}" stroke="rgba(255,140,0,0.12)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
        burners += `<path d="M ${W-iX-bW-2},${by+bH/2} Q ${W-iX-bW-16},${by+bH/2} ${cx},${cy}" stroke="rgba(255,140,0,0.12)" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
        // Label each burner row
        burners += `<text x="${iX+bW+4}" y="${by+4.5}" fill="rgba(255,255,255,0.25)" font-size="5" font-family="monospace">B-${bi}</text>`;
        burners += `<text x="${W-iX-bW-16}" y="${by+4.5}" fill="rgba(255,255,255,0.25)" font-size="5" font-family="monospace" text-anchor="end">B-${bi}</text>`;
      }

      // Wall-fired: vertical elongated flame zone (ellipse) for side-fired tall furnace
      fireball = `<ellipse id="${px}-fbsvg" cx="${cx}" cy="${cy}" rx="34" ry="64"
        fill="url(#fbg-${px})" filter="url(#glow-${px})"
        class="furnace-fb-wall"/>`;
    }

    // ── FIRING TYPE BADGE (bottom right of SVG) ──
    const badge = `<text x="${W-4}" y="${H-4}" text-anchor="end"
      fill="rgba(255,255,255,0.2)" font-size="5.5" font-family="'JetBrains Mono',monospace">
      ${isTang ? 'TANGENTIAL FIRING' : 'WALL FIRING (DOOSAN)'}
    </text>`;

    // ── BIAS LABEL (bottom left, updates live) ──
    const biasLabel = `<text id="${px}-fbsvg-bias" x="${iX+2}" y="${H-4}"
      fill="rgba(255,200,100,0.5)" font-size="5.5" font-family="'JetBrains Mono',monospace">
      Fireball: Centered
    </text>`;

    return `<div class="furnace-rect-wrapper">
      <svg class="furnace-rect-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        ${defs}${walls}${burners}${fireball}${labels}${badge}${biasLabel}
      </svg>
    </div>`;
  }

  /**
   * Updates the furnace SVG every polling cycle:
   *  - Wall rectangles colored by average TMT (green→cyan→orange→red→magenta)
   *  - Fireball position shifts based on L/R/F/R imbalance
   *  - Fireball size scales with fatigue risk
   */
  function updateFurnaceView(px, m) {
    const W = isWallFired ? 160 : 230, H = isWallFired ? 240 : 170, WT = 12;
    const iX = WT, iY = WT, iW = W - 2*WT, iH = H - 2*WT;
    const cx = W/2, cy = H/2;

    // Map average wall temp → fill color for wall rectangles
    function wallColor(temp) {
      if (isNaN(temp) || temp < 380)            return '#112338';   // cold/unknown
      if (temp < LIMITS.tempWarning - 30)       return '#0d3d28';   // normal cool — dark green
      if (temp < LIMITS.tempWarning)            return '#1a4a1a';   // normal warm — green
      if (temp < LIMITS.tempCritical)           return '#4d2400';   // warning — dark orange
      if (temp < LIMITS.tempFatal)              return '#5c1100';   // critical — dark red
      return '#4d004d';                                              // fatal — dark magenta
    }

    const walls = [
      { id: `${px}-wsvg-front`, temp: m.wallAves.front },
      { id: `${px}-wsvg-rear`,  temp: m.wallAves.rear  },
      { id: `${px}-wsvg-left`,  temp: m.wallAves.left  },
      { id: `${px}-wsvg-right`, temp: m.wallAves.right },
    ];
    walls.forEach(w => {
      const el = document.getElementById(w.id);
      if (el) el.setAttribute('fill', wallColor(w.temp));
    });

    // Update fireball position (maps fireball.x/y 25%–75% → inner furnace coords)
    const fb = document.getElementById(`${px}-fbsvg`);
    if (fb) {
      if (m.isOffline) {
        fb.setAttribute('display', 'none');
      } else {
        fb.removeAttribute('display');
        const fbX = iX + ((m.fireball.x / 100) * iW);
        const fbY = iY + ((m.fireball.y / 100) * iH);

        if (FIRING_TYPE === 'tangential') {
          // Tangential: move circle center
          fb.setAttribute('cx', Math.max(iX+30, Math.min(W-iX-30, fbX)));
          fb.setAttribute('cy', Math.max(iY+22, Math.min(H-iY-22, fbY)));
          // Scale radius with fatigue risk (base 24 → max 34)
          const r = Math.min(34, 24 + (m.fatigueRisk / 100) * 10);
          fb.setAttribute('r', r);
        } else {
          // Wall-fired: shift ellipse center left-right only (L/R imbalance)
          const shift = ((m.fireball.x - 50) / 100) * 30; // ±15px horizontal
          fb.setAttribute('cx', cx + shift);
          // Scale rx/ry with fatigue risk
          const scl = 1 + (m.fatigueRisk / 100) * 0.3;
          fb.setAttribute('rx', Math.round((isWallFired ? 34 : 58) * scl));
          fb.setAttribute('ry', Math.round((isWallFired ? 64 : 38) * scl));
        }
      }
    }

    // Update bias label
    const biasEl = document.getElementById(`${px}-fbsvg-bias`);
    if (biasEl) biasEl.textContent = m.isOffline ? 'Fireball: No Fire' : `Fireball: ${m.biasDirection}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 13. LAUNCH BUTTON & OVERLAY TOGGLE
  // ═══════════════════════════════════════════════════════════════
  function injectLaunchButton() {
    if (document.getElementById('boiler-launch-widget')) return;
    const btn = document.createElement('div');
    btn.id        = 'boiler-launch-widget';
    btn.className = 'boiler-launch-widget';
    btn.innerHTML = `<span>📊 Boiler Expert Dashboard</span>`;
    btn.addEventListener('click', toggleFullScreenMode);
    document.body.appendChild(btn);
  }

  function toggleFullScreenMode() {
    const overlay = document.getElementById('boiler-fullscreen-dashboard-overlay');
    if (!overlay) return;
    const active = overlay.classList.toggle('active');
    document.body.style.overflow = active ? 'hidden' : '';
    if (active) {
      const activeTab = document.querySelector('.fs-tab.active');
      if (activeTab && activeTab.dataset.tab !== 'live') switchTab(activeTab.dataset.tab);
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.fs-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.fs-tab-content').forEach(c => c.classList.add('hidden'));
    const btn = document.querySelector(`.fs-tab[data-tab="${tabName}"]`);
    const content = document.getElementById(`tab-${tabName}`);
    if (btn)     btn.classList.add('active');
    if (content) content.classList.remove('hidden');

    if (tabName === 'today') {
      const el = document.getElementById('today-summary-content');
      if (el) el.innerHTML = generateTodaySummaryHTML();
    } else if (tabName === 'history') {
      const el = document.getElementById('history-7day-content');
      if (el) el.innerHTML = generate7DayHistoryHTML();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 14. UI UPDATE FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  function setEl(id, val) { const e=document.getElementById(id); if(e) e.innerText=val; }

  function updateRadialGauge(ringId, textId, score) {
    const ring = document.getElementById(ringId), text = document.getElementById(textId);
    if (!ring || !text) return;
    const circ = 2 * Math.PI * 38;
    ring.style.strokeDashoffset = circ - (score/100)*circ;
    text.innerText = `${score}%`;
    const [sc, tc] = score>=75 ? ['#ff3b30','#ff6666'] : score>=55 ? ['#ff8c00','#ffaa00'] : score>=30 ? ['#ffa500','#ffa500'] : ['#238636','#3df060'];
    ring.style.stroke = sc; text.style.color = tc;
  }

  function updateUnitHeatmap(viewId, tubesData, hottest, fastest) {
    const container = document.getElementById(viewId);
    if (!container) return;
    const prefix = viewId.split('-')[0].toUpperCase();
    ['front','left','right','rear'].forEach(wall => {
      const list = [...(tubesData[wall] || [])].sort(compareTubeGeometry);
      const section = container.querySelector(`.heatmap-wall-section[data-wall="${wall}"]`);
      const grid = section ? section.querySelector('.heatmap-cell-grid') : null;
      const countLabel = section ? section.querySelector('.heatmap-wall-count') : null;
      if (!grid) return;
      if (countLabel) countLabel.innerText = `Points: ${list.length}`;
      grid.style.gridTemplateColumns = `repeat(${Math.max(list.length, 1)}, 1fr)`;
      grid.classList.toggle('hm-compact', list.length > 24);
      if (!list.length) {
        if (grid.dataset.signature !== 'empty') {
          grid.replaceChildren();
          const empty = document.createElement('div');
          empty.className = 'heatmap-cell hm-c-green muted';
          empty.textContent = '--';
          grid.appendChild(empty);
          grid.dataset.signature = 'empty';
        }
        return;
      }

      const signature = list.map(t => `${wall}:${t.tube}`).join('|');
      if (grid.dataset.signature !== signature) {
        const fragment = document.createDocumentFragment();
        list.forEach(t => {
          const cell = document.createElement('div');
          cell.className = 'heatmap-cell';
          cell.dataset.unit = prefix;
          cell.dataset.wall = wall;
          cell.dataset.tube = String(t.tube);
          fragment.appendChild(cell);
        });
        grid.replaceChildren(fragment);
        grid.dataset.signature = signature;
      }

      const cells = grid.children;
      list.forEach((t, index) => {
        let cls = 'heatmap-cell';
        if      (t.val < LIMITS.tempWarning-60) cls += ' hm-c-green';
        else if (t.val < LIMITS.tempWarning-30) cls += ' hm-c-cyan';
        else if (t.val < LIMITS.tempWarning)    cls += ' hm-c-yellow';
        else if (t.val < LIMITS.tempCritical)   cls += ' hm-c-orange';
        else if (t.val < LIMITS.tempFatal)      cls += ' hm-c-red';
        else                                    cls += ' hm-c-magenta';
        if (hottest  && hottest.wall===wall  && hottest.tube===t.tube)                              cls += ' hotspot-peak';
        if (fastest  && fastest.wall===wall  && fastest.tube===t.tube && Math.abs(t.roc||0)>LIMITS.rocWarning) cls += ' hotspot-rise';
        const rateText = t.rocValid ? `${(t.roc||0).toFixed(2)}°C/min` : 'baseline';
        const cell = cells[index];
        if (!cell) return;
        cell.className = cls;
        cell.textContent = t.val.toFixed(0);
        cell.title = `${t.tag}\nValue: ${t.val.toFixed(0)}°C\nRate: ${rateText}\nPI Vision order: ${t.screenOrder || '--'}`;
      });
    });
  }

  function updateWallGradientSparklines(px, tubesData) {
    ['front','left','right','rear'].forEach(wall => {
      const list = (tubesData[wall]||[]);
      const sparklineEl = document.getElementById(`${px}-sparkline-${wall}`);
      const rangeEl = document.getElementById(`${px}-range-${wall}`);
      if (!sparklineEl || !rangeEl) return;
      
      if (!list.length) {
        sparklineEl.innerHTML = '';
        rangeEl.innerText = '--–--°C';
        return;
      }
      
      list.sort(compareTubeGeometry);
      const vals  = list.map(t=>t.val);
      const minV  = Math.min(...vals), maxV = Math.max(...vals);
      const range = Math.max(maxV-minV, 1);
      
      const bars = list.map(t => {
        const h = Math.max(2, Math.round(((t.val-minV)/range)*14));
        const color = t.val>=LIMITS.tempFatal?'#ff00ff': t.val>=LIMITS.tempCritical?'#ff3b30': t.val>=LIMITS.tempWarning?'#ff8c00': t.val>=(LIMITS.tempWarning-30)?'#ffc72c': '#238636';
        return `<div class="wall-sg-bar" title="Tube ${t.tube}: ${t.val.toFixed(0)}°C" style="height:${h}px;background:${color};"></div>`;
      }).join('');
      
      sparklineEl.innerHTML = bars;
      rangeEl.innerText = `${minV.toFixed(0)}–${maxV.toFixed(0)}°C`;
    });
  }

  function updatePerWallSpreads(px, wallSpreads) {
    ['front','left','right','rear'].forEach(wall => {
      const spread = wallSpreads[wall] || 0;
      const valEl = document.getElementById(`${px}-spread-val-${wall}`);
      if (valEl) {
        valEl.innerText = isNaN(spread) ? '--°C' : `${spread.toFixed(0)}°C`;
        const color = spread >= LIMITS.spreadWallCritical ? '#ff3b30' : spread >= LIMITS.spreadWallWarning ? '#ffa500' : '#238636';
        valEl.style.color = color;
      }
    });
  }

  function updateRampRateDisplay(px, rampRate, isValid) {
    const valEl = document.getElementById(`${px}-ramp-val`);
    const barEl = document.getElementById(`${px}-ramp-bar`);
    if (!valEl || !barEl) return;
    if (!isValid) {
      valEl.innerText = 'stabilizing';
      valEl.style.color = '#8b949e';
      barEl.style.width = '0%';
      barEl.style.background = '#30363d';
      return;
    }
    const abs  = Math.abs(rampRate||0);
    const sign = rampRate>0.1?'▲': rampRate<-0.1?'▼':'';
    valEl.innerText = `${sign} ${abs.toFixed(1)} MW/min`;
    valEl.style.color = abs>=LIMITS.rampCritical?'#ff6666': abs>=LIMITS.rampWarning?'#ffaa00':'#3df060';
    const pct = Math.min(100, (abs/(LIMITS.rampCritical*1.5))*100);
    barEl.style.width      = `${pct}%`;
    barEl.style.background = abs>=LIMITS.rampCritical?'#ff3b30': abs>=LIMITS.rampWarning?'#ffa500':'#238636';
  }

  function updateMillsGrid(gridId, load, unitMills) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const mills = ['A','B','C','D','E','F','G','H','J'];
    const hasLiveMillData = unitMills && Object.keys(unitMills).length > 0;
    if (!hasLiveMillData && !isMockPage()) {
      grid.innerHTML = `<div class="mill-data-unavailable">MILL DATA UNAVAILABLE - no running status inferred from load</div>`;
      return;
    }
    grid.innerHTML = mills.map((m, i) => {
      let isActive = false;
      if (unitMills && unitMills[m] !== undefined) {
        isActive = unitMills[m] > 1.0; // feedrate > 1 TPH means active
      } else {
        let active = 0;
        if (load > 700) active = 7;
        else if (load > 600) active = 6;
        else if (load > 450) active = 5;
        else if (load > 200) active = 4;
        else if (load > 50) active = 2;
        isActive = i < active;
      }
      return `<div class="mill-indicator-badge"><span class="mill-led ${isActive ? 'active' : ''}"></span>MILL ${m}</div>`;
    }).join('');
  }

  function updateOperatorSignal(px, m) {
    const card = document.getElementById(`${px}-operator-signal`);
    const stateEl = document.getElementById(`${px}-operator-state`);
    const conditionEl = document.getElementById(`${px}-operator-condition`);
    const evidenceEl = document.getElementById(`${px}-operator-evidence`);
    const checkEl = document.getElementById(`${px}-operator-check`);
    if (!card || !stateEl || !conditionEl || !evidenceEl || !checkEl) return;

    let state = 'NORMAL';
    let cls = 'normal';
    let condition = 'Combustion pattern stable within screening limits';
    let evidence = `WW spread ${m.totalWWSpread.toFixed(0)} C; LR ${m.lrSpread.toFixed(0)} C; FR ${m.frSpread.toFixed(0)} C`;
    let check = 'Continue routine monitoring; no tuning signal';

    if (m.isOffline) {
      state = 'OFFLINE'; cls = 'data-gap';
      condition = 'Unit non-operational';
      evidence = `Load ${m.load.toFixed(0)} MW`;
      check = 'No combustion tuning action';
    } else if (!m.validForFatigue || m.dataConfidence < 70) {
      state = 'DATA CHECK'; cls = 'data-gap';
      const missing = (m.dataQuality.missingInputs || []).join(', ') || 'quality/freshness validation';
      condition = 'Operator recommendation withheld';
      evidence = `Mapped ${m.dataQuality.tubeCount}/${m.dataQuality.expectedTubeCount || '?'} MTMs; missing ${missing}`;
      check = 'Verify PI quality, timestamp and tag mapping';
    } else if (m.maxTmt >= LIMITS.tempFatal || Math.abs(m.maxRateOfRise) >= LIMITS.rocFatal) {
      state = 'PROTECT'; cls = 'critical';
      condition = `${m.hottestTube ? m.hottestTube.wall.toUpperCase() : 'WW'} hotspot / rapid thermal exposure`;
      evidence = `Peak ${m.maxTmt.toFixed(0)} C; 2-min RoC ${m.rateOfRiseValid ? m.maxRateOfRise.toFixed(2) : '--'} C/min`;
      check = 'Hold further ramp; validate adjacent sensors and notify boiler desk';
    } else if (m.maxAdjDelta >= LIMITS.deltaTCritical || m.maxImbalance >= LIMITS.balanceCritical) {
      state = 'ACTION'; cls = 'warning';
      condition = `${m.biasDirection} / high local temperature gradient`;
      evidence = `Adjacent delta ${m.maxAdjDelta.toFixed(0)} C; LR ${m.lrSpread.toFixed(0)} C; FR ${m.frSpread.toFixed(0)} C`;
      check = isWallFired
        ? 'Check paired burner-bank, mill and secondary-air actual feedback'
        : 'Check mill/feeder balance, O2 grid and SADC/SOFA actual feedback';
    } else if (m.fatigueRisk >= 30 || m.maxAdjDelta >= LIMITS.deltaTWarning || m.maxImbalance >= LIMITS.balanceWarning) {
      state = 'WATCH'; cls = 'watch';
      condition = 'Developing thermal pattern deviation';
      evidence = `Exposure score ${m.fatigueRisk}/100; adjacent delta ${m.maxAdjDelta.toFixed(0)} C`;
      check = 'Verify persistence and supporting process signals before tuning';
    }

    const primaryCause = m.causeAnalysis && m.causeAnalysis.primary;
    if (!m.isOffline && m.dataConfidence >= 70 && primaryCause && primaryCause.confidence >= 40) {
      if (primaryCause.id === 'sensor' && primaryCause.confidence >= 70) {
        state = 'DATA CHECK'; cls = 'data-gap';
        condition = primaryCause.label;
      } else if (state === 'NORMAL') {
        state = primaryCause.confidence >= 70 ? 'ACTION' : 'WATCH';
        cls = primaryCause.confidence >= 70 ? 'warning' : 'watch';
        condition = `${primaryCause.label} (${primaryCause.confidence}% confidence)`;
      } else {
        condition = `${condition}; likely ${primaryCause.label.toLowerCase()} (${primaryCause.confidence}%)`;
      }
      if (primaryCause.evidence.length) evidence = primaryCause.evidence.slice(0, 2).join('; ');
      if (primaryCause.checks.length) check = primaryCause.checks[0];
    }

    card.className = `fs-operator-signal ${cls}`;
    stateEl.innerText = state;
    stateEl.style.color = cls === 'critical' ? '#ff6666' : cls === 'warning' ? '#ffc72c' : cls === 'watch' ? '#00e6c3' : cls === 'data-gap' ? '#ff8c00' : '#3df060';
    conditionEl.innerText = condition;
    evidenceEl.innerText = evidence;
    checkEl.innerText = check;
  }

  function updateDiagnosticDirectives(px, m) {
    const box   = document.getElementById(`${px}-diag-box`);
    const title = document.getElementById(`${px}-diag-title`);
    const desc  = document.getElementById(`${px}-diag-desc`);
    if (!box||!title||!desc) return;
    box.className   = 'fs-diag-box';
    title.className = 'fs-diag-title';

    // Helper to build the 4-part structured directive block
    function buildDirective(cause, action, tuning, risk) {
      return `<strong>⚑ Probable Cause / Condition:</strong> ${cause}<br>
        <strong>⚡ Immediate Action:</strong> ${action}<br>
        <strong>🔧 Verify / Approved Action:</strong> ${tuning}<br>
        <strong>⚠️ Risk if Unacted:</strong> ${risk}`;
    }

    if (m.isOffline) {
      box.classList.add('normal');
      title.classList.add('normal');
      title.innerText = '⚪ UNIT NON-OPERATIONAL';
      desc.innerHTML  = `<strong>Status:</strong> Unit is offline / shut down. Active power is 0 MW. Session exposure screening index: <strong>${((m.cdf||0)*100).toFixed(1)}</strong>. No active combustion tuning signal.`;

    } else if (!m.validForFatigue) {
      const missing = (m.dataQuality && m.dataQuality.missingInputs || []).join(', ') || 'critical PI tags';
      const assumed = (m.dataQuality && m.dataQuality.assumedInputs || []).join(', ') || 'none';
      box.classList.add('critical');
      title.classList.add('critical');
      title.innerText = '🔴 LIVE DATA MAPPING GAP';
      desc.innerHTML = buildDirective(
        `Fatigue judgment is disabled because the dashboard does not have enough confirmed live PI data. Missing/unmapped: <strong>${missing}</strong>. Assumed values currently visible: <strong>${assumed}</strong>.`,
        `Do not use exposure score, heatmap pattern, or probable cause for operation until WW MTM and core process tags are mapped.`,
        `Open the PI Vision display in edit mode and verify the water-wall MTM symbol title tags for this unit. Add or correct parser mappings for load, O2, air, PA, coal, ECO flow, and MS/RH temperature.`,
        `A visually healthy dashboard with unmapped PI tags can mask a developing long-fin crack condition. Restore data confidence before relying on operator recommendations.`
      );

    } else if (m.isBensonZone) {
      // HIGHEST PRIORITY: Benson minimum-flow zone
      box.classList.add('critical'); title.classList.add('critical');
      title.innerText = '🔴 BENSON MINIMUM-FLOW ZONE — CRITICAL';
      desc.innerHTML = buildDirective(
        `Load at <strong>${((m.loadPct||0)*100).toFixed(0)}% MCR</strong> is inside the configured low-load hydraulic-instability watch band. Actual pressure, minimum-flow demand and recirculation-valve feedback are not mapped here.`,
        `Hold unnecessary disturbances while the operator verifies actual pressure, valve feedback, separator/drum behavior and station operating mode.`,
        `Follow the station-approved low-load SOP after confirming the live hydraulic signals; avoid changing burner or air settings from this indication alone.`,
        `Unverified low-load operation can coincide with unstable waterwall response, so escalate if pressure/level/TMT evidence confirms the condition.`
      );

    } else if (m.isSubcritical) {
      // Subcritical steam pressure regime
      box.classList.add('warning'); title.classList.add('warning');
      title.innerText = `⚠️ SUBCRITICAL STEAM REGIME — ${((m.loadPct||0)*100).toFixed(0)}% MCR`;
      desc.innerHTML = buildDirective(
        `Load at <strong>${((m.loadPct||0)*100).toFixed(0)}% MCR</strong> is inside the configured transition watch band. Actual steam pressure is not mapped. TMT oscillation screening sigma: <strong>${(m.tmtOscSigma||0).toFixed(1)}°C</strong>.`,
        `Maintain a stable operating condition while verifying pressure, flow and valve feedback. Avoid unnecessary mill changeover during a confirmed thermal oscillation.`,
        `Check actual O2, PA/SA distribution and burner feedback against the station-approved low-load envelope before tuning.`,
        `Persistent, corroborated TMT oscillation warrants engineering review of low-load hydraulic and combustion interaction.`
      );

    } else if (m.maxTmt >= LIMITS.tempFatal) {
      box.classList.add('critical'); title.classList.add('critical');
      title.innerText = '🔴 CRITICAL WATERWALL TEMPERATURE';
      desc.innerHTML = buildDirective(
        `Severe hotspot at <strong>${m.hottestTube?m.hottestTube.wall.toUpperCase()+' Tube '+m.hottestTube.tube:'--'}</strong> reaching <strong>${m.maxTmt.toFixed(0)}°C</strong>. Flame impingement on waterwall. Creep damage to tube material imminent.`,
        `HOLD load immediately. Initiate localized furnace wall-blowing sequence.`,
        isWallFired
          ? `For side-fired/J-flame operation, reduce firing bias from the hot-wall burner bank/elevation. Balance the paired left/right burners of the same mill before further load increase.`
          : `Verify SADC/SOFA actual feedback, mill/feeder balance, O2 grid and adjacent sensors. Apply only the station-approved bounded correction after confirming the cause.`,
        `Sustained confirmed overheating can accelerate creep and crack damage; escalation timing must follow the station alarm response procedure.`
      );

    } else if (Math.abs(m.rampRate||0) >= LIMITS.rampCritical) {
      box.classList.add('critical'); title.classList.add('critical');
      title.innerText = '🔴 CRITICAL LOAD RAMP RATE';
      desc.innerHTML = buildDirective(
        `Ramp rate <strong>${(m.rampRate||0).toFixed(1)} MW/min</strong> exceeds the configured screening limit of <strong>${LIMITS.rampCritical} MW/min</strong> and is increasing thermal-transient exposure.`,
        `STOP load change immediately. Hold current load for minimum 5 minutes.`,
        `Verify dispatch instruction for load ramp rate constraints. Target ≤ 3 MW/min. Monitor TMT stabilization before resuming ramp.`,
        `Continued rapid cycling increases thermal exposure. Session screening index: <strong>${((m.cdf||0)*100).toFixed(1)}</strong>; historian cycle analysis is required for life assessment.`
      );

    } else if ((m.dei||0) >= LIMITS.deiCritical) {
      box.classList.add('critical'); title.classList.add('critical');
      title.innerText = '🔴 CRITICAL DIFFERENTIAL EXPANSION';
      desc.innerHTML = buildDirective(
        `DEI = <strong>${((m.dei||0)*100).toFixed(1)}%</strong> — tubes running significantly hotter than the configured load baseline. Differential thermal screening index: <strong>${m.thermalStress}</strong>.`,
        `HOLD load ramp. Start emergency wall-blowing sequence on hottest wall immediately.`,
        isWallFired
          ? `Balance side-wall secondary air between left/right banks. Check same-mill elevation groups and reduce hot-wall J-flame impingement. Verify O2 balance across the gas path.`
          : `Verify SADC/SOFA feedback, mill/feeder balance and O2-grid bias. Apply only station-approved correction after the evidence agrees.`,
        `The screening index indicates elevated differential thermal exposure; confirm with historian trends and engineering assessment.`
      );

    } else if ((m.dei||0) >= LIMITS.deiWarning) {
      box.classList.add('warning'); title.classList.add('warning');
      title.innerText = `⚠️ ELEVATED DIFFERENTIAL EXPANSION — DEI=${((m.dei||0)*100).toFixed(1)}%`;
      desc.innerHTML = buildDirective(
        `Tubes running <strong>${((m.dei||0)*100).toFixed(1)}%</strong> hotter than the configured baseline for <strong>${((m.loadPct||0)*100).toFixed(0)}% MCR</strong>. Differential thermal screening index: <strong>${m.thermalStress}</strong>.`,
        `Reduce load ramp rate to ≤ 2 MW/min. Start sootblowing on hottest wall section.`,
        `Check economizer exit O2 for excess air imbalance. Optimize PA/SA split at nozzle level. Inspect air heater X-ratio if available.`,
        `Sustained elevation may increase differential thermal exposure. Session screening index: <strong>${((m.cdf||0)*100).toFixed(1)}</strong>.`
      );

    } else if ((m.cdf||0) >= LIMITS.cdfWarning) {
      box.classList.add('warning'); title.classList.add('warning');
      const cdfPct = ((m.cdf||0)*100).toFixed(1);
      title.innerText = `⚠️ SESSION THERMAL EXPOSURE — INDEX ${cdfPct}`;
      desc.innerHTML = buildDirective(
        `Session screening index at <strong>${cdfPct}</strong>. This is not validated percentage life consumed; rainflow and approved fatigue curves are required.`,
        `Avoid additional unnecessary thermal disturbance while reviewing recent load ramps and mill changes.`,
        `Verify actual O2, air and mill distribution against the station-approved operating envelope.`,
        `Escalate persistent crack-zone exposure for historian review and inspection planning.`
      );

    } else if (m.thermalStress >= LIMITS.stressWarning) {
      title.innerText = '⚠️ HIGH FIN DIFFERENTIAL THERMAL INDEX';
      desc.innerHTML = buildDirective(
        `Adjacent tube ΔT: <strong>${m.maxAdjDelta.toFixed(0)}°C</strong> → screening index: <strong>${m.thermalStress}</strong>. DEI: <strong>${((m.dei||0)*100).toFixed(1)}%</strong>. Hotspot at <strong>${m.hottestTube?m.hottestTube.wall.toUpperCase()+' Tube '+m.hottestTube.tube:'--'}</strong>.`,
        isWallFired ? `Stabilize the operating condition and verify the hot-wall burner bank, physical adjacency and sensor validity.` : `Verify SADC/SOFA feedback, adjacent sensors and mill/feeder balance before correction.`,
        isWallFired
          ? `Check left/right paired burners for the active mill elevation. Correct J-flame wall washing and run wall-blowing on the affected panel.`
          : `Bias mill feeds away from hot-wall corner. Adjust SOFA nozzle yaw tilts to re-center combustion. Run wall-blowing on affected panel.`,
        `Persistent confirmed adjacent-tube differential can increase fin-weld exposure; trend duration and escalate the configured crack zone.`
      );

    } else if (m.maxImbalance >= LIMITS.balanceWarning) {
      title.innerText = isWallFired ? '⚠️ SIDE-FIRED J-FLAME BIAS' : '⚠️ COMBUSTION FIREBALL SHIFT';
      desc.innerHTML = buildDirective(
        isWallFired
          ? `Wall imbalance <strong>${m.maxImbalance.toFixed(0)}°C</strong>. Bias: <strong>${m.biasDirection}</strong>. L/R spread: ${m.lrSpread.toFixed(0)}°C, F/Rear spread: ${m.frSpread.toFixed(0)}°C. Likely side-wall burner bank or same-mill elevation imbalance.`
          : `Wall imbalance <strong>${m.maxImbalance.toFixed(0)}°C</strong>. Combustion bias: <strong>${m.biasDirection}</strong>. L/R spread: ${m.lrSpread.toFixed(0)}°C, F/Rear spread: ${m.frSpread.toFixed(0)}°C.`,
        isWallFired ? `Verify left/right burner bank loading for the active mill elevation. Hold load ramp until wall spread stabilizes.` : `Verify mill feeder rate balances (target ±2% across all active mills).`,
        isWallFired ? `Balance secondary air distribution across side-wall burner banks. Inspect flame scanner/CCTV evidence for J-flame wall washing.` : `Align SADC/SOFA secondary air yaw tilts toward cool wall. Balance O₂ across grid measurement points. Adjust burner elevation bias if available.`,
        isWallFired ? `Sustained J-flame wall bias drives local fin-weld fatigue and can accelerate long-fin crack propagation.` : `Sustained fireball shift causes progressive tube heating asymmetry. DEI will rise if hot wall not corrected within 20 minutes.`
      );

    } else if (Math.abs(m.maxRateOfRise) >= LIMITS.rocWarning) {
      title.innerText = 'ℹ️ FAST THERMAL TRANSIENT';
      desc.innerHTML = buildDirective(
        `TMT change rate <strong>${m.maxRateOfRise.toFixed(2)}°C/min</strong> at <strong>${m.fastestRisingTube?m.fastestRisingTube.wall.toUpperCase()+' Tube '+m.fastestRisingTube.tube:'--'}</strong>. Rapid temperature change implies combustion shift or load change.`,
        `Restrict load ramp rate. Avoid rapid mill changeovers until TMT settles.`,
        `If linked to mill changeover: stagger changeovers by ≥ 3 minutes. If linked to load ramp: target max ${LIMITS.rampWarning} MW/min.`,
        `Persistent high rate of rise depletes tube cyclic life. Monitor for TMT overshoot above ${LIMITS.tempWarning}°C.`
      );

    } else {
      box.classList.add('normal'); title.classList.add('normal');
      title.innerText = '🟢 ALL PARAMETERS NORMAL';
      desc.innerHTML = `<strong>Status:</strong> Boiler Mode: <strong>${m.boilerMode||'--'}</strong> · Load: <strong>${((m.loadPct||0)*100).toFixed(0)}% MCR</strong><br>
        Wall averages — L:${m.wallAves.left?m.wallAves.left.toFixed(0):'--'}°C · R:${m.wallAves.right?m.wallAves.right.toFixed(0):'--'}°C · F:${m.wallAves.front?m.wallAves.front.toFixed(0):'--'}°C · Rr:${m.wallAves.rear?m.wallAves.rear.toFixed(0):'--'}°C<br>
        DEI: <strong>${((m.dei||0)*100).toFixed(1)}%</strong> · Session exposure index: <strong>${((m.cdf||0)*100).toFixed(1)}</strong> · TMT σ: <strong>${(m.tmtOscSigma||0).toFixed(1)}°C</strong><br>
        Screening indicators are within configured limits. Continue routine monitoring.`;
    }
  }


  function updateUI(diagnostics) {
    if (!diagnostics) return;
    const nowStr = new Date().toLocaleTimeString();
    setEl('fs-live-time', nowStr);
    const confidenceValues = UNITS.map(u => diagnostics[u] ? diagnostics[u].dataConfidence : 0);
    const minConfidence = confidenceValues.length ? Math.min(...confidenceValues) : 0;
    const headerDataVal = document.getElementById('header-data-quality-val');
    const headerDataBox = document.getElementById('header-data-quality');
    if (headerDataVal && headerDataBox) {
      const dataText = minConfidence >= 80 ? 'MAPPED' : minConfidence >= 70 ? 'PARTIAL' : minConfidence > 0 ? 'LOW CONF' : 'MAPPING GAP';
      headerDataVal.innerText = dataText;
      headerDataVal.style.color = minConfidence >= 80 ? '#58a6ff' : minConfidence >= 70 ? '#ffaa00' : '#ff6666';
      headerDataBox.classList.toggle('data-gap', minConfidence < 70);
    }

    UNITS.forEach(u => {
      const m  = diagnostics[u];
      const px = u.toLowerCase();

      // Header badges
      setEl(`header-${px}-load`, m.isOffline ? 'OFFLINE' : `${m.load.toFixed(0)} MW`);
      setEl(`header-${px}-ci`,   m.isOffline ? '--' : `${m.cyclicIndex.toFixed(1)}`);
      const levelHdr = document.getElementById(`header-${px}-level`);
      if (levelHdr) {
        let level, cls;
        if (m.isOffline) {
          level = 'OFFLINE';
          cls   = 'offline';
        } else if (!m.validForFatigue) {
          level = 'DATA GAP';
          cls   = 'critical';
        } else {
          level = m.fatigueRisk>=75?'CRITICAL': m.fatigueRisk>=55?'WARNING': m.fatigueRisk>=30?'WATCH':'NORMAL';
          cls   = m.fatigueRisk>=75?'critical': m.fatigueRisk>=55?'warning': m.fatigueRisk>=30?'watch':'normal';
        }
        levelHdr.innerText   = level;
        levelHdr.className   = `fs-badge-status ${cls}`;
      }

      // Combustion card
      setEl(`${px}-stat-load`, `${m.load.toFixed(0)} MW`);
      setEl(`${px}-stat-o2`,   Number.isFinite(m.o2) ? `${m.o2.toFixed(1)} %` : '-- %');
      setEl(`${px}-stat-air`,  Number.isFinite(m.air) ? `${m.air.toFixed(0)} t/h` : '-- t/h');
      setEl(`${px}-stat-pa`,   Number.isFinite(m.pa) ? `${m.pa.toFixed(0)} t/h` : '-- t/h');
      setEl(`${px}-stat-eco`,  Number.isFinite(m.eco) ? `${m.eco.toFixed(0)} TPH` : '-- TPH');
      setEl(`${px}-stat-coal`, m.coal !== undefined && !isNaN(m.coal) ? `${m.coal.toFixed(0)} t/h` : '-- t/h');
      setEl(`${px}-stat-tilt`, m.burnerTilt !== undefined && !isNaN(m.burnerTilt) ? `${m.burnerTilt.toFixed(1)} %` : '-- %');
      setEl(`${px}-stat-model`, isWallFired ? 'SIDE-FIRED / J-FLAME' : 'TANGENTIAL');
      const hfgL = m.signals && Number.isFinite(m.signals.hfgLhs) ? m.signals.hfgLhs.toFixed(0) : '--';
      const hfgR = m.signals && Number.isFinite(m.signals.hfgRhs) ? m.signals.hfgRhs.toFixed(0) : '--';
      setEl(`${px}-stat-hfg`, `${hfgL} / ${hfgR} °C`);
      const ofaRange = m.causeAnalysis && m.causeAnalysis.damperRange;
      setEl(`${px}-stat-ofa-range`, Number.isFinite(ofaRange) ? `${ofaRange.toFixed(1)} %` : '-- %');
      const suspectCount = m.sensorHealth && m.sensorHealth.suspect ? m.sensorHealth.suspect.length : 0;
      setEl(`${px}-stat-sensor-health`, suspectCount ? `${suspectCount} SUSPECT` : `${m.dataQuality.validTubeCount || m.dataQuality.tubeCount} VALID`);
      const confEl = document.getElementById(`${px}-stat-confidence`);
      if (confEl) {
        const assumed = (m.dataQuality && m.dataQuality.assumedInputs || []).length;
        const missing = (m.dataQuality && m.dataQuality.missingInputs || []).length;
        const mapped = `${m.dataQuality.tubeCount}/${m.dataQuality.expectedTubeCount || '?'} MTM`;
        confEl.innerText = `${m.confidenceLevel} · ${mapped} · PI quality/time unverified${missing ? ` · ${missing} missing` : assumed ? ` · ${assumed} unavailable` : ''}`;
        confEl.style.color = m.dataConfidence >= 80 ? '#58a6ff' : m.dataConfidence >= 70 ? '#ffaa00' : '#ff6666';
      }
      const biasEl = document.getElementById(`${px}-stat-bias`);
      if (biasEl) { biasEl.innerText=m.biasDirection; biasEl.style.color=m.biasDirection==='Uniform'?'#3df060':'#ffa500'; }

      // Furnace cross-section view
      updateFurnaceView(px, m);

      // Health badge
      const hb = document.getElementById(`${px}-health-badge`);
      if (hb) {
        if (m.isOffline) {
          hb.innerText = 'STATUS: OFFLINE';
          hb.style.color = '#8b949e';
        } else {
          hb.innerText=`HEALTH: ${m.healthScore}%`;
          hb.style.color=!m.validForFatigue?'#ff6666':m.healthScore>=75?'#3df060':m.healthScore>=45?'#ffaa00':'#ff6666';
        }
      }

      // Ramp rate card
      updateRampRateDisplay(px, m.rampRate, m.rampRateValid);
      setEl(`${px}-cycle-count`, m.cycleCount);
      setEl(`${px}-stat-ms`,     Number.isFinite(m.mshrh) ? `${m.mshrh.toFixed(0)} °C` : '-- °C');
      setEl(`${px}-stat-adj-dt`, `${m.maxAdjDelta.toFixed(0)} °C`);

      // Heatmap
      updateUnitHeatmap(`${px}-heatmap-view`, m.tubes, m.hottestTube, m.fastestRisingTube);

      // Wall gradient sparklines
      updateWallGradientSparklines(px, m.tubes);

      // Per-wall spread arcs
      updatePerWallSpreads(px, m.wallSpreads);

      // Heatmap stats strip
      setEl(`${px}-stat-hottest`, `${m.maxTmt.toFixed(0)}°C`);
      setEl(`${px}-stat-coldest`, `${m.minTmt.toFixed(0)}°C`);
      setEl(`${px}-stat-spread`,  `${m.totalWWSpread.toFixed(0)}°C`);
      const rocEl = document.getElementById(`${px}-stat-roc`);
      if (rocEl) {
        rocEl.innerText = m.rateOfRiseValid ? `${m.maxRateOfRise.toFixed(2)}°C/min` : 'baseline';
        rocEl.style.color = !m.rateOfRiseValid ? '#8b949e' : Math.abs(m.maxRateOfRise)>=LIMITS.rocCritical?'#ff6666':'#c9d1d9';
      }

      // Fatigue ring
      updateRadialGauge(`${px}-radial-ring`, `${px}-radial-text`, m.fatigueRisk);

      // Stress & imbalances
      const stressEl = document.getElementById(`${px}-stat-stress`);
      if (stressEl) { stressEl.innerText=`${m.thermalStress} index`; stressEl.style.color=m.thermalStress>=LIMITS.stressCritical?'#ff6666':m.thermalStress>=LIMITS.stressWarning?'#ffaa00':'#58a6ff'; }
      
      const ciEl = document.getElementById(`${px}-stat-ci`);
      if (ciEl) {
        ciEl.innerText = m.isOffline ? '--' : m.cyclicIndex.toFixed(1);
        ciEl.style.color = m.cyclicIndex >= 75.0 ? '#ff6666' : m.cyclicIndex >= 45.0 ? '#ffaa00' : '#3df060';
      }

      const flowMeanEl = document.getElementById(`${px}-stat-flow-mean`);
      const flowImbEl  = document.getElementById(`${px}-stat-flow-imb`);
      if (flowMeanEl) {
        const f1 = isNaN(m.flow1Ave) ? '--' : m.flow1Ave.toFixed(0);
        const f2 = isNaN(m.flow2Ave) ? '--' : m.flow2Ave.toFixed(0);
        flowMeanEl.innerText = `${f1} / ${f2} °C`;
      }
      if (flowImbEl) {
        flowImbEl.innerText = `${m.flowImbalance.toFixed(0)}°C`;
        flowImbEl.style.color = m.flowImbalance >= LIMITS.balanceCritical ? '#ff6666' : m.flowImbalance >= LIMITS.balanceWarning ? '#ffaa00' : '#3df060';
      }

      // Mills
      updateMillsGrid(`${px}-mills-grid`, m.load, m.mills);

      // ── v3: Boiler Mode · Fin-Weld Life · Differential Expansion Card ──
      const modeEl = document.getElementById(`${px}-stat-mode`);
      if (modeEl) {
        modeEl.innerText = m.boilerMode || '--';
        const modeColors = {
          'SUPERCRITICAL':  '#3df060',
          'PART-LOAD':      '#a8e6a3',
          'TRANSITIONAL':   '#ffd700',
          'SUBCRITICAL':    '#ff8c00',
          'BENSON-MIN-FLOW':'#ff3b30',
          'OFFLINE':        '#8b949e'
        };
        modeEl.style.color = modeColors[m.boilerMode] || '#c9d1d9';
      }

      const deiEl = document.getElementById(`${px}-stat-dei`);
      if (deiEl) {
        const dPct = ((m.dei||0)*100).toFixed(1);
        deiEl.innerText = `${dPct > 0 ? '+' : ''}${dPct}%`;
        deiEl.style.color = (m.dei||0) >= LIMITS.deiCritical ? '#ff3b30' :
                            (m.dei||0) >= LIMITS.deiWarning  ? '#ffa500' : '#3df060';
        deiEl.style.fontWeight = (m.dei||0) >= LIMITS.deiWarning ? '800' : '600';
      }

      const oscEl = document.getElementById(`${px}-stat-osc`);
      if (oscEl) {
        oscEl.innerText = `${(m.tmtOscSigma||0).toFixed(1)} °C σ`;
        oscEl.style.color = (m.tmtOscSigma||0) >= LIMITS.tmtOscThreshold ? '#ffa500' : '#c9d1d9';
      }

      const cdfEl = document.getElementById(`${px}-stat-cdf`);
      const cdfBar = document.getElementById(`${px}-cdf-bar`);
      if (cdfEl) {
        cdfEl.innerText = `${((m.cdf||0)*100).toFixed(1)} / 100`;
        cdfEl.style.color = (m.cdf||0) >= LIMITS.cdfCritical ? '#ff3b30' :
                            (m.cdf||0) >= LIMITS.cdfWarning  ? '#ffa500' : '#3df060';
      }
      if (cdfBar) {
        cdfBar.style.width      = `${Math.min(100, (m.cdf||0)*100).toFixed(1)}%`;
        cdfBar.style.background = (m.cdf||0) >= LIMITS.cdfCritical ? '#ff3b30' :
                                  (m.cdf||0) >= LIMITS.cdfWarning  ? '#ffa500' : '#238636';
      }

      const loadPctEl = document.getElementById(`${px}-stat-loadpct`);
      if (loadPctEl) {
        loadPctEl.innerText = m.isOffline ? 'OFFLINE' : `${((m.loadPct||0)*100).toFixed(0)}%`;
        loadPctEl.style.color = m.isBensonZone  ? '#ff3b30' :
                                m.isSubcritical ? '#ff8c00' : '#c9d1d9';
      }

      const weldRiskEl = document.getElementById(`${px}-stat-weld-risk`);
      if (weldRiskEl) {
        let risk = 'LOW'; let riskColor = '#3df060';
        if ((m.cdf||0) >= LIMITS.cdfCritical || (m.dei||0) >= LIMITS.deiCritical || m.thermalStress >= LIMITS.weldStressCritical) {
          risk = 'CRITICAL'; riskColor = '#ff3b30';
        } else if ((m.cdf||0) >= LIMITS.cdfWarning || (m.dei||0) >= LIMITS.deiWarning) {
          risk = 'HIGH'; riskColor = '#ffa500';
        } else if (m.thermalStress >= LIMITS.stressWarning || m.isBensonZone) {
          risk = 'MEDIUM'; riskColor = '#ffd700';
        }
        if (m.isOffline) { risk = '--'; riskColor = '#8b949e'; }
        weldRiskEl.innerText = risk;
        weldRiskEl.style.color = riskColor;
        weldRiskEl.style.fontWeight = '800';
      }

      // Expert directives
      updateDiagnosticDirectives(px, m);
      updateOperatorSignal(px, m);
    });


    // Alarms header
    const countEl = document.getElementById('header-alarms-count');
    const dotEl   = document.getElementById('header-alarm-dot');
    const hdrBox  = document.getElementById('header-alarm-box');
    if (countEl) countEl.innerText = activeAlarms.length;
    if (dotEl) {
      if (activeAlarms.length>0) { dotEl.classList.add('active'); if(hdrBox) hdrBox.style.background='rgba(248,81,73,0.15)'; }
      else                       { dotEl.classList.remove('active'); if(hdrBox) hdrBox.style.background='none'; }
    }

    updateTimelineTable();
  }

  function updateTimelineTable() {
    const tbody = document.getElementById('fs-logger-tbody');
    if (!tbody) return;
    if (shiftLogs.length===0) {
      tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:14px;color:#8b949e;">No deviation events logged this session.</td></tr>`;
      return;
    }
    tbody.innerHTML = shiftLogs.map(l=>{
      const event = lifecycleEvents.find(e => e.unit === l.unit && e.param === l.param);
      const durationMs = event ? ((event.status === 'ACTIVE' ? Date.now() : event.end) - event.start) : 0;
      const duration = durationMs > 0 ? `${Math.max(1, Math.round(durationMs / 60000))} min` : '--';
      const eventStateLabel = event ? `${event.status} · ${duration}` : 'LOGGED';
      return `<tr>
      <td style="font-family:var(--font-mono);">${l.timestamp}</td>
      <td style="font-weight:bold;color:#ffaa00;">${l.unit}</td>
      <td style="font-weight:bold;">${l.param}</td>
      <td><span class="fs-badge-severity ${l.severity}">${l.severity.toUpperCase()}</span></td>
      <td style="font-family:var(--font-mono);font-weight:700;">${l.val}</td>
      <td style="font-family:var(--font-mono);color:#8b949e;">${l.limit}</td>
      <td style="color:#c9d1d9;"><strong>${eventStateLabel}</strong><br>${l.desc}</td>
      <td style="color:#a5d6ff;font-weight:500;">${l.action}</td>
    </tr>`;}).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // 15. EXPORT / SHIFT REPORT
  // ═══════════════════════════════════════════════════════════════
  function exportTimelineToCSV() {
    if (shiftLogs.length===0) { alert('No deviations logged this session.'); return; }
    let csv = 'Timestamp,Unit,Parameter,Severity,Actual Value,Design Limit,Description,Action\n';
    shiftLogs.forEach(l => {
      csv += `"${l.timestamp}","${l.unit}","${l.param}","${l.severity.toUpperCase()}","${l.val}","${l.limit}","${l.desc.replace(/"/g,'""')}","${l.action.replace(/"/g,'""')}"\n`;
    });
    downloadFile(csv, `${PLANT_NAME.replace(/\s+/g,'_')}_Session_Log_${getDayKey(0)}.csv`, 'text/csv;charset=utf-8;');
  }

  function generateShiftReport() {
    const now    = new Date().toLocaleString('en-IN');
    const events = loadEventsForDay(0);
    const stats  = loadDailyStats(0);
    const divider= '═'.repeat(72);

    let r  = `${divider}\n`;
    r += `  NTPC ${PLANT_NAME} — BOILER EXPERT COCKPIT SHIFT REPORT\n`;
    r += `  Generated: ${now}\n`;
    r += `${divider}\n\n`;

    r += `DAILY SUMMARY — ${formatDate(0)}\n${'─'.repeat(50)}\n`;
    if (stats) {
      r += `  Peak WW TMT          : ${stats.peakTmt ? stats.peakTmt.toFixed(0) : '--'}°C\n`;
      r += `  Max WW Spread        : ${stats.maxSpread ? stats.maxSpread.toFixed(0) : '--'}°C\n`;
      r += `  Max Differential Thermal Index: ${stats.maxStress ? stats.maxStress.toFixed(0) : '--'}\n`;
      r += `  Max Load Ramp Rate   : ${stats.maxRampRate ? stats.maxRampRate.toFixed(1) : '--'} MW/min\n`;
      r += `  Peak Fatigue Risk    : ${stats.maxFatigueRisk ? stats.maxFatigueRisk.toFixed(0) : '--'}%\n`;
      r += `  Total Alarm Events   : ${stats.alarmCount || 0}\n`;
      r += `  Critical Events      : ${stats.criticalCount || 0}\n`;
      r += `  Thermal Cycles       : ${stats.cycleCount || 0}\n`;
    } else {
      r += '  No persistent statistics recorded yet today.\n';
    }

    const critEvents = events.filter(e=>e.severity==='critical');
    const warnEvents = events.filter(e=>e.severity==='warning');

    r += `\nCRITICAL EVENTS TODAY (${critEvents.length})\n${'─'.repeat(50)}\n`;
    if (!critEvents.length) r += '  None\n';
    else critEvents.forEach(e => r += `  [${e.timestamp}] ${e.unit} — ${e.param}: ${e.val} (Limit: ${e.limit})\n    → ${e.desc}\n    → ACTION: ${e.action}\n\n`);

    r += `\nWARNING EVENTS TODAY (${warnEvents.length})\n${'─'.repeat(50)}\n`;
    if (!warnEvents.length) r += '  None\n';
    else warnEvents.slice(0,20).forEach(e => r += `  [${e.timestamp}] ${e.unit} — ${e.param}: ${e.val} (Limit: ${e.limit})\n`);

    r += `\n7-DAY TREND SUMMARY\n${'─'.repeat(50)}\n`;
    r += `  ${'Date'.padEnd(14)} ${'Fatigue'.padEnd(10)} ${'Peak TMT'.padEnd(12)} ${'Max Spread'.padEnd(14)} Alarms\n`;
    for (let d=0; d<7; d++) {
      const ds    = loadDailyStats(d);
      const label = d===0?'Today':d===1?'Yesterday':`${formatDate(d)}`;
      r += `  ${label.padEnd(14)} ${(ds?ds.maxFatigueRisk.toFixed(0)+'%':'N/A').padEnd(10)} ${(ds?ds.peakTmt.toFixed(0)+'°C':'N/A').padEnd(12)} ${(ds?ds.maxSpread.toFixed(0)+'°C':'N/A').padEnd(14)} ${ds?ds.alarmCount:0}\n`;
    }

    r += `\n${divider}\n`;
    r += `  NTPC Boiler Expert Cockpit v2 · Chrome Extension · ${getDayKey(0)}\n`;
    r += `${divider}\n`;

    downloadFile(r, `${PLANT_NAME.replace(/\s+/g,'_')}_Shift_Report_${getDayKey(0)}.txt`, 'text/plain;charset=utf-8;');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ═══════════════════════════════════════════════════════════════
  // 16. COCKPIT ENGINE & INIT
  // ═══════════════════════════════════════════════════════════════
  let isFastPolling = false;
  function startCockpitEngine(fastPoll = false) {
    if (window.boilerCockpitInterval) clearInterval(window.boilerCockpitInterval);

    isFastPolling = fastPoll;
    let attempts = 0;

    const runDiagnosticCycle = () => {
      const cycleStarted = performance.now();
      try {
        const metrics = performDiagnostics();
        const acquisitionMs = performance.now() - cycleStarted;
        if (metrics) {
          // Check if we have successfully parsed at least some valid non-NaN telemetry data
          let hasValidData = false;
          for (const u of UNITS) {
            if (metrics[u] && (!isNaN(metrics[u].load) || !isNaN(metrics[u].maxTmt))) {
              hasValidData = true;
              break;
            }
          }

          if (hasValidData || attempts > 30) {
            // We got valid data (or reached timeout limit of 30 attempts, i.e., 6s at 200ms)
            evaluateAlarms(metrics);
            
            // Use requestAnimationFrame for smooth, browser-aligned DOM updates
            requestAnimationFrame(() => {
              const renderStarted = performance.now();
              updateUI(metrics);
              const renderMs = performance.now() - renderStarted;
              const totalMs = performance.now() - cycleStarted;
              performanceStats.push({ acquisitionMs, renderMs, totalMs, time: Date.now() });
              if (performanceStats.length > 360) performanceStats.shift();
              const totals = performanceStats.map(x => x.totalMs).sort((a, b) => a - b);
              const p95 = totals[Math.max(0, Math.ceil(totals.length * 0.95) - 1)] || totalMs;
              setEl('header-refresh-performance', `${totalMs.toFixed(0)} ms · p95 ${p95.toFixed(0)}`);
              window.boilerCockpitPerformance = { latest: performanceStats[performanceStats.length - 1], p95, samples: performanceStats.length };
            });

            if (isFastPolling) {
              isFastPolling = false;
              // Transition to normal 5-second polling interval
              startCockpitEngine(false);
            }
            return;
          }
        }
      } catch (err) {
        console.error('[BoilerCockpit] Diagnostic error:', err);
      }
      attempts++;
    };

    // Run first diagnostic cycle immediately
    runDiagnosticCycle();

    // Set interval based on mode
    const intervalTime = isFastPolling ? 200 : 5000;
    window.boilerCockpitInterval = setInterval(runDiagnosticCycle, intervalTime);
  }

  function init() {
    if (isHubPage()) {
      console.log('[BoilerCockpit] Hub page detected. Extension idle.');
      return;
    }
    if (!configurePlant()) {
      return;
    }
    purgeOldData();
    injectFullScreenOverlay();
    injectLaunchButton();
    startCockpitEngine(true); // Start in Fast-Polling Mode
    lastRouteSignature = getRouteSignature();
    if (dataCheckInterval) clearInterval(dataCheckInterval);
    dataCheckInterval = setInterval(() => {
      const signature = getRouteSignature();
      if (signature !== lastRouteSignature) {
        lastRouteSignature = signature;
        scheduleReinit(120);
      }
    }, 1000);
    console.log(`[BoilerCockpit v2] ${PLANT_NAME} initialized — Ramp Rate · Cycles · 7-Day History active.`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // SPA routing listeners (AngularJS hash + history API)
  if (!window.boilerCockpitListenersRegistered) {
    window.addEventListener('hashchange', () => { console.log('[BoilerCockpit] hashchange'); scheduleReinit(50); });
    window.addEventListener('popstate',   () => { console.log('[BoilerCockpit] popstate');   scheduleReinit(50); });
    window.boilerCockpitListenersRegistered = true;
  }

})();
