// presets.js
const Presets = (function() {
    'use strict';

    const PRESETS_STORAGE_KEY = 'id_meas_presets_v1';
    const LAST_STATE_STORAGE_KEY = 'id_meas_last_state';

    // Default presets (min / med / max)
    const defaultPresets = {
        min: {
            add_mm: false, scale: '1:1', line_len: 5, precis: 0, line_stroke: 0.1, gap: 0.5, line_indent: 0.5, arrow_width: 2,
            font_name: 'default', font_size: 8, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false
        },
        med: {
            add_mm: false, scale: '1:1', line_len: 10, precis: 2, line_stroke: 0.2, gap: 1, line_indent: 1, arrow_width: 3.5,
            font_name: 'default', font_size: 14, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false
        },
        max: {
            add_mm: false, scale: '1:1', line_len: 20, precis: 3, line_stroke: 0.5, gap: 2, line_indent: 2, arrow_width: 5,
            font_name: 'default', font_size: 24, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false
        }
    };

    let currentPresets = {};
    
    // Default fallback state (the values hardcoded in index.html)
    const defaultGlobalState = {
        add_mm: false, scale: '1:1', unit_select: 'mm', line_len: 10, precis: 2, line_stroke: 0.2, gap: 0.5, line_indent: 1.0, arrow_width: 3.5,
        font_name: 'default', font_size: 14, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false
    };

    function init() {
        const saved = Storage.get(PRESETS_STORAGE_KEY);
        if (saved) {
            currentPresets = saved;
        } else {
            currentPresets = JSON.parse(JSON.stringify(defaultPresets));
            Storage.set(PRESETS_STORAGE_KEY, currentPresets);
        }
        bindEvents();
    }

    function collectCurrentSettings() {
        return {
            add_mm: document.getElementById('add_mm').checked,
            scale: document.getElementById('scale_ratio') ? document.getElementById('scale_ratio').value : '1:1',
            unit_select: document.getElementById('unit_select') ? document.getElementById('unit_select').value : 'mm',
            line_len: document.getElementById('line_len').value,
            precis: document.getElementById('precis').value,
            line_stroke: document.getElementById('line_stroke').value,
            gap: document.getElementById('gap').value,
            line_indent: document.getElementById('line_indent').value,
            arrow_width: document.getElementById('arrow_width').value,
            font_name: (typeof FontPicker !== 'undefined') ? FontPicker.getSelectedFontName() : 'default',
            font_size: document.getElementById('font_size').value,
            cyan: document.getElementById('cyan').value,
            magenta: document.getElementById('magenta').value,
            yellow: document.getElementById('yellow').value,
            black: document.getElementById('black').value,
            add_layer: document.getElementById('add_layer').checked,
            layer_name_text: document.getElementById('layer_name_text').value,
            out_artboard: document.getElementById('out_artboard') ? document.getElementById('out_artboard').checked : false
        };
    }

    function applySettings(p) {
        if (!p) return;
        document.getElementById('add_mm').checked = !!p.add_mm;
        if (document.getElementById('scale_ratio') && p.scale !== undefined) document.getElementById('scale_ratio').value = p.scale;
        if (document.getElementById('unit_select') && p.unit_select !== undefined) document.getElementById('unit_select').value = p.unit_select;
        document.getElementById('line_len').value = p.line_len !== undefined ? p.line_len : 10;
        document.getElementById('precis').value = p.precis !== undefined ? p.precis : 2;
        document.getElementById('line_stroke').value = p.line_stroke !== undefined ? p.line_stroke : 0.2;
        document.getElementById('gap').value = p.gap !== undefined ? p.gap : 0.5;
        document.getElementById('line_indent').value = p.line_indent !== undefined ? p.line_indent : 1.0;
        document.getElementById('arrow_width').value = p.arrow_width !== undefined ? p.arrow_width : 3.5;
        if (typeof FontPicker !== 'undefined' && p.font_name !== undefined) {
            FontPicker.setFontByName(p.font_name);
        }
        document.getElementById('font_size').value = p.font_size !== undefined ? p.font_size : 14;
        document.getElementById('cyan').value = p.cyan !== undefined ? p.cyan : 0;
        document.getElementById('magenta').value = p.magenta !== undefined ? p.magenta : 0;
        document.getElementById('yellow').value = p.yellow !== undefined ? p.yellow : 0;
        document.getElementById('black').value = p.black !== undefined ? p.black : 100;
        document.getElementById('add_layer').checked = !!p.add_layer;
        if (p.layer_name_text !== undefined) document.getElementById('layer_name_text').value = p.layer_name_text;
        
        const outArtboard = document.getElementById('out_artboard');
        if (outArtboard && p.out_artboard !== undefined) outArtboard.checked = !!p.out_artboard;
    }

    function updateActiveHighlight(type) {
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active-preset'));
        if (type) {
            const btn = document.getElementById(`btn_preset_${type}`);
            if (btn) btn.classList.add('active-preset');
        }
    }

    function clearActiveHighlight() {
        updateActiveHighlight(null);
    }

    function handlePresetClick(type) {
        const isSaveMode = document.getElementById('chk_save').checked;

        if (isSaveMode) {
            const currentSettings = collectCurrentSettings();
            currentPresets[type] = currentSettings;
            Storage.set(PRESETS_STORAGE_KEY, currentPresets);
            saveLastUsed();
            updateActiveHighlight(type);
        } else {
            const presetData = currentPresets[type];
            if (presetData) {
                applySettings(presetData);
                Colors.updateColorPreview();
                saveLastUsed();
                updateActiveHighlight(type);
                Measurements.reRunMeasurement();
            }
        }
    }

    function restoreDefaults() {
        currentPresets = JSON.parse(JSON.stringify(defaultPresets));
        Storage.set(PRESETS_STORAGE_KEY, currentPresets);
        applySettings(defaultGlobalState);
        Colors.restoreDefaultSwatches();
        saveLastUsed();
        clearActiveHighlight();
        Measurements.reRunMeasurement();
    }

    function saveLastUsed() {
        const current = collectCurrentSettings();
        Storage.set(LAST_STATE_STORAGE_KEY, current);
    }

    function loadLastUsed() {
        const last = Storage.get(LAST_STATE_STORAGE_KEY);
        if (last) {
            applySettings(last);
        } else {
            applySettings(defaultGlobalState);
        }
        Colors.updateColorPreview();
    }

    function bindEvents() {
        document.getElementById('btn_preset_min').addEventListener('click', () => handlePresetClick('min'));
        document.getElementById('btn_preset_med').addEventListener('click', () => handlePresetClick('med'));
        document.getElementById('btn_preset_max').addEventListener('click', () => handlePresetClick('max'));

        const btnDefault = document.getElementById('btn_default');
        if (btnDefault) {
            btnDefault.addEventListener('click', restoreDefaults);
        }
    }

    return {
        init,
        saveLastUsed,
        loadLastUsed,
        clearActiveHighlight
    };
})();
