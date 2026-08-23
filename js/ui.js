// ui.js
const UI = (function() {
    'use strict';

    function bindMeasurementButtons() {
        const measMap = {
            'btn_top': { type: 'linear', side: 'top' },
            'btn_bott': { type: 'linear', side: 'bott' },
            'btn_left': { type: 'linear', side: 'left' },
            'btn_right': { type: 'linear', side: 'right' },
            'btn_diam': { type: 'diam', side: 'tr' },
            'btn_diam_br': { type: 'diam', side: 'br' },
            'btn_rad': { type: 'rad', side: 'tr' },
            'btn_rad_br': { type: 'rad', side: 'br' },
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

    function bindClearButton() {
        const btnClear = document.getElementById('btn_clear');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                Measurements.deleteAllMeasurements();
            });
        }
    }

    function init() {
        bindMeasurementButtons();
        bindSaveStateOnInput();
        bindClearButton();
    }

    return {
        init
    };
})();
