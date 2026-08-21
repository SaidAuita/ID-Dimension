/**
 * ID Dimension v1.2 - Standalone ScriptUI Palette for Adobe InDesign
 * 
 * Install (Windows): %APPDATA%\Adobe\InDesign\Version <XX.X>\<Locale>\Scripts\Scripts Panel\
 * Install (macOS): ~/Library/Preferences/Adobe InDesign/Version <XX.X>/<Locale>/Scripts/Scripts Panel/
 */
#targetengine "id_dimension_engine"

(function () {
    'use strict';

    // Safe Window Singleton: Close existing palette before opening a new one
    if ($.global.idDimensionPalette && ($.global.idDimensionPalette instanceof Window)) {
        try {
            $.global.idDimensionPalette.close();
        } catch (eWin) {}
        $.global.idDimensionPalette = null;
    }

    try {

    // --- Preferences File Path ---
    var PREFS_FILE = null;
    try {
        PREFS_FILE = new File(Folder.userData + "/id_dimension_prefs.json");
    } catch (eF) {
        PREFS_FILE = null;
    }

    var DEFAULT_PRESETS = {
        min: {
            add_mm: false, unit_select: 0, line_len: 5, precis: 0, line_stroke: 0.1, gap: 0.5, line_indent: 0.5, arrow_width: 2,
            font_size: 8, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
        },
        med: {
            add_mm: false, unit_select: 0, line_len: 10, precis: 2, line_stroke: 0.2, gap: 1, line_indent: 1, arrow_width: 3.5,
            font_size: 14, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
        },
        max: {
            add_mm: false, unit_select: 0, line_len: 20, precis: 3, line_stroke: 0.5, gap: 2, line_indent: 2, arrow_width: 5,
            font_size: 24, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
        }
    };

    var DEFAULT_SWATCHES = [
        { c: 0, m: 0, y: 0, k: 0 },
        { c: 0, m: 0, y: 0, k: 100 },
        { c: 0, m: 100, y: 100, k: 0 },
        { c: 0, m: 0, y: 100, k: 0 },
        { c: 100, m: 0, y: 100, k: 0 },
        { c: 100, m: 100, y: 0, k: 0 }
    ];

    var UNITS_LIST = ['mm', 'cm', 'in', 'pt', 'px'];

    function parseScale(val) {
        if (typeof val === 'number') return (val > 0) ? val : 1;
        if (!val || typeof val !== 'string') return 1;
        val = val.replace(/\s+/g, '');
        if (val.indexOf(':') !== -1) {
            var parts = val.split(':');
            var left = parseFloat(parts[0]);
            var right = parseFloat(parts[1]);
            if (!isNaN(left) && !isNaN(right) && left > 0 && right > 0) {
                return right / left;
            }
        }
        var num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            return num;
        }
        return 1;
    }

    // --- JSON parser/stringifier for ExtendScript ES3 ---
    function stringifyJSON(obj) {
        var t = typeof obj;
        if (t !== "object" || obj === null) {
            if (t === "string") return '"' + obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
            return String(obj);
        }
        var json = [], isArr = (obj && obj.constructor === Array);
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                var v = obj[k];
                var vt = typeof v;
                if (vt === "string") v = '"' + v.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
                else if (vt === "object" && v !== null) v = stringifyJSON(v);
                json.push((isArr ? "" : '"' + k + '":') + String(v));
            }
        }
        return (isArr ? "[" : "{") + String(json) + (isArr ? "]" : "}");
    }

    function parseJSON(str) {
        if (!str || typeof str !== "string") return null;
        try {
            return eval("(" + str + ")");
        } catch (e) {
            return null;
        }
    }

    function loadPrefs() {
        if (PREFS_FILE && PREFS_FILE.exists) {
            try {
                if (PREFS_FILE.open('r')) {
                    var content = PREFS_FILE.read();
                    PREFS_FILE.close();
                    var data = parseJSON(content);
                    if (data && typeof data === "object") return data;
                }
            } catch (e) {
                try { PREFS_FILE.close(); } catch (e2) {}
            }
        }
        return {
            presets: DEFAULT_PRESETS,
            swatches: DEFAULT_SWATCHES,
            lastState: DEFAULT_PRESETS.med
        };
    }

    function savePrefs(data) {
        if (!PREFS_FILE) return;
        try {
            if (PREFS_FILE.open('w')) {
                PREFS_FILE.write(stringifyJSON(data));
                PREFS_FILE.close();
            }
        } catch (e) {
            try { PREFS_FILE.close(); } catch (e2) {}
        }
    }

    var appData = loadPrefs();

    // --- Core Measurement Engine for InDesign ---
    var Engine = {
        makeRandStr: function (len) {
            return ('1' + (new Date().getTime()) + Math.floor(Math.random() * 10000)).slice(0, len);
        },

        getOrCreateCmykColor: function (doc, comp) {
            if (!comp || comp.length < 4) return doc.swatches.itemByName("Black");
            var c = isNaN(Number(comp[0])) ? 0 : Number(comp[0]);
            var m = isNaN(Number(comp[1])) ? 0 : Number(comp[1]);
            var y = isNaN(Number(comp[2])) ? 0 : Number(comp[2]);
            var k = isNaN(Number(comp[3])) ? 0 : Number(comp[3]);
            
            c = Math.max(0, Math.min(100, Math.round(c * 10) / 10));
            m = Math.max(0, Math.min(100, Math.round(m * 10) / 10));
            y = Math.max(0, Math.min(100, Math.round(y * 10) / 10));
            k = Math.max(0, Math.min(100, Math.round(k * 10) / 10));

            if (c === 0 && m === 0 && y === 0 && k === 100) {
                return doc.swatches.itemByName("Black");
            }
            if (c === 0 && m === 0 && y === 0 && k === 0) {
                return doc.swatches.itemByName("Paper");
            }

            var colorName = "C=" + c + " M=" + m + " Y=" + y + " K=" + k;
            
            try {
                var existing = doc.colors.itemByName(colorName);
                if (existing.isValid) {
                    return existing;
                }
            } catch (e1) {}

            try {
                var newCol = doc.colors.add();
                newCol.name = colorName;
                newCol.model = ColorModel.PROCESS;
                newCol.space = ColorSpace.CMYK;
                newCol.colorValue = [c, m, y, k];
                return newCol;
            } catch (e2) {
                try {
                    return doc.colors.itemByName(colorName);
                } catch (e3) {
                    return doc.swatches.itemByName("Black");
                }
            }
        },

        getOrCreateLayer: function (doc, layName, addLay, defaultLayer) {
            if (!addLay) return defaultLayer || doc.activeLayer;
            var lay = doc.layers.itemByName(layName);
            if (!lay.isValid) {
                try {
                    lay = doc.layers.add({ name: layName });
                } catch (e) {
                    lay = doc.activeLayer;
                }
            }
            if (lay.locked) lay.locked = false;
            if (!lay.visible) lay.visible = true;
            return lay;
        },

        isCircle: function (elem) {
            try {
                var gb = elem.geometricBounds;
                var h = Math.abs(gb[2] - gb[0]);
                var w = Math.abs(gb[3] - gb[1]);
                if (h === 0 || w === 0) return false;
                var ratio = Math.abs(w - h) / Math.max(w, h);
                return ratio <= 0.03;
            } catch (e) {
                return false;
            }
        },

        getRectByHorizGap: function (sel) {
            var b1 = sel[0].geometricBounds;
            var b2 = sel[1].geometricBounds;
            var left, right, top, bott;

            if (b1[3] <= b2[1]) {
                left = b1[3];
                right = b2[1];
            } else if (b2[3] <= b1[1]) {
                left = b2[3];
                right = b1[1];
            } else {
                return false;
            }

            top = Math.min(b1[0], b2[0]);
            bott = Math.max(b1[2], b2[2]);
            return [top, left, bott, right];
        },

        getRectByVertGap: function (sel) {
            var b1 = sel[0].geometricBounds;
            var b2 = sel[1].geometricBounds;
            var left, right, top, bott;

            if (b1[2] <= b2[0]) {
                top = b1[2];
                bott = b2[0];
            } else if (b2[2] <= b1[0]) {
                top = b2[2];
                bott = b1[0];
            } else {
                return false;
            }

            left = Math.min(b1[1], b2[1]);
            right = Math.max(b1[3], b2[3]);
            return [top, left, bott, right];
        },

        executeMeasure: function (doc, u, iterator) {
            var side = u.side;
            var strkW = u.strkW;
            var units = u.units ? ' ' + u.units : '';
            var arW = u.arW;
            var gap = u.gap;
            var stopBot = u.stopBot;
            var stopTop = u.stopTop;
            var fontSize = u.fontSize;
            var precis = u.precis;
            var measType = u.measType;
            var addLay = u.addLay;
            var layName = u.layName;
            var outArtboard = u.outArtboard;

            var arH = arW / 1.9;
            var col = this.getOrCreateCmykColor(doc, u.colComp);
            var noneSwatch = doc.swatches.itemByName("None");

            var sel = doc.selection || app.selection;
            var selElem = (iterator !== -1) ? sel[iterator] : sel[0];
            
            var targetParent = selElem.parent;
            while (targetParent && targetParent.constructor.name !== "Spread" && 
                   targetParent.constructor.name !== "Page" && 
                   targetParent.constructor.name !== "MasterSpread") {
                targetParent = targetParent.parent;
            }
            if (!targetParent) targetParent = app.activeWindow.activeSpread;

            var defLayer = (selElem.itemLayer && selElem.itemLayer.isValid) ? selElem.itemLayer : doc.activeLayer;
            var lay = this.getOrCreateLayer(doc, layName, addLay, defLayer);

            var bounds, left, right, top, bott, elW, elH, rect;

            if (iterator !== -1) {
                bounds = selElem.geometricBounds;
                top = bounds[0];
                left = bounds[1];
                bott = bounds[2];
                right = bounds[3];
                elW = right - left;
                elH = bott - top;
            } else if (measType === 'linear') {
                switch (side) {
                    case 'top':
                    case 'bott':
                        rect = this.getRectByHorizGap(sel);
                        break;
                    case 'left':
                    case 'right':
                        rect = this.getRectByVertGap(sel);
                        break;
                }
                if (rect === false) return null;
                top = rect[0];
                left = rect[1];
                bott = rect[2];
                right = rect[3];
                elW = right - left;
                elH = bott - top;
            }

            if (outArtboard && measType === 'linear') {
                var targetPage = selElem.parentPage || app.activeWindow.activePage;
                if (targetPage && targetPage.isValid) {
                    var pb = targetPage.bounds;
                    switch (side) {
                        case 'top': top = pb[0]; break;
                        case 'bott': bott = pb[2]; break;
                        case 'left': left = pb[1]; break;
                        case 'right': right = pb[3]; break;
                    }
                }
            }

            var PT_TO_MM = 2.834645668;
            var p = Math.pow(10, precis);
            var unitType = u.unitType || 'mm';
            var unitScale = 2.834645668;
            if (unitType === 'cm') unitScale = 28.34645668;
            else if (unitType === 'in') unitScale = 72.0;
            else if (unitType === 'pt' || unitType === 'px') unitScale = 1.0;
            var scaleVal = (u.scale !== undefined) ? parseScale(u.scale) : 1;

            var lablW = Math.round((elW * scaleVal) / (unitScale / p)) / p;
            var lablH = Math.round((elH * scaleVal) / (unitScale / p)) / p;
            var lablR = Math.round(((elW * scaleVal) / 2) / (unitScale / p)) / p;

            var ext = Math.max(stopBot, 2.0 * PT_TO_MM);
            var createdItems = [];

            function _addLine(p1, p2) {
                var line = targetParent.graphicLines.add();
                if (lay && lay.isValid) line.itemLayer = lay;
                line.paths[0].entirePath = [p1, p2];
                line.strokeWeight = strkW;
                line.strokeColor = col;
                line.fillColor = noneSwatch;
                line.strokeTint = 100;
                line.endCap = EndCap.BUTT_END_CAP;
                createdItems.push(line);
                return line;
            }

            function _addArrow(points) {
                var poly = targetParent.polygons.add();
                if (lay && lay.isValid) poly.itemLayer = lay;
                poly.paths[0].entirePath = points;
                poly.paths[0].pathType = PathType.CLOSED_PATH;
                poly.strokeWeight = strkW;
                poly.strokeColor = col;
                poly.fillColor = col;
                createdItems.push(poly);
                return poly;
            }

            function _addText(content, cx, cy, rotAngle) {
                var tf = targetParent.textFrames.add();
                if (lay && lay.isValid) tf.itemLayer = lay;
                var boxW = 300, boxH = fontSize * 3;
                tf.geometricBounds = [cy - boxH / 2, cx - boxW / 2, cy + boxH / 2, cx + boxW / 2];
                tf.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
                tf.textFramePreferences.insetSpacing = [0, 0, 0, 0];
                tf.textFramePreferences.ignoreWrap = true;
                tf.fillColor = noneSwatch;
                tf.strokeColor = noneSwatch;
                tf.contents = content;

                var pr = tf.paragraphs[0];
                pr.justification = Justification.CENTER_ALIGN;
                pr.pointSize = fontSize;
                if (col) pr.fillColor = col;

                try {
                    tf.fit(FitOptions.FRAME_TO_CONTENT);
                } catch (e) {}

                var curGb = tf.geometricBounds;
                var origW = curGb[3] - curGb[1];
                var origH = curGb[2] - curGb[0];

                if (rotAngle) {
                    tf.rotationAngle = rotAngle;
                }

                if (rotAngle === 90 || rotAngle === -90 || rotAngle === 270) {
                    tf.geometricBounds = [cy - origW / 2, cx - origH / 2, cy + origW / 2, cx + origH / 2];
                } else {
                    tf.geometricBounds = [cy - origH / 2, cx - origW / 2, cy + origH / 2, cx + origW / 2];
                }

                createdItems.push(tf);
                return {
                    frame: tf,
                    width: origW,
                    height: origH
                };
            }

            var midX = left + elW / 2;
            var midY = top + elH / 2;

            if (measType === 'linear') {
                var labelText, tfInfo, yPos, xPos, tw, th;

                if (side === 'top') {
                    labelText = lablW + units;
                    yPos = top - stopTop;
                    
                    tfInfo = _addText(labelText, midX, yPos, 0);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    _addLine([left, top - stopBot], [left, yPos - ext]);
                    _addLine([right, top - stopBot], [right, yPos - ext]);

                    if (tw < (elW - gap * 2 - arW * 3)) {
                        _addLine([left, yPos], [midX - tw / 2 - gap, yPos]);
                        _addLine([midX + tw / 2 + gap, yPos], [right, yPos]);
                        _addArrow([[left, yPos], [left + arW, yPos - arH / 2], [left + arW, yPos + arH / 2], [left, yPos]]);
                        _addArrow([[right, yPos], [right - arW, yPos - arH / 2], [right - arW, yPos + arH / 2], [right, yPos]]);
                    } else {
                        // Outside layout: continuous line between witness lines!
                        _addLine([left, yPos], [right, yPos]);
                        // Left extension & arrow
                        _addLine([left, yPos], [left - arW * 2, yPos]);
                        _addArrow([[left, yPos], [left - arW, yPos - arH / 2], [left - arW, yPos + arH / 2], [left, yPos]]);
                        // Right extension & arrow
                        _addLine([right, yPos], [right + arW * 2, yPos]);
                        _addArrow([[right, yPos], [right + arW, yPos - arH / 2], [right + arW, yPos + arH / 2], [right, yPos]]);
                        // Text to the right
                        tfInfo.frame.geometricBounds = [yPos - th / 2, right + arW * 2 + gap, yPos + th / 2, right + arW * 2 + gap + tw];
                    }

                } else if (side === 'bott') {
                    labelText = lablW + units;
                    yPos = bott + stopTop;

                    tfInfo = _addText(labelText, midX, yPos, 0);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    _addLine([left, bott + stopBot], [left, yPos + ext]);
                    _addLine([right, bott + stopBot], [right, yPos + ext]);

                    if (tw < (elW - gap * 2 - arW * 3)) {
                        _addLine([left, yPos], [midX - tw / 2 - gap, yPos]);
                        _addLine([midX + tw / 2 + gap, yPos], [right, yPos]);
                        _addArrow([[left, yPos], [left + arW, yPos - arH / 2], [left + arW, yPos + arH / 2], [left, yPos]]);
                        _addArrow([[right, yPos], [right - arW, yPos - arH / 2], [right - arW, yPos + arH / 2], [right, yPos]]);
                    } else {
                        // Outside layout: continuous line between witness lines!
                        _addLine([left, yPos], [right, yPos]);
                        // Left extension & arrow
                        _addLine([left, yPos], [left - arW * 2, yPos]);
                        _addArrow([[left, yPos], [left - arW, yPos - arH / 2], [left - arW, yPos + arH / 2], [left, yPos]]);
                        // Right extension & arrow
                        _addLine([right, yPos], [right + arW * 2, yPos]);
                        _addArrow([[right, yPos], [right + arW, yPos - arH / 2], [right + arW, yPos + arH / 2], [right, yPos]]);
                        // Text to the right
                        tfInfo.frame.geometricBounds = [yPos - th / 2, right + arW * 2 + gap, yPos + th / 2, right + arW * 2 + gap + tw];
                    }

                } else if (side === 'left') {
                    labelText = lablH + units;
                    xPos = left - stopTop;

                    _addLine([left - stopBot, top], [xPos - ext, top]);
                    _addLine([left - stopBot, bott], [xPos - ext, bott]);

                    tfInfo = _addText(labelText, xPos, midY, 90);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    if (tw < (elH - gap * 2 - arW * 3)) {
                        _addLine([xPos, top], [xPos, midY - tw / 2 - gap]);
                        _addLine([xPos, midY + tw / 2 + gap], [xPos, bott]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top + arW], [xPos + arH / 2, top + arW], [xPos, top]]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott - arW], [xPos + arH / 2, bott - arW], [xPos, bott]]);
                    } else {
                        // Outside layout: continuous vertical line between witness lines!
                        _addLine([xPos, top], [xPos, bott]);
                        // Top extension & arrow
                        _addLine([xPos, top], [xPos, top - arW * 2]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top - arW], [xPos + arH / 2, top - arW], [xPos, top]]);
                        // Bottom extension & arrow
                        _addLine([xPos, bott], [xPos, bott + arW * 2]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott + arW], [xPos + arH / 2, bott + arW], [xPos, bott]]);
                        // Text below bottom
                        tfInfo.frame.geometricBounds = [bott + arW * 2 + gap, xPos - th / 2, bott + arW * 2 + gap + tw, xPos + th / 2];
                    }

                } else if (side === 'right') {
                    labelText = lablH + units;
                    xPos = right + stopTop;

                    _addLine([right + stopBot, top], [xPos + ext, top]);
                    _addLine([right + stopBot, bott], [xPos + ext, bott]);

                    tfInfo = _addText(labelText, xPos, midY, 90);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    if (tw < (elH - gap * 2 - arW * 3)) {
                        _addLine([xPos, top], [xPos, midY - tw / 2 - gap]);
                        _addLine([xPos, midY + tw / 2 + gap], [xPos, bott]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top + arW], [xPos + arH / 2, top + arW], [xPos, top]]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott - arW], [xPos + arH / 2, bott - arW], [xPos, bott]]);
                    } else {
                        // Outside layout: continuous vertical line between witness lines!
                        _addLine([xPos, top], [xPos, bott]);
                        // Top extension & arrow
                        _addLine([xPos, top], [xPos, top - arW * 2]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top - arW], [xPos + arH / 2, top - arW], [xPos, top]]);
                        // Bottom extension & arrow
                        _addLine([xPos, bott], [xPos, bott + arW * 2]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott + arW], [xPos + arH / 2, bott + arW], [xPos, bott]]);
                        // Text below bottom
                        tfInfo.frame.geometricBounds = [bott + arW * 2 + gap, xPos - th / 2, bott + arW * 2 + gap + tw, xPos + th / 2];
                    }
                }

            } else if (measType === 'rad') {
                if (!this.isCircle(selElem)) return null;
                var rad = elW / 2;
                var cos45 = Math.cos(Math.PI / 4);
                var sin45 = Math.sin(Math.PI / 4);
                var xr = midX + rad * cos45;
                var yr = midY - rad * sin45;

                _addLine([midX, midY], [xr, yr]);

                var arrowTip = [xr, yr];
                var arrowBase1 = [xr - arW * cos45 + (arH / 2) * sin45, yr + arW * sin45 + (arH / 2) * cos45];
                var arrowBase2 = [xr - arW * cos45 - (arH / 2) * sin45, yr + arW * sin45 - (arH / 2) * cos45];
                _addArrow([arrowTip, arrowBase1, arrowBase2, arrowTip]);

                var kneeX = xr + stopTop * cos45;
                var kneeY = yr - stopTop * sin45;
                var endX = kneeX + stopTop;
                _addLine([xr, yr], [kneeX, kneeY]);
                _addLine([kneeX, kneeY], [endX, kneeY]);

                var radLabel = 'R ' + lablR + units;
                var rTf = _addText(radLabel, endX + gap, kneeY, 0);
                rTf.frame.geometricBounds = [kneeY - rTf.height / 2, endX + gap, kneeY + rTf.height / 2, endX + gap + rTf.width];

            } else if (measType === 'diam') {
                if (!this.isCircle(selElem)) return null;
                var radD = elW / 2;
                var cos45d = Math.cos(Math.PI / 4);
                var sin45d = Math.sin(Math.PI / 4);
                var x1 = midX - radD * cos45d;
                var y1 = midY + radD * sin45d;
                var x2 = midX + radD * cos45d;
                var y2 = midY - radD * sin45d;

                _addLine([x1, y1], [x2, y2]);

                _addArrow([[x1, y1], [x1 + arW * cos45d + (arH / 2) * sin45d, y1 - arW * sin45d + (arH / 2) * cos45d], [x1 + arW * cos45d - (arH / 2) * sin45d, y1 - arW * sin45d - (arH / 2) * cos45d], [x1, y1]]);
                _addArrow([[x2, y2], [x2 - arW * cos45d + (arH / 2) * sin45d, y2 + arW * sin45d + (arH / 2) * cos45d], [x2 - arW * cos45d - (arH / 2) * sin45d, y2 + arW * sin45d - (arH / 2) * cos45d], [x2, y2]]);

                var kneeXd = x2 + stopTop * cos45d;
                var kneeYd = y2 - stopTop * sin45d;
                var endXd = kneeXd + stopTop;
                _addLine([x2, y2], [kneeXd, kneeYd]);
                _addLine([kneeXd, kneeYd], [endXd, kneeYd]);

                var diamLabel = '\u00d8 ' + lablW + units;
                var dTf = _addText(diamLabel, endXd + gap, kneeYd, 0);
                dTf.frame.geometricBounds = [kneeYd - dTf.height / 2, endXd + gap, kneeYd + dTf.height / 2, endXd + gap + dTf.width];

            } else if (measType === 'cent') {
                var N = 9, N_HOR = N, N_VER = N;
                if (elW < N_HOR * 6) N_HOR = elW / 6;
                if (elH < N_VER * 6) N_VER = elH / 6;

                _addLine([midX - N_HOR, midY], [midX + N_HOR, midY]);
                _addLine([midX, midY - N_VER], [midX, midY + N_VER]);

                _addLine([left - N, midY], [midX - 2 * N_HOR, midY]);
                _addLine([midX + 2 * N_HOR, midY], [right + N, midY]);
                _addLine([midX, top - N], [midX, midY - 2 * N_VER]);
                _addLine([midX, midY + 2 * N_VER], [midX, bott + N]);
            }

            if (createdItems.length === 0) return null;

            var measGroup = (createdItems.length > 1) ? targetParent.groups.add(createdItems) : createdItems[0];
            var measName = this.makeRandStr(7);
            measGroup.name = measName;
            measGroup.label = "ID_DIMENSION_" + measName;

            return measName;
        },

        deleteByName: function (name) {
            if (app.documents.length === 0) return false;
            try {
                var doc = app.activeDocument;
                var allItems = doc.allPageItems;
                for (var i = 0; i < allItems.length; i++) {
                    if (allItems[i].name === name || allItems[i].label === "ID_DIMENSION_" + name) {
                        allItems[i].remove();
                        return true;
                    }
                }
                return false;
            } catch (e) {
                return false;
            }
        },

        deleteAll: function () {
            if (app.documents.length === 0) return 0;
            var doc = app.activeDocument;
            var count = 0;
            try {
                var allItems = doc.allPageItems;
                for (var i = allItems.length - 1; i >= 0; i--) {
                    var item = allItems[i];
                    try {
                        if (item.isValid && item.label && item.label.indexOf("ID_DIMENSION_") === 0) {
                            item.remove();
                            count++;
                        }
                    } catch (eItem) {}
                }
            } catch (e) {}
            return count;
        },

        run: function (u) {
            if (app.documents.length === 0) return [];
            var doc = app.activeDocument;
            var sel = doc.selection || app.selection;
            if (!sel || sel.length === 0) return [];

            var origUnit = app.scriptPreferences.measurementUnit;
            var origRedraw = app.scriptPreferences.enableRedraw;

            try {
                app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
                app.scriptPreferences.enableRedraw = false;

                var res = [];
                if (sel.length === 2 && u.ctrl === true) {
                    if (sel[0].name && sel[0].name.match(/\d{7}/)) return [];
                    if (sel[1].name && sel[1].name.match(/\d{7}/)) return [];
                    var name2 = this.executeMeasure(doc, u, -1);
                    if (name2) res.push(name2);
                    return res;
                }

                for (var i = 0; i < sel.length; i++) {
                    if (sel[i].name && sel[i].name.match(/\d{7}/)) continue;
                    var nameSingle = this.executeMeasure(doc, u, i);
                    if (nameSingle) res.push(nameSingle);
                }
                return res;

            } finally {
                app.scriptPreferences.measurementUnit = origUnit;
                app.scriptPreferences.enableRedraw = origRedraw;
            }
        }
    };

    $.global.idDimensionEngine = Engine;

    // --- Build ScriptUI Window ---
    var win = new Window("palette", "ID Dimension v1.2", undefined, { resizeable: false });
    win.text = "ID Dimension v1.2";
    $.global.idDimensionPalette = win;

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 8;

    // --- 1. Measurement Buttons Block ---
    var pnlMeas = win.add("group");
    pnlMeas.orientation = "row";
    pnlMeas.alignment = ["center", "top"];
    pnlMeas.spacing = 8;

    var btnDiam = pnlMeas.add("button", undefined, "\u00D8");
    btnDiam.size = [30, 26];
    btnDiam.helpTip = "Diameter";

    var grpCross = pnlMeas.add("group");
    grpCross.orientation = "column";
    grpCross.spacing = 2;
    grpCross.alignChildren = ["center", "center"];

    var btnTop = grpCross.add("button", undefined, "\u25B2");
    btnTop.size = [30, 22];
    btnTop.helpTip = "Top Dimension (Hold Alt for gap between 2 objects)";

    var grpMid = grpCross.add("group");
    grpMid.orientation = "row";
    grpMid.spacing = 2;

    var btnLeft = grpMid.add("button", undefined, "\u25C0");
    btnLeft.size = [26, 26];
    btnLeft.helpTip = "Left Dimension";

    var btnCent = grpMid.add("button", undefined, "\u253C");
    btnCent.size = [26, 26];
    btnCent.helpTip = "Center Point";

    var btnRight = grpMid.add("button", undefined, "\u25B6");
    btnRight.size = [26, 26];
    btnRight.helpTip = "Right Dimension";

    var btnBott = grpCross.add("button", undefined, "\u25BC");
    btnBott.size = [30, 22];
    btnBott.helpTip = "Bottom Dimension";

    var btnRad = pnlMeas.add("button", undefined, "R");
    btnRad.size = [30, 26];
    btnRad.helpTip = "Radius";

    // --- 2. Settings Block ---
    var pnlSet = win.add("panel", undefined, "");
    pnlSet.orientation = "column";
    pnlSet.alignChildren = ["fill", "top"];
    pnlSet.spacing = 4;
    pnlSet.margins = 6;

    // Row 1: unit, scale, layer
    var r1 = pnlSet.add("group");
    r1.orientation = "row";
    var chkUnit = r1.add("checkbox", undefined, "unit");
    r1.add("statictext", undefined, "scale:").characters = 4;
    var txtScale = r1.add("edittext", undefined, "1:1");
    txtScale.characters = 4;
    txtScale.helpTip = "Scale ratio (e.g. 1:1, 1:10, 1:50, or multiplier like 10)";
    var chkLayer = r1.add("checkbox", undefined, "layer:");
    var txtLayer = r1.add("edittext", undefined, "layout");
    txtLayer.characters = 6;

    // Row 2: length & precis
    var r2 = pnlSet.add("group");
    r2.orientation = "row";
    r2.add("statictext", undefined, "length:").characters = 5;
    var txtLen = r2.add("edittext", undefined, "10");
    txtLen.characters = 4;
    r2.add("statictext", undefined, "precis:").characters = 4;
    var ddlPrecis = r2.add("dropdownlist", undefined, ["0", "0.0", "0.00", "0.000"]);
    ddlPrecis.selection = 2;

    // Row 3: stroke & gap
    var r3 = pnlSet.add("group");
    r3.orientation = "row";
    r3.add("statictext", undefined, "stroke:").characters = 5;
    var txtStroke = r3.add("edittext", undefined, "0.2");
    txtStroke.characters = 4;
    r3.add("statictext", undefined, "gap:").characters = 4;
    var txtGap = r3.add("edittext", undefined, "0.5");
    txtGap.characters = 4;

    // Row 4: indent & arrow
    var r4 = pnlSet.add("group");
    r4.orientation = "row";
    r4.add("statictext", undefined, "indent:").characters = 5;
    var txtIndent = r4.add("edittext", undefined, "1.0");
    txtIndent.characters = 4;
    r4.add("statictext", undefined, "arrow:").characters = 4;
    var txtArrow = r4.add("edittext", undefined, "3.5");
    txtArrow.characters = 4;

    // Row 5: font size & units
    var r5 = pnlSet.add("group");
    r5.orientation = "row";
    r5.add("statictext", undefined, "font size:").characters = 5;
    var txtFontSize = r5.add("edittext", undefined, "14");
    txtFontSize.characters = 4;
    r5.add("statictext", undefined, "units:").characters = 4;
    var ddlUnits = r5.add("dropdownlist", undefined, UNITS_LIST);
    ddlUnits.selection = 0;

    // Row 6: CMYK inputs
    var r6 = pnlSet.add("group");
    r6.orientation = "row";
    r6.spacing = 3;
    r6.add("statictext", undefined, "CMYK:").characters = 4;
    var txtC = r6.add("edittext", undefined, "0"); txtC.characters = 3; txtC.helpTip = "Cyan (0-100)";
    var txtM = r6.add("edittext", undefined, "0"); txtM.characters = 3; txtM.helpTip = "Magenta (0-100)";
    var txtY = r6.add("edittext", undefined, "0"); txtY.characters = 3; txtY.helpTip = "Yellow (0-100)";
    var txtK = r6.add("edittext", undefined, "100"); txtK.characters = 3; txtK.helpTip = "Black (0-100)";

    // Row 7: Swatches
    var r7 = pnlSet.add("group");
    r7.orientation = "row";
    r7.spacing = 3;
    r7.alignment = ["fill", "center"];
    var swatchLabels = ["[W]", "[K]", "[R]", "[Y]", "[G]", "[B]"];

    for (var sIdx = 0; sIdx < 6; sIdx++) {
        (function (idx) {
            var btn = r7.add("button", undefined, swatchLabels[idx]);
            btn.size = [28, 20];
            btn.helpTip = "Color Swatch " + (idx + 1) + " (Click to apply, or check 'save' to store current CMYK)";
            btn.onClick = function () {
                var cVal = isNaN(parseFloat(txtC.text)) ? 0 : parseFloat(txtC.text);
                var mVal = isNaN(parseFloat(txtM.text)) ? 0 : parseFloat(txtM.text);
                var yVal = isNaN(parseFloat(txtY.text)) ? 0 : parseFloat(txtY.text);
                var kVal = isNaN(parseFloat(txtK.text)) ? 0 : parseFloat(txtK.text);

                if (chkSave.value) {
                    appData.swatches[idx] = { c: cVal, m: mVal, y: yVal, k: kVal };
                    savePrefs(appData);
                } else {
                    var sw = appData.swatches[idx] || DEFAULT_SWATCHES[idx];
                    txtC.text = String(sw.c);
                    txtM.text = String(sw.m);
                    txtY.text = String(sw.y);
                    txtK.text = String(sw.k);
                    saveCurrentState();
                }
            };
        })(sIdx);
    }

    // Row 8: out page, save, clear, default
    var r8 = pnlSet.add("group");
    r8.orientation = "row";
    r8.alignment = ["fill", "center"];
    var chkOutPage = r8.add("checkbox", undefined, "out page");
    var chkSave = r8.add("checkbox", undefined, "save");
    var btnClear = r8.add("button", undefined, "clear");
    btnClear.size = [40, 20];
    btnClear.helpTip = "Delete all ID Dimension items in the active document";
    var btnDefault = r8.add("button", undefined, "default");
    btnDefault.size = [46, 20];
    btnDefault.helpTip = "Reset all settings and colors to defaults";

    // --- 3. Presets Row ---
    var pnlPresets = win.add("group");
    pnlPresets.orientation = "row";
    pnlPresets.alignment = ["fill", "top"];
    pnlPresets.spacing = 6;

    var btnMin = pnlPresets.add("button", undefined, "min");
    btnMin.alignment = ["fill", "center"];
    var btnMed = pnlPresets.add("button", undefined, "med");
    btnMed.alignment = ["fill", "center"];
    var btnMax = pnlPresets.add("button", undefined, "max");
    btnMax.alignment = ["fill", "center"];

    // --- UI State Management ---
    function collectUI() {
        var cVal = isNaN(parseFloat(txtC.text)) ? 0 : parseFloat(txtC.text);
        var mVal = isNaN(parseFloat(txtM.text)) ? 0 : parseFloat(txtM.text);
        var yVal = isNaN(parseFloat(txtY.text)) ? 0 : parseFloat(txtY.text);
        var kVal = isNaN(parseFloat(txtK.text)) ? 0 : parseFloat(txtK.text);

        return {
            add_mm: chkUnit.value,
            scale: txtScale.text || "1:1",
            unit_select: ddlUnits.selection ? ddlUnits.selection.index : 0,
            line_len: parseFloat(txtLen.text) || 10,
            precis: ddlPrecis.selection ? ddlPrecis.selection.index : 2,
            line_stroke: parseFloat(txtStroke.text) || 0.2,
            gap: parseFloat(txtGap.text) || 0.5,
            line_indent: parseFloat(txtIndent.text) || 1.0,
            arrow_width: parseFloat(txtArrow.text) || 3.5,
            font_size: parseFloat(txtFontSize.text) || 14,
            cyan: cVal,
            magenta: mVal,
            yellow: yVal,
            black: kVal,
            add_layer: chkLayer.value,
            layer_name_text: txtLayer.text,
            out_artboard: chkOutPage.value
        };
    }

    function applyUI(st) {
        if (!st) return;
        chkUnit.value = !!st.add_mm;
        txtScale.text = String(st.scale !== undefined ? st.scale : "1:1");
        ddlUnits.selection = (st.unit_select !== undefined) ? st.unit_select : 0;
        txtLen.text = String(st.line_len !== undefined ? st.line_len : 10);
        ddlPrecis.selection = (st.precis !== undefined) ? st.precis : 2;
        txtStroke.text = String(st.line_stroke !== undefined ? st.line_stroke : 0.2);
        txtGap.text = String(st.gap !== undefined ? st.gap : 0.5);
        txtIndent.text = String(st.line_indent !== undefined ? st.line_indent : 1.0);
        txtArrow.text = String(st.arrow_width !== undefined ? st.arrow_width : 3.5);
        txtFontSize.text = String(st.font_size !== undefined ? st.font_size : 14);
        txtC.text = String(st.cyan !== undefined ? st.cyan : 0);
        txtM.text = String(st.magenta !== undefined ? st.magenta : 0);
        txtY.text = String(st.yellow !== undefined ? st.yellow : 0);
        txtK.text = String(st.black !== undefined ? st.black : 100);
        chkLayer.value = !!st.add_layer;
        txtLayer.text = st.layer_name_text || "layout";
        chkOutPage.value = !!st.out_artboard;
    }

    function saveCurrentState() {
        appData.lastState = collectUI();
        savePrefs(appData);
    }

    function handlePreset(key) {
        if (chkSave.value) {
            appData.presets[key] = collectUI();
            savePrefs(appData);
        } else {
            applyUI(appData.presets[key] || DEFAULT_PRESETS[key]);
            saveCurrentState();
        }
    }

    btnMin.onClick = function () { handlePreset("min"); };
    btnMed.onClick = function () { handlePreset("med"); };
    btnMax.onClick = function () { handlePreset("max"); };

    btnClear.onClick = function () {
        if (app.documents.length === 0) {
            alert("Please open an InDesign document first.");
            return;
        }
        try {
            app.doScript("$.global.idDimensionEngine.deleteAll();", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Delete ID Dimensions");
        } catch (e) {
            Engine.deleteAll();
        }
    };

    btnDefault.onClick = function () {
        if (confirm("Reset all settings and colors to defaults?")) {
            appData = {
                presets: DEFAULT_PRESETS,
                swatches: DEFAULT_SWATCHES,
                lastState: DEFAULT_PRESETS.med
            };
            savePrefs(appData);
            applyUI(DEFAULT_PRESETS.med);
        }
    };

    // Auto-save on edit
    var inputs = [txtLen, txtScale, txtStroke, txtGap, txtIndent, txtArrow, txtFontSize, txtC, txtM, txtY, txtK, txtLayer];
    for (var inpIdx = 0; inpIdx < inputs.length; inpIdx++) {
        inputs[inpIdx].onChange = saveCurrentState;
    }
    chkUnit.onClick = saveCurrentState;
    chkLayer.onClick = saveCurrentState;
    chkOutPage.onClick = saveCurrentState;
    ddlPrecis.onChange = saveCurrentState;
    ddlUnits.onChange = saveCurrentState;

    // --- Action Execution with InDesign Undo support ---
    function runAction(type, side) {
        try {
            if (app.documents.length === 0) {
                alert("Please open an InDesign document first.");
                return;
            }
            var doc = app.activeDocument;
            var sel = doc.selection || app.selection;
            if (!sel || sel.length === 0) {
                alert("Please select one or more objects on the page.");
                return;
            }

            saveCurrentState();
            var ui = collectUI();
            var PT_TO_MM = 2.834645668;
            var selUnit = UNITS_LIST[ui.unit_select] || 'mm';

            var isTwoObjs = (sel.length === 2);

            var opts = {
                measType: type,
                side: side || '',
                ctrl: isTwoObjs,
                strkW: ui.line_stroke * PT_TO_MM,
                gap: ui.gap * PT_TO_MM,
                stopBot: ui.line_indent * PT_TO_MM,
                stopTop: ui.line_len * PT_TO_MM,
                arW: ui.arrow_width * PT_TO_MM,
                fontSize: ui.font_size,
                precis: ui.precis,
                colComp: [ui.cyan, ui.magenta, ui.yellow, ui.black],
                units: ui.add_mm ? selUnit : '',
                unitType: selUnit,
                scale: ui.scale,
                addLay: ui.add_layer,
                layName: ui.layer_name_text,
                outArtboard: ui.out_artboard
            };

            var optsStr = stringifyJSON(opts);

            try {
                app.doScript("$.global.idDimensionEngine.run(" + optsStr + ");", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "ID Dimension: " + type);
            } catch (e1) {
                Engine.run(opts);
            }

        } catch (err) {
            alert("Error running ID Dimension:\n" + err.message + "\nLine: " + err.line);
        }
    }

    btnTop.onClick = function () { runAction('linear', 'top'); };
    btnBott.onClick = function () { runAction('linear', 'bott'); };
    btnLeft.onClick = function () { runAction('linear', 'left'); };
    btnRight.onClick = function () { runAction('linear', 'right'); };
    btnDiam.onClick = function () { runAction('diam', ''); };
    btnRad.onClick = function () { runAction('rad', ''); };
    btnCent.onClick = function () { runAction('cent', ''); };

    // Initial populate
    applyUI(appData.lastState || DEFAULT_PRESETS.med);

    // Show palette window
    win.show();

    } catch (fatalErr) {
        alert("ID Dimension Startup Error:\n" + fatalErr.message + "\nLine: " + fatalErr.line);
    }

})();
