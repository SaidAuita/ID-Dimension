// colors.js
const Colors = (function() {
    'use strict';

    const SWATCH_STORAGE_KEY = 'id_meas_color_swatches';

    // Default 6 swatches (White, Black, Red, Yellow, Green, Blue)
    const defaultSwatches = [
        { c: 0, m: 0, y: 0, k: 0 },
        { c: 0, m: 0, y: 0, k: 100 },
        { c: 0, m: 100, y: 100, k: 0 },
        { c: 0, m: 0, y: 100, k: 0 },
        { c: 100, m: 0, y: 100, k: 0 },
        { c: 100, m: 100, y: 0, k: 0 }
    ];

    let swatches = [];

    function init() {
        const stored = Storage.get(SWATCH_STORAGE_KEY);
        if (stored && stored.length === 6) {
            swatches = stored;
        } else {
            swatches = JSON.parse(JSON.stringify(defaultSwatches));
            Storage.set(SWATCH_STORAGE_KEY, swatches);
        }

        renderSwatches();
        bindEvents();
    }

    function cmykToCss(c, m, y, k) {
        var C = Math.min(100, Math.max(0, c)) / 100;
        var M = Math.min(100, Math.max(0, m)) / 100;
        var Y = Math.min(100, Math.max(0, y)) / 100;
        var K = Math.min(100, Math.max(0, k)) / 100;

        // Realistic CMYK ink subtractive mixing simulation (ISO Coated / SWOP gamut approximation)
        var r = (1 - C) * (1 - 0.18 * M) * (1 - K);
        var g = (1 - M) * (1 - 0.28 * C) * (1 - 0.08 * Y) * (1 - K);
        var b = (1 - Y) * (1 - 0.35 * M) * (1 - 0.18 * C) * (1 - K);

        var R = Math.round(Math.min(255, Math.max(0, r * 255)));
        var G = Math.round(Math.min(255, Math.max(0, g * 255)));
        var B = Math.round(Math.min(255, Math.max(0, b * 255)));

        return `rgb(${R}, ${G}, ${B})`;
    }

    function renderSwatches() {
        for (let i = 0; i < 6; i++) {
            const swatchEl = document.getElementById(`swatch_${i}`);
            if (swatchEl) {
                const s = swatches[i];
                swatchEl.style.backgroundColor = cmykToCss(s.c, s.m, s.y, s.k);
            }
        }
    }

    function updateCurrentColorPreview() {
        const previewEl = document.getElementById('current_color_preview');
        if (previewEl) {
            const current = getCurrentCMYK();
            previewEl.style.backgroundColor = cmykToCss(current.c, current.m, current.y, current.k);
        }
    }

    function getCurrentCMYK() {
        return {
            c: parseFloat(document.getElementById('cyan').value) || 0,
            m: parseFloat(document.getElementById('magenta').value) || 0,
            y: parseFloat(document.getElementById('yellow').value) || 0,
            k: parseFloat(document.getElementById('black').value) || 0
        };
    }

    function applyCMYK(s) {
        document.getElementById('cyan').value = s.c;
        document.getElementById('magenta').value = s.m;
        document.getElementById('yellow').value = s.y;
        document.getElementById('black').value = s.k;
        
        document.getElementById('cyan').dispatchEvent(new Event('change'));
    }

    function bindEvents() {
        const swatchElements = document.querySelectorAll('.color-swatch');
        swatchElements.forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.getAttribute('data-index'), 10);
                const isSaveMode = document.getElementById('chk_save').checked;

                if (isSaveMode) {
                    swatches[index] = getCurrentCMYK();
                    Storage.set(SWATCH_STORAGE_KEY, swatches);
                    renderSwatches();
                } else {
                    applyCMYK(swatches[index]);
                }
            });
        });

        const cmykInputs = document.querySelectorAll('.cmyk-input');
        cmykInputs.forEach(input => {
            input.addEventListener('input', updateCurrentColorPreview);
            input.addEventListener('change', updateCurrentColorPreview);
        });

        updateCurrentColorPreview();
    }

    function resetColors() {
        swatches = JSON.parse(JSON.stringify(defaultSwatches));
        Storage.set(SWATCH_STORAGE_KEY, swatches);
        renderSwatches();
    }

    return {
        init,
        resetColors
    };
})();
