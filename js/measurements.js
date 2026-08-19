// measurements.js
const Measurements = (function() {
    'use strict';
    const csInterface = new CSInterface();
    const PT_TO_MM = 2.834645668;

    let currentMeasNames = [];
    let lastParams = null;

    function evalScriptPromise(script) {
        return new Promise(resolve => {
            csInterface.evalScript(script, result => resolve(result));
        });
    }

    async function clearOldMeasurements() {
        if (!currentMeasNames || currentMeasNames.length === 0) return;
        for (let i = 0; i < currentMeasNames.length; i++) {
            await evalScriptPromise(`delMeasByName('${currentMeasNames[i]}')`);
        }
        currentMeasNames = [];
    }

    async function runMeasurement(params, isReRun) {
        lastParams = params;
        
        const strkW = parseFloat(document.getElementById('line_stroke').value) || 0.2;
        const gap = parseFloat(document.getElementById('gap').value) || 0.5;
        const indent = parseFloat(document.getElementById('line_indent').value) || 1.0;
        const len = parseFloat(document.getElementById('line_len').value) || 10;
        const arW = parseFloat(document.getElementById('arrow_width').value) || 3.5;
        const fontSize = parseFloat(document.getElementById('font_size').value) || 14;
        
        let precisVal = document.getElementById('precis').value;
        let precis = parseInt(precisVal, 10);
        if (isNaN(precis)) precis = 0;

        const c = isNaN(parseFloat(document.getElementById('cyan').value)) ? 0 : parseFloat(document.getElementById('cyan').value);
        const m = isNaN(parseFloat(document.getElementById('magenta').value)) ? 0 : parseFloat(document.getElementById('magenta').value);
        const y = isNaN(parseFloat(document.getElementById('yellow').value)) ? 0 : parseFloat(document.getElementById('yellow').value);
        const k = isNaN(parseFloat(document.getElementById('black').value)) ? 0 : parseFloat(document.getElementById('black').value);

        const addUnit = document.getElementById('add_mm').checked;
        const addLay = document.getElementById('add_layer').checked;
        const layName = document.getElementById('layer_name_text').value || 'layout';
        const outArtboardEl = document.getElementById('out_artboard');
        const outArtboard = outArtboardEl ? outArtboardEl.checked : false;

        const opts = {
            measType: params.type,
            side: params.side || '',
            ctrl: params.ctrl || false,
            strkW: strkW * PT_TO_MM,
            gap: gap * PT_TO_MM,
            stopBot: indent * PT_TO_MM,
            stopTop: len * PT_TO_MM,
            arW: arW * PT_TO_MM,
            fontSize: fontSize,
            precis: precis,
            colComp: [c, m, y, k],
            units: addUnit ? (document.getElementById('unit_select') ? document.getElementById('unit_select').value : 'mm') : '',
            unitType: document.getElementById('unit_select') ? document.getElementById('unit_select').value : 'mm',
            addLay: addLay,
            layName: layName,
            fontNum: 0,
            outArtboard: outArtboard
        };

        // Only clear previous measurement if this is a live setting tweak (isReRun === true)
        if (isReRun) {
            await clearOldMeasurements();
        } else {
            currentMeasNames = [];
        }

        const script = `measAllSelect(${JSON.stringify(opts)})`;
        const result = await evalScriptPromise(script);

        if (result && result !== "undefined" && result !== "" && result !== "null") {
            try {
                currentMeasNames = JSON.parse(result);
            } catch(e) {
                console.error("Error parsing measurement names", e);
            }
        }
    }

    function reRunMeasurement() {
        if (lastParams && currentMeasNames && currentMeasNames.length > 0) {
            runMeasurement(lastParams, true);
        }
    }

    return {
        runMeasurement: (p) => runMeasurement(p, false),
        reRunMeasurement
    };
})();
