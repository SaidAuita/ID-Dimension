// ui.js
const UI = (function() {
    'use strict';

    function bindMeasurementButtons() {
        const measMap = {
            'btn_top': { type: 'linear', side: 'top' },
            'btn_bott': { type: 'linear', side: 'bott' },
            'btn_left': { type: 'linear', side: 'left' },
            'btn_right': { type: 'linear', side: 'right' },
            'btn_diam': { type: 'diam', side: '' },
            'btn_rad': { type: 'rad', side: '' },
            'btn_cent': { type: 'cent', side: '' }
        };

        for (const [id, params] of Object.entries(measMap)) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    Measurements.runMeasurement({
                        type: params.type,
                        side: params.side,
                        ctrl: e.ctrlKey || e.metaKey // metaKey for Mac support
                    });
                });
            }
        }
    }

    function bindSaveStateOnInput() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                Presets.saveLastUsed();
                if (e.target.id !== 'chk_save') {
                    Presets.clearActiveHighlight();
                    Measurements.reRunMeasurement();
                }
            });
        });
    }

    function init() {
        bindMeasurementButtons();
        bindSaveStateOnInput();
    }

    return {
        init
    };
})();
