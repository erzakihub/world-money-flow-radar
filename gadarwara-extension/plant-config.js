(function () {
  'use strict';

  // Engineering-owned configuration. Populate crack-zone IDs only after the
  // physical wall/tube/fin location is confirmed from drawings and inspection.
  window.NTPCBoilerPlantConfig = {
    Gadarwara: {
      expectedWalls: { front: 21, left: 20, right: 21, rear: 20 },
      crackZones: { U1: [], U2: [] },
      approvedActionSet: 'GADARWARA_TANGENTIAL_V1'
    },
    'Barh Stage 1': {
      expectedWalls: { front: 6, left: 11, right: 11, rear: 6 },
      run3InnerTagFamilies: ['HAD53', 'HAD63'],
      excludedOuterTagFamilies: ['HAD54', 'HAD64'],
      crackZones: { U1: [], U2: [], U3: [] },
      approvedActionSet: 'BARH_STAGE1_J_FLAME_V1'
    },
    'Barh Stage 2': {
      expectedWalls: null,
      crackZones: { U4: [], U5: [] },
      approvedActionSet: 'BARH_STAGE2_TANGENTIAL_V1'
    }
  };
})();
