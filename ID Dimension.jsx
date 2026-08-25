/**
 * ID Dimension v1.4 - Standalone ScriptUI Palette for Adobe InDesign
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
            font_name: 'default', font_size: 8, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
        },
        med: {
            add_mm: false, unit_select: 0, line_len: 10, precis: 2, line_stroke: 0.2, gap: 1, line_indent: 1, arrow_width: 3.5,
            font_name: 'default', font_size: 14, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
        },
        max: {
            add_mm: false, unit_select: 0, line_len: 20, precis: 3, line_stroke: 0.5, gap: 2, line_indent: 2, arrow_width: 5,
            font_name: 'default', font_size: 24, cyan: 0, magenta: 0, yellow: 0, black: 100, add_layer: false, layer_name_text: 'layout', out_artboard: false, scale: '1:1'
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

    var POPULAR_FONTS = [
        { label: "Default (Minion Pro / System)", name: "default" },
        { label: "Minion Pro Regular", name: "MinionPro-Regular" },
        { label: "Minion Pro Bold", name: "MinionPro-Bold" },
        { label: "Myriad Pro Regular", name: "MyriadPro-Regular" },
        { label: "Myriad Pro Bold Cond", name: "MyriadPro-BoldCond" },
        { label: "Arial Regular", name: "ArialMT" },
        { label: "Arial Bold", name: "Arial-BoldMT" },
        { label: "Helvetica Regular", name: "Helvetica" },
        { label: "Helvetica Bold", name: "Helvetica-Bold" },
        { label: "Calibri Regular", name: "Calibri" },
        { label: "Calibri Bold", name: "Calibri-Bold" },
        { label: "Roboto Regular", name: "Roboto-Regular" },
        { label: "Roboto Bold", name: "Roboto-Bold" },
        { label: "Segoe UI Regular", name: "SegoeUI" },
        { label: "Segoe UI Bold", name: "SegoeUI-Bold" },
        { label: "Futura Bold", name: "Futura-Bold" },
        { label: "Times New Roman Bold", name: "TimesNewRomanPS-BoldMT" },
        { label: "Trebuchet MS", name: "TrebuchetMS" },
        { label: "Verdana", name: "Verdana" },
        { label: "Consolas", name: "Consolas" }
    ];

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

    function formatNumber(num, dec) {
        if (isNaN(num) || !isFinite(num)) return "0";
        var d = parseInt(dec, 10);
        if (isNaN(d) || d < 0) d = 0;
        return Number(num.toFixed(d)).toFixed(d);
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
        PT_TO_MM: 2.834645668,
        MM_TO_PT: 0.352777778,

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
                if (existing.isValid) return existing;
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

        applyFontToTextFrame: function (tf, fontParam) {
            if (!tf || !fontParam || fontParam === 'default' || fontParam === '') return;
            try {
                tf.paragraphs[0].appliedFont = fontParam;
                return;
            } catch (e0) {}
            try {
                tf.paragraphs[0].appliedFont = app.fonts.itemByName(fontParam);
                return;
            } catch (e1) {}
            try {
                if (fontParam.indexOf('\t') === -1) {
                    tf.paragraphs[0].appliedFont = app.fonts.itemByName(fontParam + '\tRegular');
                    return;
                }
            } catch (e2) {}
        },

        isCircle: function (elem) {
            try {
                if (!elem || elem.constructor.name === "Group") return false;
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
            if (!sel || sel.length < 2) return null;
            var b1 = sel[0].geometricBounds; // [top, left, bott, right]
            var b2 = sel[1].geometricBounds;
            if (!b1 || !b2) return null;

            var leftObj = (b1[1] <= b2[1]) ? b1 : b2;
            var rightObj = (b1[1] <= b2[1]) ? b2 : b1;

            var left = leftObj[3];   // right edge of leftmost object
            var right = rightObj[1];  // left edge of rightmost object

            if (right <= left) {
                left = Math.min(leftObj[3], rightObj[1]);
                right = Math.max(leftObj[3], rightObj[1]);
                if (right === left) right = left + 1;
            }

            var top = Math.min(b1[0], b2[0]);
            var bott = Math.max(b1[2], b2[2]);
            var overlapTop = Math.max(b1[0], b2[0]);
            var overlapBot = Math.min(b1[2], b2[2]);
            if (overlapBot > overlapTop) {
                top = overlapTop;
                bott = overlapBot;
            }

            return [top, left, bott, right];
        },

        getRectByVertGap: function (sel) {
            if (!sel || sel.length < 2) return null;
            var b1 = sel[0].geometricBounds; // [top, left, bott, right]
            var b2 = sel[1].geometricBounds;
            if (!b1 || !b2) return null;

            var topObj = (b1[0] <= b2[0]) ? b1 : b2;
            var botObj = (b1[0] <= b2[0]) ? b2 : b1;

            var top = topObj[2];    // bottom edge of upper object
            var bott = botObj[0];   // top edge of lower object

            if (bott <= top) {
                top = Math.min(topObj[2], botObj[0]);
                bott = Math.max(topObj[2], botObj[0]);
                if (bott === top) bott = top + 1;
            }

            var left = Math.min(b1[1], b2[1]);
            var right = Math.max(b1[3], b2[3]);
            var overlapLeft = Math.max(b1[1], b2[1]);
            var overlapRight = Math.min(b1[3], b2[3]);
            if (overlapRight > overlapLeft) {
                left = overlapLeft;
                right = overlapRight;
            }

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
            var fontName = u.fontName || 'default';

            var arH = arW / 1.9;
            var col = this.getOrCreateCmykColor(doc, u.colComp);
            var noneSwatch = doc.swatches.itemByName("None");

            var sel = doc.selection || app.selection;
            var selElem = (iterator !== -1) ? sel[iterator] : sel[0];
            
            // Find target container (Page or Spread) with infinite-loop safeguard
            var targetParent = selElem.parent;
            var safetyCounter = 0;
            while (targetParent && safetyCounter < 25) {
                safetyCounter++;
                var cName = "";
                try { cName = targetParent.constructor.name; } catch(e) { break; }
                if (cName === "Spread" || cName === "Page" || cName === "MasterSpread") {
                    break;
                }
                if (cName === "Document" || cName === "Application" || !targetParent.parent || targetParent.parent === targetParent) {
                    targetParent = null;
                    break;
                }
                try {
                    targetParent = targetParent.parent;
                } catch(e2) {
                    targetParent = null;
                    break;
                }
            }
            if (!targetParent || targetParent.constructor.name === "Document" || targetParent.constructor.name === "Application") {
                try {
                    targetParent = app.activeWindow.activeSpread;
                } catch(eWin) {
                    try {
                        targetParent = doc.activeSpread || doc.spreads[0];
                    } catch(eDoc) {
                        targetParent = null;
                    }
                }
            }
            if (!targetParent) return null;

            var defLayer = (selElem.itemLayer && selElem.itemLayer.isValid) ? selElem.itemLayer : doc.activeLayer;
            var lay = this.getOrCreateLayer(doc, layName, addLay, defLayer);

            var bounds, left, right, top, bott, elW, elH, rect;

            if (iterator !== -1) {
                bounds = selElem.geometricBounds; // InDesign: [top, left, bott, right]
                top = bounds[0];
                left = bounds[1];
                bott = bounds[2];
                right = bounds[3];
                elW = right - left;
                elH = bott - top;
            } else if (measType === 'gap_h' || (measType === 'linear' && (side === 'top' || side === 'bott'))) {
                rect = this.getRectByHorizGap(sel);
                if (!rect) return null;
                top = rect[0];
                left = rect[1];
                bott = rect[2];
                right = rect[3];
                elW = right - left;
                elH = bott - top;
            } else if (measType === 'gap_v' || (measType === 'linear' && (side === 'left' || side === 'right'))) {
                rect = this.getRectByVertGap(sel);
                if (!rect) return null;
                top = rect[0];
                left = rect[1];
                bott = rect[2];
                right = rect[3];
                elW = right - left;
                elH = bott - top;
            }

            if (isNaN(elW) || !isFinite(elW) || elW <= 0) elW = 0.001;
            if (isNaN(elH) || !isFinite(elH) || elH <= 0) elH = 0.001;

            // Out Page positioning
            if (outArtboard && (measType === 'linear' || measType === 'gap_h' || measType === 'gap_v')) {
                var targetPage = selElem.parentPage || app.activeWindow.activePage;
                if (targetPage && targetPage.isValid) {
                    var pb = targetPage.bounds; // [top, left, bott, right]
                    switch (side) {
                        case 'top': top = pb[0]; break;
                        case 'bott': bott = pb[2]; break;
                        case 'left': left = pb[1]; break;
                        case 'right': right = pb[3]; break;
                    }
                }
            }

            var unitType = u.unitType || 'mm';
            var unitScale = 2.834645668; // mm in pt
            if (unitType === 'cm') unitScale = 28.34645668;
            else if (unitType === 'in') unitScale = 72.0;
            else if (unitType === 'pt' || unitType === 'px') unitScale = 1.0;
            
            var scaleVal = (u.scale !== undefined) ? parseScale(u.scale) : 1;

            var valW = (elW * scaleVal) / unitScale;
            var valH = (elH * scaleVal) / unitScale;
            var valR = ((elW * scaleVal) / 2) / unitScale;

            var lablW = formatNumber(valW, precis);
            var lablH = formatNumber(valH, precis);
            var lablR = formatNumber(valR, precis);

            // Extension past dimension line for witness lines (1.5 - 2 mm)
            var ext = Math.max(stopBot, 2.0 * this.PT_TO_MM);
            var createdItems = [];
            var self = this;

            // --- Drawing subroutines ---
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

                self.applyFontToTextFrame(tf, fontName);

                try {
                    tf.fit(FitOptions.FRAME_TO_CONTENT);
                } catch (e) {}

                var curGb = tf.geometricBounds;
                var origW = curGb[3] - curGb[1];
                var origH = curGb[2] - curGb[0];

                if (rotAngle) {
                    tf.rotationAngle = rotAngle;
                }

                // Center at (cx, cy)
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

            // --- Execution Branches ---
            var midX = left + elW / 2;
            var midY = top + elH / 2;

            if (measType === 'linear' || measType === 'gap_h' || measType === 'gap_v') {
                var activeSide = side;
                if (measType === 'gap_h' && !activeSide) activeSide = 'top';
                if (measType === 'gap_v' && !activeSide) activeSide = 'left';

                var labelText, tfInfo, yPos, xPos, tw, th;

                if (activeSide === 'top') {
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
                        _addLine([left, yPos], [right, yPos]);
                        _addLine([left, yPos], [left - arW * 2, yPos]);
                        _addArrow([[left, yPos], [left - arW, yPos - arH / 2], [left - arW, yPos + arH / 2], [left, yPos]]);
                        _addLine([right, yPos], [right + arW * 2, yPos]);
                        _addArrow([[right, yPos], [right + arW, yPos - arH / 2], [right + arW, yPos + arH / 2], [right, yPos]]);
                        tfInfo.frame.geometricBounds = [yPos - th / 2, right + arW * 2 + gap, yPos + th / 2, right + arW * 2 + gap + tw];
                    }

                } else if (activeSide === 'bott') {
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
                        _addLine([left, yPos], [right, yPos]);
                        _addLine([left, yPos], [left - arW * 2, yPos]);
                        _addArrow([[left, yPos], [left - arW, yPos - arH / 2], [left - arW, yPos + arH / 2], [left, yPos]]);
                        _addLine([right, yPos], [right + arW * 2, yPos]);
                        _addArrow([[right, yPos], [right + arW, yPos - arH / 2], [right + arW, yPos + arH / 2], [right, yPos]]);
                        tfInfo.frame.geometricBounds = [yPos - th / 2, right + arW * 2 + gap, yPos + th / 2, right + arW * 2 + gap + tw];
                    }

                } else if (activeSide === 'left') {
                    labelText = lablH + units;
                    xPos = left - stopTop;

                    tfInfo = _addText(labelText, xPos, midY, -90);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    _addLine([left - stopBot, top], [xPos - ext, top]);
                    _addLine([left - stopBot, bott], [xPos - ext, bott]);

                    if (th < (elH - gap * 2 - arW * 3)) {
                        _addLine([xPos, top], [xPos, midY - th / 2 - gap]);
                        _addLine([xPos, midY + th / 2 + gap], [xPos, bott]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top + arW], [xPos + arH / 2, top + arW], [xPos, top]]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott - arW], [xPos + arH / 2, bott - arW], [xPos, bott]]);
                    } else {
                        _addLine([xPos, top], [xPos, bott]);
                        _addLine([xPos, top], [xPos, top - arW * 2]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top - arW], [xPos + arH / 2, top - arW], [xPos, top]]);
                        _addLine([xPos, bott], [xPos, bott + arW * 2]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott + arW], [xPos + arH / 2, bott + arW], [xPos, bott]]);
                        tfInfo.frame.geometricBounds = [bott + arW * 2 + gap, xPos - th / 2, bott + arW * 2 + gap + tw, xPos + th / 2];
                    }

                } else if (activeSide === 'right') {
                    labelText = lablH + units;
                    xPos = right + stopTop;

                    tfInfo = _addText(labelText, xPos, midY, -90);
                    tw = tfInfo.width;
                    th = tfInfo.height;

                    _addLine([right + stopBot, top], [xPos + ext, top]);
                    _addLine([right + stopBot, bott], [xPos + ext, bott]);

                    if (th < (elH - gap * 2 - arW * 3)) {
                        _addLine([xPos, top], [xPos, midY - th / 2 - gap]);
                        _addLine([xPos, midY + th / 2 + gap], [xPos, bott]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top + arW], [xPos + arH / 2, top + arW], [xPos, top]]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott - arW], [xPos + arH / 2, bott - arW], [xPos, bott]]);
                    } else {
                        _addLine([xPos, top], [xPos, bott]);
                        _addLine([xPos, top], [xPos, top - arW * 2]);
                        _addArrow([[xPos, top], [xPos - arH / 2, top - arW], [xPos + arH / 2, top - arW], [xPos, top]]);
                        _addLine([xPos, bott], [xPos, bott + arW * 2]);
                        _addArrow([[xPos, bott], [xPos - arH / 2, bott + arW], [xPos + arH / 2, bott + arW], [xPos, bott]]);
                        tfInfo.frame.geometricBounds = [bott + arW * 2 + gap, xPos - th / 2, bott + arW * 2 + gap + tw, xPos + th / 2];
                    }
                }

            } else if (measType === 'rad') {
                if (!this.isCircle(selElem)) {
                    return null;
                }
                var isLeft = (side === 'tl' || side === 'bl' || side === 'left');
                var isBottom = (side === 'br' || side === 'bl' || side === 'bott');

                var rad = elW / 2;
                var cos45 = Math.cos(Math.PI / 4);
                var sin45 = Math.sin(Math.PI / 4);

                var xr = isLeft ? (midX - rad * cos45) : (midX + rad * cos45);
                var yr = isBottom ? (midY + rad * sin45) : (midY - rad * sin45);

                _addLine([midX, midY], [xr, yr]);

                var arrowTip = [xr, yr];
                var arrowBase1, arrowBase2;
                if (isLeft && isBottom) {
                    arrowBase1 = [xr + arW * cos45 - (arH / 2) * sin45, yr - arW * sin45 - (arH / 2) * cos45];
                    arrowBase2 = [xr + arW * cos45 + (arH / 2) * sin45, yr - arW * sin45 + (arH / 2) * cos45];
                } else if (isLeft && !isBottom) {
                    arrowBase1 = [xr + arW * cos45 + (arH / 2) * sin45, yr + arW * sin45 - (arH / 2) * cos45];
                    arrowBase2 = [xr + arW * cos45 - (arH / 2) * sin45, yr + arW * sin45 + (arH / 2) * cos45];
                } else if (!isLeft && isBottom) {
                    arrowBase1 = [xr - arW * cos45 - (arH / 2) * sin45, yr - arW * sin45 + (arH / 2) * cos45];
                    arrowBase2 = [xr - arW * cos45 + (arH / 2) * sin45, yr - arW * sin45 - (arH / 2) * cos45];
                } else {
                    arrowBase1 = [xr - arW * cos45 + (arH / 2) * sin45, yr + arW * sin45 + (arH / 2) * cos45];
                    arrowBase2 = [xr - arW * cos45 - (arH / 2) * sin45, yr + arW * sin45 - (arH / 2) * cos45];
                }
                _addArrow([arrowTip, arrowBase1, arrowBase2, arrowTip]);

                var kneeX = isLeft ? (xr - stopTop * cos45) : (xr + stopTop * cos45);
                var kneeY = isBottom ? (yr + stopTop * sin45) : (yr - stopTop * sin45);
                var endX = isLeft ? (kneeX - stopTop) : (kneeX + stopTop);
                
                _addLine([xr, yr], [kneeX, kneeY]);
                _addLine([kneeX, kneeY], [endX, kneeY]);

                var radLabel = 'R ' + lablR + units;
                var rTf = _addText(radLabel, isLeft ? endX - gap : endX + gap, kneeY, 0);
                if (isLeft) {
                    rTf.frame.geometricBounds = [kneeY - rTf.height / 2, endX - gap - rTf.width, kneeY + rTf.height / 2, endX - gap];
                } else {
                    rTf.frame.geometricBounds = [kneeY - rTf.height / 2, endX + gap, kneeY + rTf.height / 2, endX + gap + rTf.width];
                }

            } else if (measType === 'diam') {
                if (!this.isCircle(selElem)) {
                    return null;
                }
                var isLeft = (side === 'tl' || side === 'bl' || side === 'left');
                var isBottom = (side === 'br' || side === 'bl' || side === 'bott');

                var radD = elW / 2;
                var cos45d = Math.cos(Math.PI / 4);
                var sin45d = Math.sin(Math.PI / 4);

                var x1 = isLeft ? (midX + radD * cos45d) : (midX - radD * cos45d);
                var y1 = isBottom ? (midY - radD * sin45d) : (midY + radD * sin45d);
                var x2 = isLeft ? (midX - radD * cos45d) : (midX + radD * cos45d);
                var y2 = isBottom ? (midY + radD * sin45d) : (midY - radD * sin45d);

                _addLine([x1, y1], [x2, y2]);

                if (isLeft && isBottom) {
                    _addArrow([[x1, y1], [x1 - arW * cos45d - (arH / 2) * sin45d, y1 + arW * sin45d - (arH / 2) * cos45d], [x1 - arW * cos45d + (arH / 2) * sin45d, y1 + arW * sin45d + (arH / 2) * cos45d], [x1, y1]]);
                    _addArrow([[x2, y2], [x2 + arW * cos45d - (arH / 2) * sin45d, y2 - arW * sin45d - (arH / 2) * cos45d], [x2 + arW * cos45d + (arH / 2) * sin45d, y2 - arW * sin45d + (arH / 2) * cos45d], [x2, y2]]);
                } else if (isLeft && !isBottom) {
                    _addArrow([[x1, y1], [x1 - arW * cos45d + (arH / 2) * sin45d, y1 - arW * sin45d - (arH / 2) * cos45d], [x1 - arW * cos45d - (arH / 2) * sin45d, y1 - arW * sin45d + (arH / 2) * cos45d], [x1, y1]]);
                    _addArrow([[x2, y2], [x2 + arW * cos45d + (arH / 2) * sin45d, y2 + arW * sin45d - (arH / 2) * cos45d], [x2 + arW * cos45d - (arH / 2) * sin45d, y2 + arW * sin45d + (arH / 2) * cos45d], [x2, y2]]);
                } else if (!isLeft && isBottom) {
                    _addArrow([[x1, y1], [x1 + arW * cos45d - (arH / 2) * sin45d, y1 + arW * sin45d + (arH / 2) * cos45d], [x1 + arW * cos45d + (arH / 2) * sin45d, y1 + arW * sin45d - (arH / 2) * cos45d], [x1, y1]]);
                    _addArrow([[x2, y2], [x2 - arW * cos45d - (arH / 2) * sin45d, y2 - arW * sin45d + (arH / 2) * cos45d], [x2 - arW * cos45d + (arH / 2) * sin45d, y2 - arW * sin45d - (arH / 2) * cos45d], [x2, y2]]);
                } else {
                    _addArrow([[x1, y1], [x1 + arW * cos45d + (arH / 2) * sin45d, y1 - arW * sin45d + (arH / 2) * cos45d], [x1 + arW * cos45d - (arH / 2) * sin45d, y1 - arW * sin45d - (arH / 2) * cos45d], [x1, y1]]);
                    _addArrow([[x2, y2], [x2 - arW * cos45d + (arH / 2) * sin45d, y2 + arW * sin45d + (arH / 2) * cos45d], [x2 - arW * cos45d - (arH / 2) * sin45d, y2 + arW * sin45d + (arH / 2) * cos45d], [x2, y2]]);
                }

                var kneeXd = isLeft ? (x2 - stopTop * cos45d) : (x2 + stopTop * cos45d);
                var kneeYd = isBottom ? (y2 + stopTop * sin45d) : (y2 - stopTop * sin45d);
                var endXd = isLeft ? (kneeXd - stopTop) : (kneeXd + stopTop);

                _addLine([x2, y2], [kneeXd, kneeYd]);
                _addLine([kneeXd, kneeYd], [endXd, kneeYd]);

                var diamLabel = '\u00d8 ' + lablW + units;
                var dTf = _addText(diamLabel, isLeft ? endXd - gap : endXd + gap, kneeYd, 0);
                if (isLeft) {
                    dTf.frame.geometricBounds = [kneeYd - dTf.height / 2, endXd - gap - dTf.width, kneeYd + dTf.height / 2, endXd - gap];
                } else {
                    dTf.frame.geometricBounds = [kneeYd - dTf.height / 2, endXd + gap, kneeYd + dTf.height / 2, endXd + gap + dTf.width];
                }

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

                if ((u.measType === 'gap_h' || u.measType === 'gap_v') || (sel.length === 2 && u.ctrl === true)) {
                    if (sel.length >= 2) {
                        var name2 = this.executeMeasure(doc, u, -1);
                        if (name2) res.push(name2);
                        return res;
                    }
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
    var win = new Window("palette", "ID Dimension v1.4", undefined, { resizeable: false });
    win.text = "ID Dimension v1.4";
    $.global.idDimensionPalette = win;

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 6;
    win.margins = 8;
    win.preferredSize.width = 240;

    // --- 1. Measurement Buttons Block ---
    var pnlMeas = win.add("group");
    pnlMeas.orientation = "row";
    pnlMeas.alignment = ["center", "top"];
    pnlMeas.spacing = 6;

    // LEFT: Gap Top/Bott & 4-Quadrant Diameters
    var grpLeftBlock = pnlMeas.add("group");
    grpLeftBlock.orientation = "column";
    grpLeftBlock.spacing = 2;
    grpLeftBlock.alignChildren = ["center", "center"];

    var rGapH = grpLeftBlock.add("group");
    rGapH.orientation = "row";
    rGapH.spacing = 2;
    var btnGapTop = rGapH.add("button", undefined, "|\u2194|\u25B2");
    btnGapTop.size = [32, 22];
    btnGapTop.helpTip = "Gap Horizontal (Top)";
    var btnGapBott = rGapH.add("button", undefined, "|\u2194|\u25BC");
    btnGapBott.size = [32, 22];
    btnGapBott.helpTip = "Gap Horizontal (Bottom)";

    var rDiam1 = grpLeftBlock.add("group");
    rDiam1.orientation = "row";
    rDiam1.spacing = 2;
    var btnDiamTl = rDiam1.add("button", undefined, "\u00D8 \u2196");
    btnDiamTl.size = [32, 22];
    btnDiamTl.helpTip = "Diameter (Top-Left)";
    var btnDiamTr = rDiam1.add("button", undefined, "\u00D8 \u2197");
    btnDiamTr.size = [32, 22];
    btnDiamTr.helpTip = "Diameter (Top-Right)";

    var rDiam2 = grpLeftBlock.add("group");
    rDiam2.orientation = "row";
    rDiam2.spacing = 2;
    var btnDiamBl = rDiam2.add("button", undefined, "\u00D8 \u2199");
    btnDiamBl.size = [32, 22];
    btnDiamBl.helpTip = "Diameter (Bottom-Left)";
    var btnDiamBr = rDiam2.add("button", undefined, "\u00D8 \u2198");
    btnDiamBr.size = [32, 22];
    btnDiamBr.helpTip = "Diameter (Bottom-Right)";

    // CENTER: Cross
    var grpCross = pnlMeas.add("group");
    grpCross.orientation = "column";
    grpCross.spacing = 2;
    grpCross.alignChildren = ["center", "center"];

    var btnTop = grpCross.add("button", undefined, "\u25B2");
    btnTop.size = [30, 22];
    btnTop.helpTip = "Top Dimension";

    var grpMid = grpCross.add("group");
    grpMid.orientation = "row";
    grpMid.spacing = 2;

    var btnLeft = grpMid.add("button", undefined, "\u25C0");
    btnLeft.size = [24, 22];
    btnLeft.helpTip = "Left Dimension";

    var btnCent = grpMid.add("button", undefined, "\u253C");
    btnCent.size = [24, 22];
    btnCent.helpTip = "Center Point";

    var btnRight = grpMid.add("button", undefined, "\u25B6");
    btnRight.size = [24, 22];
    btnRight.helpTip = "Right Dimension";

    var btnBott = grpCross.add("button", undefined, "\u25BC");
    btnBott.size = [30, 22];
    btnBott.helpTip = "Bottom Dimension";

    // RIGHT: Gap Left/Right & 4-Quadrant Radii
    var grpRightBlock = pnlMeas.add("group");
    grpRightBlock.orientation = "column";
    grpRightBlock.spacing = 2;
    grpRightBlock.alignChildren = ["center", "center"];

    var rGapV = grpRightBlock.add("group");
    rGapV.orientation = "row";
    rGapV.spacing = 2;
    var btnGapLeft = rGapV.add("button", undefined, "|\u2195|\u25C0");
    btnGapLeft.size = [32, 22];
    btnGapLeft.helpTip = "Gap Vertical (Left)";
    var btnGapRight = rGapV.add("button", undefined, "|\u2195|\u25B6");
    btnGapRight.size = [32, 22];
    btnGapRight.helpTip = "Gap Vertical (Right)";

    var rRad1 = grpRightBlock.add("group");
    rRad1.orientation = "row";
    rRad1.spacing = 2;
    var btnRadTl = rRad1.add("button", undefined, "R \u2196");
    btnRadTl.size = [32, 22];
    btnRadTl.helpTip = "Radius (Top-Left)";
    var btnRadTr = rRad1.add("button", undefined, "R \u2197");
    btnRadTr.size = [32, 22];
    btnRadTr.helpTip = "Radius (Top-Right)";

    var rRad2 = grpRightBlock.add("group");
    rRad2.orientation = "row";
    rRad2.spacing = 2;
    var btnRadBl = rRad2.add("button", undefined, "R \u2199");
    btnRadBl.size = [32, 22];
    btnRadBl.helpTip = "Radius (Bottom-Left)";
    var btnRadBr = rRad2.add("button", undefined, "R \u2198");
    btnRadBr.size = [32, 22];
    btnRadBr.helpTip = "Radius (Bottom-Right)";

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

    // Row 5: font selector
    var rFont = pnlSet.add("group");
    rFont.orientation = "row";
    rFont.add("statictext", undefined, "font:").characters = 5;
    var fontLabels = [];
    for (var fi = 0; fi < POPULAR_FONTS.length; fi++) {
        fontLabels.push(POPULAR_FONTS[fi].label);
    }
    var ddlFont = rFont.add("dropdownlist", undefined, fontLabels);
    ddlFont.selection = 0;
    ddlFont.preferredSize = [140, 20];

    // Row 6: font size & units
    var r5 = pnlSet.add("group");
    r5.orientation = "row";
    r5.add("statictext", undefined, "font size:").characters = 5;
    var txtFontSize = r5.add("edittext", undefined, "14");
    txtFontSize.characters = 4;
    r5.add("statictext", undefined, "units:").characters = 4;
    var ddlUnits = r5.add("dropdownlist", undefined, UNITS_LIST);
    ddlUnits.selection = 0;
    ddlUnits.preferredSize = [50, 20];

    // Row 7: CMYK inputs
    var r6 = pnlSet.add("group");
    r6.orientation = "row";
    r6.spacing = 3;
    r6.add("statictext", undefined, "CMYK:").characters = 4;
    var txtC = r6.add("edittext", undefined, "0"); txtC.characters = 3; txtC.helpTip = "Cyan (0-100)";
    var txtM = r6.add("edittext", undefined, "0"); txtM.characters = 3; txtM.helpTip = "Magenta (0-100)";
    var txtY = r6.add("edittext", undefined, "0"); txtY.characters = 3; txtY.helpTip = "Yellow (0-100)";
    var txtK = r6.add("edittext", undefined, "100"); txtK.characters = 3; txtK.helpTip = "Black (0-100)";

    // Row 8: Swatches
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

    // Row 9: out page, save, clear, default
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
    function getSelectedFontName() {
        var selIdx = ddlFont.selection ? ddlFont.selection.index : 0;
        return (selIdx >= 0 && selIdx < POPULAR_FONTS.length) ? POPULAR_FONTS[selIdx].name : "default";
    }

    function setSelectedFontByName(name) {
        if (!name) name = "default";
        for (var i = 0; i < POPULAR_FONTS.length; i++) {
            if (POPULAR_FONTS[i].name === name || POPULAR_FONTS[i].label === name) {
                ddlFont.selection = i;
                return;
            }
        }
        ddlFont.selection = 0;
    }

    function getUIOptions(measType, side, isCtrl) {
        var strkW = parseFloat(txtStroke.text) || 0.2;
        var gap = parseFloat(txtGap.text) || 0.5;
        var indent = parseFloat(txtIndent.text) || 1.0;
        var len = parseFloat(txtLen.text) || 10;
        var arW = parseFloat(txtArrow.text) || 3.5;
        var fontSize = parseFloat(txtFontSize.text) || 14;
        var precis = ddlPrecis.selection ? ddlPrecis.selection.index : 2;

        var c = isNaN(parseFloat(txtC.text)) ? 0 : parseFloat(txtC.text);
        var m = isNaN(parseFloat(txtM.text)) ? 0 : parseFloat(txtM.text);
        var y = isNaN(parseFloat(txtY.text)) ? 0 : parseFloat(txtY.text);
        var k = isNaN(parseFloat(txtK.text)) ? 0 : parseFloat(txtK.text);

        var uIdx = ddlUnits.selection ? ddlUnits.selection.index : 0;
        var unitStr = UNITS_LIST[uIdx] || 'mm';

        return {
            measType: measType,
            side: side || '',
            ctrl: isCtrl || false,
            strkW: strkW * Engine.PT_TO_MM,
            gap: gap * Engine.PT_TO_MM,
            stopBot: indent * Engine.PT_TO_MM,
            stopTop: len * Engine.PT_TO_MM,
            arW: arW * Engine.PT_TO_MM,
            fontSize: fontSize,
            precis: precis,
            colComp: [c, m, y, k],
            units: chkUnit.value ? unitStr : '',
            unitType: unitStr,
            scale: txtScale.text || '1:1',
            addLay: chkLayer.value,
            layName: txtLayer.text || 'layout',
            fontName: getSelectedFontName(),
            outArtboard: chkOutPage.value
        };
    }

    function applyPreset(p) {
        if (!p) return;
        chkUnit.value = !!p.add_mm;
        txtScale.text = (p.scale !== undefined) ? String(p.scale) : '1:1';
        if (p.unit_select !== undefined && p.unit_select >= 0 && p.unit_select < UNITS_LIST.length) {
            ddlUnits.selection = p.unit_select;
        }
        txtLen.text = (p.line_len !== undefined) ? String(p.line_len) : '10';
        if (p.precis !== undefined && p.precis >= 0 && p.precis < 4) {
            ddlPrecis.selection = p.precis;
        }
        txtStroke.text = (p.line_stroke !== undefined) ? String(p.line_stroke) : '0.2';
        txtGap.text = (p.gap !== undefined) ? String(p.gap) : '0.5';
        txtIndent.text = (p.line_indent !== undefined) ? String(p.line_indent) : '1.0';
        txtArrow.text = (p.arrow_width !== undefined) ? String(p.arrow_width) : '3.5';
        setSelectedFontByName(p.font_name);
        txtFontSize.text = (p.font_size !== undefined) ? String(p.font_size) : '14';
        txtC.text = (p.cyan !== undefined) ? String(p.cyan) : '0';
        txtM.text = (p.magenta !== undefined) ? String(p.magenta) : '0';
        txtY.text = (p.yellow !== undefined) ? String(p.yellow) : '0';
        txtK.text = (p.black !== undefined) ? String(p.black) : '100';
        chkLayer.value = !!p.add_layer;
        txtLayer.text = (p.layer_name_text !== undefined) ? p.layer_name_text : 'layout';
        chkOutPage.value = !!p.out_artboard;
    }

    function collectCurrentPreset() {
        return {
            add_mm: chkUnit.value,
            scale: txtScale.text,
            unit_select: ddlUnits.selection ? ddlUnits.selection.index : 0,
            line_len: parseFloat(txtLen.text) || 10,
            precis: ddlPrecis.selection ? ddlPrecis.selection.index : 2,
            line_stroke: parseFloat(txtStroke.text) || 0.2,
            gap: parseFloat(txtGap.text) || 0.5,
            line_indent: parseFloat(txtIndent.text) || 1.0,
            arrow_width: parseFloat(txtArrow.text) || 3.5,
            font_name: getSelectedFontName(),
            font_size: parseFloat(txtFontSize.text) || 14,
            cyan: parseFloat(txtC.text) || 0,
            magenta: parseFloat(txtM.text) || 0,
            yellow: parseFloat(txtY.text) || 0,
            black: parseFloat(txtK.text) || 100,
            add_layer: chkLayer.value,
            layer_name_text: txtLayer.text || 'layout',
            out_artboard: chkOutPage.value
        };
    }

    function saveCurrentState() {
        appData.lastState = collectCurrentPreset();
        savePrefs(appData);
    }

    // --- Wire Event Handlers ---
    function runMeas(measType, side, isCtrl) {
        if (app.documents.length === 0) {
            alert("Please open a document first.");
            return;
        }
        var doc = app.activeDocument;
        var sel = doc.selection || app.selection;
        if (!sel || sel.length === 0) {
            alert("Please select at least one object.");
            return;
        }

        saveCurrentState();
        var opts = getUIOptions(measType, side, isCtrl);
        var optsStr = stringifyJSON(opts);

        try {
            app.doScript("$.global.idDimensionEngine.run(" + optsStr + ");", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "ID Dimension");
        } catch (eDo) {
            Engine.run(opts);
        }
    }

    // Measurement button listeners
    btnTop.onClick = function () { runMeas('linear', 'top', false); };
    btnBott.onClick = function () { runMeas('linear', 'bott', false); };
    btnLeft.onClick = function () { runMeas('linear', 'left', false); };
    btnRight.onClick = function () { runMeas('linear', 'right', false); };
    btnCent.onClick = function () { runMeas('cent', '', false); };

    btnGapTop.onClick = function () { runMeas('gap_h', 'top', false); };
    btnGapBott.onClick = function () { runMeas('gap_h', 'bott', false); };
    btnGapLeft.onClick = function () { runMeas('gap_v', 'left', false); };
    btnGapRight.onClick = function () { runMeas('gap_v', 'right', false); };

    btnDiamTl.onClick = function () { runMeas('diam', 'tl', false); };
    btnDiamTr.onClick = function () { runMeas('diam', 'tr', false); };
    btnDiamBl.onClick = function () { runMeas('diam', 'bl', false); };
    btnDiamBr.onClick = function () { runMeas('diam', 'br', false); };

    btnRadTl.onClick = function () { runMeas('rad', 'tl', false); };
    btnRadTr.onClick = function () { runMeas('rad', 'tr', false); };
    btnRadBl.onClick = function () { runMeas('rad', 'bl', false); };
    btnRadBr.onClick = function () { runMeas('rad', 'br', false); };

    // Clear and Default listeners
    btnClear.onClick = function () {
        if (app.documents.length === 0) return;
        try {
            app.doScript("$.global.idDimensionEngine.deleteAll();", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Delete ID Dimensions");
        } catch (eClr) {
            Engine.deleteAll();
        }
    };

    btnDefault.onClick = function () {
        appData.presets = DEFAULT_PRESETS;
        appData.swatches = DEFAULT_SWATCHES;
        applyPreset(DEFAULT_PRESETS.med);
        saveCurrentState();
    };

    // Preset buttons listeners
    function handlePreset(slotKey) {
        if (chkSave.value) {
            appData.presets[slotKey] = collectCurrentPreset();
            savePrefs(appData);
        } else {
            var pr = appData.presets[slotKey] || DEFAULT_PRESETS[slotKey];
            applyPreset(pr);
            saveCurrentState();
        }
    }

    btnMin.onClick = function () { handlePreset('min'); };
    btnMed.onClick = function () { handlePreset('med'); };
    btnMax.onClick = function () { handlePreset('max'); };

    // Restore last used state
    if (appData.lastState) {
        applyPreset(appData.lastState);
    } else {
        applyPreset(DEFAULT_PRESETS.med);
    }

    // Show window
    win.show();

    } catch (eGlobal) {
        alert("ID Dimension error:\n" + eGlobal.toString() + "\nLine: " + eGlobal.line);
    }

})();
