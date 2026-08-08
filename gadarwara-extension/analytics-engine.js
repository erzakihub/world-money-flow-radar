(function () {
  'use strict';

  const sensorState = new Map();
  const unitSeries = new Map();
  const eventState = new Map();

  const CONFIG = {
    Gadarwara: {
      expectedWalls: { front: 21, left: 20, right: 21, rear: 20 },
      crackZones: { U1: [], U2: [] },
      model: 'TANGENTIAL'
    },
    'Barh Stage 1': {
      expectedWalls: { front: 6, left: 11, right: 11, rear: 6 },
      crackZones: { U1: [], U2: [], U3: [] },
      model: 'SIDE_FIRED_J_FLAME'
    },
    'Barh Stage 2': {
      expectedWalls: null,
      crackZones: { U4: [], U5: [] },
      model: 'TANGENTIAL'
    }
  };
  const externalConfig = window.NTPCBoilerPlantConfig || {};
  Object.keys(externalConfig).forEach(plant => {
    CONFIG[plant] = Object.assign({}, CONFIG[plant] || {}, externalConfig[plant]);
  });

  function median(values) {
    const v = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!v.length) return NaN;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  }

  function trackSensor(key, value, now, options) {
    const opts = Object.assign({ min: 200, max: 650, spike: 60, staleMs: 15 * 60 * 1000 }, options || {});
    const previous = sensorState.get(key);
    const state = previous || { value, firstSeen: now, lastChanged: now, lastSeen: now, samples: [] };
    const changed = !Number.isFinite(state.value) || Math.abs(value - state.value) >= 0.05;
    const spike = Number.isFinite(state.value) && Math.abs(value - state.value) > opts.spike;
    if (changed) state.lastChanged = now;
    state.value = value;
    state.lastSeen = now;
    state.samples.push({ time: now, value });
    if (state.samples.length > 360) state.samples.shift();
    sensorState.set(key, state);

    const outOfRange = !Number.isFinite(value) || value < opts.min || value > opts.max;
    const stale = now - state.lastChanged > opts.staleMs;
    return { ok: !outOfRange && !spike && !stale, outOfRange, spike, stale, unchangedMs: now - state.lastChanged };
  }

  function validateTubes(unit, tubes, now, options) {
    const offline = !!(options && options.offline);
    const valid = { left: [], right: [], front: [], rear: [] };
    const suspect = [];
    Object.keys(valid).forEach(wall => {
      const list = [...(tubes[wall] || [])];
      const wallMedian = median(list.map(t => t.val));
      list.forEach((tube, index) => {
        const key = `${unit}:${wall}:${tube.tube}:${tube.tag || ''}`;
        const tracked = trackSensor(key, tube.val, now, { min: offline ? 0 : 250, max: 650, spike: 60 });
        const neighbours = [list[index - 1], list[index + 1]].filter(Boolean).map(t => t.val);
        const neighbourMedian = median(neighbours);
        const isolated = Number.isFinite(neighbourMedian) && Math.abs(tube.val - neighbourMedian) > 55 && Math.abs(tube.val - wallMedian) > 45;
        tube.sensorHealth = Object.assign({}, tracked, { isolated });
        if (tracked.ok && !isolated) valid[wall].push(tube);
        else suspect.push({ wall, tube: tube.tube, tag: tube.tag, value: tube.val, reasons: Object.keys(tube.sensorHealth).filter(k => tube.sensorHealth[k] === true && k !== 'ok') });
      });
    });
    return { valid, suspect, validCount: Object.values(valid).reduce((s, a) => s + a.length, 0) };
  }

  function getSeries(unit) {
    if (!unitSeries.has(unit)) unitSeries.set(unit, []);
    return unitSeries.get(unit);
  }

  function turningPoints(values) {
    if (values.length < 3) return values.slice();
    const out = [values[0]];
    for (let i = 1; i < values.length - 1; i++) {
      const a = values[i] - values[i - 1];
      const b = values[i + 1] - values[i];
      if (a === 0 || b === 0 || Math.sign(a) !== Math.sign(b)) out.push(values[i]);
    }
    out.push(values[values.length - 1]);
    return out;
  }

  function rainflowRanges(values) {
    const points = turningPoints(values);
    const stack = [];
    const ranges = [];
    points.forEach(point => {
      stack.push(point);
      while (stack.length >= 3) {
        const n = stack.length;
        const older = Math.abs(stack[n - 2] - stack[n - 3]);
        const newer = Math.abs(stack[n - 1] - stack[n - 2]);
        if (newer < older) break;
        ranges.push({ range: older, count: stack.length === 3 ? 0.5 : 1 });
        stack.splice(n - 3, 2);
      }
    });
    for (let i = 0; i < stack.length - 1; i++) ranges.push({ range: Math.abs(stack[i + 1] - stack[i]), count: 0.5 });
    return ranges.filter(r => r.range > 0.2);
  }

  function updateSeries(unit, metrics, now) {
    const series = getSeries(unit);
    series.push({ time: now, mean: metrics.meanWW, spread: metrics.totalWWSpread, load: metrics.load, max: metrics.maxTmt });
    const cutoff = now - 24 * 60 * 60 * 1000;
    while (series.length && series[0].time < cutoff) series.shift();
    const ranges = rainflowRanges(series.map(x => x.mean).filter(Number.isFinite));
    const equivalentCycles = ranges.reduce((sum, r) => sum + r.count, 0);
    const damagingCycles = ranges.filter(r => r.range >= 15).reduce((sum, r) => sum + r.count, 0);
    const maxRange = ranges.reduce((m, r) => Math.max(m, r.range), 0);
    return { equivalentCycles, damagingCycles, maxRange, sampleCount: series.length };
  }

  function range(values) {
    const v = values.filter(Number.isFinite);
    return v.length ? Math.max(...v) - Math.min(...v) : NaN;
  }

  function rankCauses(metrics, signals, model) {
    const candidates = [];
    const add = (id, label, score, evidence, checks, contradictions) => {
      const bounded = Math.max(0, Math.min(100, Math.round(score)));
      candidates.push({ id, label, confidence: bounded, evidence: evidence.filter(Boolean), checks, contradictions: (contradictions || []).filter(Boolean) });
    };
    const wallBias = Math.max(metrics.lrSpread || 0, metrics.frSpread || 0);
    const hfgDiff = Math.abs((signals.hfgLhs || 0) - (signals.hfgRhs || 0));
    const damperValues = Object.values(signals.dampers || {}).filter(Number.isFinite);
    const damperRange = range(damperValues);
    const millValues = Object.values(signals.mills || {}).filter(Number.isFinite);
    const millRange = range(millValues);
    const sensorCount = (metrics.sensorHealth && metrics.sensorHealth.suspect || []).length;

    add('sensor', 'Sensor or mapping anomaly', sensorCount ? 80 : 5,
      sensorCount ? [`${sensorCount} MTM point(s) suspect`] : [],
      ['Verify PI quality, timestamp, physical tube mapping and adjacent instruments']);
    add('load_ramp', 'Load-ramp thermal response', Math.abs(metrics.rampRate || 0) * 10 + Math.abs(metrics.maxRateOfRise || 0) * 12,
      [Math.abs(metrics.rampRate || 0) >= 3 && `5-min ramp ${Math.abs(metrics.rampRate).toFixed(1)} MW/min`, Math.abs(metrics.maxRateOfRise || 0) >= 1.5 && `2-min WW RoC ${Math.abs(metrics.maxRateOfRise).toFixed(2)} C/min`],
      ['Hold further ramp and verify WW stabilization before resuming']);
    add('air', 'Air/OFA distribution imbalance', wallBias * 0.8 + (Number.isFinite(damperRange) ? damperRange * 1.8 : 0) + hfgDiff * 0.4,
      [wallBias >= 20 && `wall-average bias ${wallBias.toFixed(0)} C`, Number.isFinite(damperRange) && damperRange >= 10 && `SOFA/CCOFA range ${damperRange.toFixed(1)}%`, hfgDiff >= 30 && `HFG L/R difference ${hfgDiff.toFixed(0)} C`],
      ['Verify actual damper feedback, O2 grid and gas-temperature bias before correction'],
      [!damperValues.length && 'OFA/SADC feedback unavailable']);
    add('mill', model === 'SIDE_FIRED_J_FLAME' ? 'Same-mill elevation / burner-bank imbalance' : 'Mill or feeder heat-release imbalance', wallBias * 0.9 + (Number.isFinite(millRange) ? millRange * 2 : 0),
      [wallBias >= 20 && `wall-average bias ${wallBias.toFixed(0)} C`, Number.isFinite(millRange) && millRange >= 5 && `mill/feeder range ${millRange.toFixed(1)}`],
      [model === 'SIDE_FIRED_J_FLAME' ? 'Check paired left/right burner-bank and four-burner elevation group' : 'Check feeder/mill balance and response timing'],
      [!millValues.length && 'mill/feeder data unavailable']);
    add('flame', model === 'SIDE_FIRED_J_FLAME' ? 'J-flame wall washing / local impingement' : 'Tangential combustion displacement', wallBias + Math.max(0, metrics.maxAdjDelta || 0) * 0.8 + hfgDiff * 0.3,
      [metrics.maxAdjDelta >= 30 && `adjacent delta ${metrics.maxAdjDelta.toFixed(0)} C`, wallBias >= 20 && `wall bias ${wallBias.toFixed(0)} C`, hfgDiff >= 30 && `HFG bias ${hfgDiff.toFixed(0)} C`],
      [model === 'SIDE_FIRED_J_FLAME' ? 'Check flame scanner/CCTV, burner bank and local slagging' : 'Check O2 grid, OFA/SADC and mill/corner evidence']);

    candidates.sort((a, b) => b.confidence - a.confidence);
    return { primary: candidates[0], alternatives: candidates.slice(1, 3), all: candidates, hfgDiff, damperRange, millRange };
  }

  function crackZoneMetrics(unit, tubes, plant) {
    const zone = (CONFIG[plant] && CONFIG[plant].crackZones[unit]) || [];
    if (!zone.length) return { configured: false, points: [], max: NaN, spread: NaN };
    const lookup = new Map(Object.entries(tubes).flatMap(([wall, list]) => list.map(t => [`${wall}:${t.tube}`, t])));
    const points = zone.map(id => lookup.get(id)).filter(Boolean);
    const values = points.map(p => p.val);
    return { configured: true, points, max: values.length ? Math.max(...values) : NaN, spread: range(values) };
  }

  function updateEvents(unit, alarms, now) {
    const activeKeys = new Set();
    alarms.forEach(alarm => {
      const key = `${unit}:${alarm.param}`;
      activeKeys.add(key);
      const existing = eventState.get(key);
      if (!existing) eventState.set(key, { key, unit, param: alarm.param, severity: alarm.severity, start: now, last: now, peak: alarm.val, status: 'ACTIVE', recurrences: 0 });
      else { existing.last = now; existing.severity = alarm.severity; existing.status = 'ACTIVE'; existing.peak = alarm.val; }
    });
    for (const [key, event] of eventState) {
      if (event.unit === unit && event.status === 'ACTIVE' && !activeKeys.has(key)) {
        event.status = 'CLOSED'; event.end = now; event.durationMs = now - event.start;
      }
    }
    return [...eventState.values()].filter(e => e.unit === unit).sort((a, b) => b.last - a.last);
  }

  window.NTPCBoilerAnalytics = {
    CONFIG,
    validateTubes,
    updateSeries,
    rankCauses,
    crackZoneMetrics,
    updateEvents,
    diagnostics: () => ({ sensorCount: sensorState.size, unitSeries: [...unitSeries.entries()].map(([u, s]) => [u, s.length]), events: eventState.size })
  };
})();
