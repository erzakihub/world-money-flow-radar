(function (PV) {
    'use strict';

    function symbolVis() { }
    PV.deriveVisualizationFromBase(symbolVis);

    symbolVis.prototype.init = function (scope, elem) {
        scope.fatigueRisk = 0;
        scope.stressMPa = 0;
        scope.maxRoc = 0;
        
        scope.wallAves = { left: 0, right: 0, front: 0, rear: 0 };
        scope.fireball = { x: 50, y: 50 };
        scope.alerts = [];
        
        // Listen for live data updates from PI Vision Core Engine
        scope.$on('dataUpdate', function (event, data) {
            if (!data || !data.Rows || data.Rows.length === 0) return;
            
            // Map incoming datasource array elements to variables
            // Datasources are ordered exactly as configured by the user in the display
            data.Rows.forEach(function (row, idx) {
                var val = parseFloat(row.Value);
                if (isNaN(val)) return;
                
                // Assuming data order: 
                // 0: Fatigue_Risk, 1: Stress_MPa, 2: Avg_Left, 3: Avg_Right, 4: Avg_Front, 5: Avg_Rear, 6: Max_Roc
                if (idx === 0) scope.fatigueRisk = Math.round(val);
                else if (idx === 1) scope.stressMPa = Math.round(val);
                else if (idx === 2) scope.wallAves.left = val;
                else if (idx === 3) scope.wallAves.right = val;
                else if (idx === 4) scope.wallAves.front = val;
                else if (idx === 5) scope.wallAves.rear = val;
                else if (idx === 6) scope.maxRoc = val;
            });

            // Calculate Fireball displacement
            var diffX = scope.wallAves.right - scope.wallAves.left;
            var diffY = scope.wallAves.rear - scope.wallAves.front;
            
            // 1°C difference corresponds to 0.45% shift (capped at max +/- 25% displacement)
            scope.fireball.x = Math.max(25, Math.min(75, 50 + diffX * 0.45));
            scope.fireball.y = Math.max(25, Math.min(75, 50 + diffY * 0.45));

            // Generate Alerts List
            scope.alerts = [];
            if (scope.fatigueRisk >= 75) {
                scope.alerts.push({ type: 'critical', title: 'Critical Fatigue Risk', desc: 'Weld stress or TMT is exceeding safety bounds.' });
            } else if (scope.fatigueRisk >= 40) {
                scope.alerts.push({ type: 'warning', title: 'Elevated Fatigue Risk', desc: 'Temperatures and thermal stress are rising.' });
            }
        });
    };

    var definition = {
        typeName: 'gadarwaraFatigue',
        displayName: 'Gadarwara Fatigue Monitor',
        datasourceBehavior: PV.ComponentDatasourceBehavior.Multiple,
        visObjectType: symbolVis,
        getDefaultConfig: function () {
            return {
                height: 500,
                width: 380
            };
        }
    };

    PV.symbolCatalog.register(definition);
})(window.PIVisualization);
