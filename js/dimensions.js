/**
 * ID Dimension v1.4 - Backend ExtendScript for Adobe InDesign (ES3 Compatible)
 * Creates measurement lines: height, width, center, radius, diameter for selected objects.
 */
//@target indesign

var IDMeasurement = (function () {
    'use strict';

    var PT_TO_MM = 2.834645668;
    var MM_TO_PT = 0.352777778;

    // --- Helpers ---
    function makeRandStr(len) {
        return ('1' + (new Date().getTime()) + Math.floor(Math.random() * 10000)).slice(0, len);
    }

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

    function getOrCreateCmykColor(doc, comp) {
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
    }

    function getOrCreateLayer(doc, layName, addLay, defaultLayer) {
        if (!addLay) {
            return defaultLayer || doc.activeLayer;
        }
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
    }

    function applyFontToTextFrame(tf, fontParam) {
        if (!tf || !fontParam || fontParam === 'default' || fontParam === '') return;
        
        var cleanParam = String(fontParam).replace(/^(ArialMT|Arial-BoldMT)/, function(m){
            return (m === 'Arial-BoldMT') ? 'Arial Bold' : 'Arial';
        });

        var baseFamily = cleanParam.split('\t')[0].replace(/\s+(Bold|Regular)$/i, '');
        var isBold = (cleanParam.toLowerCase().indexOf('bold') !== -1);

        var targetFont = null;

        // 1. Direct itemByName
        try {
            var f1 = app.fonts.itemByName(cleanParam);
            if (f1 && f1.isValid) targetFont = f1;
        } catch (e1) {}

        // 2. Try localized style variations (English / Russian / etc.)
        if (!targetFont) {
            var stylesToTry = isBold 
                ? ["Bold", "Полужирный", "Жирный", "Bold Italic", "Medium"]
                : ["Regular", "Обычный", "Roman", "Book", "Normal", "Medium", "Light"];

            for (var i = 0; i < stylesToTry.length; i++) {
                try {
                    var fTry = app.fonts.itemByName(baseFamily + "\t" + stylesToTry[i]);
                    if (fTry && fTry.isValid) {
                        targetFont = fTry;
                        break;
                    }
                } catch (eS) {}
            }
        }

        // 3. Memory-cached bulk search via everyItem (100% reliable across any language)
        if (!targetFont) {
            try {
                var allNames = app.fonts.everyItem().name;
                var allFamilies = app.fonts.everyItem().fontFamily;
                var targetLower = baseFamily.toLowerCase();
                for (var k = 0; k < allFamilies.length; k++) {
                    if (allFamilies[k] && allFamilies[k].toLowerCase() === targetLower) {
                        var candidate = app.fonts.itemByName(allNames[k]);
                        if (candidate && candidate.isValid) {
                            targetFont = candidate;
                            break;
                        }
                    }
                }
            } catch (eBulk) {}
        }

        // Apply target font to story, texts, and paragraphs
        if (targetFont) {
            try { tf.parentStory.appliedFont = targetFont; } catch(eStory) {}
            try { tf.texts[0].appliedFont = targetFont; } catch(eText) {}
            try { tf.paragraphs[0].appliedFont = targetFont; } catch(ePara) {}
        } else {
            try { tf.parentStory.appliedFont = baseFamily; } catch(eStory2) {}
            try { tf.texts[0].appliedFont = baseFamily; } catch(eText2) {}
            try { tf.paragraphs[0].appliedFont = baseFamily; } catch(ePara2) {}
        }
    }

    function isCircle(elem) {
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
    }

    // Horizontal gap between 2 elements
    function getRectByHorizGap(sel) {
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
    }

    // Vertical gap between 2 elements
    function getRectByVertGap(sel) {
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
    }

    // --- Core Measurement Execution ---
    function executeMeasure(doc, u, iterator) {
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
        var col = getOrCreateCmykColor(doc, u.colComp);
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
        var lay = getOrCreateLayer(doc, layName, addLay, defLayer);

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
            rect = getRectByHorizGap(sel);
            if (!rect) return null;
            top = rect[0];
            left = rect[1];
            bott = rect[2];
            right = rect[3];
            elW = right - left;
            elH = bott - top;
        } else if (measType === 'gap_v' || (measType === 'linear' && (side === 'left' || side === 'right'))) {
            rect = getRectByVertGap(sel);
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
        var ext = Math.max(stopBot, 2.0 * PT_TO_MM);
        var createdItems = [];

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

            applyFontToTextFrame(tf, fontName);

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

                // Stop witness lines extending past dimension line by ext
                _addLine([left, top - stopBot], [left, yPos - ext]);
                _addLine([right, top - stopBot], [right, yPos - ext]);

                if (tw < (elW - gap * 2 - arW * 3)) {
                    // Inside layout
                    _addLine([left, yPos], [midX - tw / 2 - gap, yPos]);
                    _addLine([midX + tw / 2 + gap, yPos], [right, yPos]);
                    _addArrow([[left, yPos], [left + arW, yPos - arH / 2], [left + arW, yPos + arH / 2], [left, yPos]]);
                    _addArrow([[right, yPos], [right - arW, yPos - arH / 2], [right - arW, yPos + arH / 2], [right, yPos]]);
                } else {
                    // Outside layout: continuous line between witness lines!
                    _addLine([left, yPos], [right, yPos]);
                    // Left extension & arrow pointing inwards
                    _addLine([left, yPos], [left - arW * 2, yPos]);
                    _addArrow([[left, yPos], [left - arW, yPos - arH / 2], [left - arW, yPos + arH / 2], [left, yPos]]);
                    // Right extension & arrow pointing inwards
                    _addLine([right, yPos], [right + arW * 2, yPos]);
                    _addArrow([[right, yPos], [right + arW, yPos - arH / 2], [right + arW, yPos + arH / 2], [right, yPos]]);
                    // Text to the right
                    tfInfo.frame.geometricBounds = [yPos - th / 2, right + arW * 2 + gap, yPos + th / 2, right + arW * 2 + gap + tw];
                }

            } else if (activeSide === 'bott') {
                labelText = lablW + units;
                yPos = bott + stopTop;

                tfInfo = _addText(labelText, midX, yPos, 0);
                tw = tfInfo.width;
                th = tfInfo.height;

                // Stop witness lines extending past dimension line by ext
                _addLine([left, bott + stopBot], [left, yPos + ext]);
                _addLine([right, bott + stopBot], [right, yPos + ext]);

                if (tw < (elW - gap * 2 - arW * 3)) {
                    // Inside layout
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

            } else if (activeSide === 'left') {
                labelText = lablH + units;
                xPos = left - stopTop;

                tfInfo = _addText(labelText, xPos, midY, -90);
                tw = tfInfo.width;
                th = tfInfo.height;

                // Stop witness lines extending past dimension line by ext
                _addLine([left - stopBot, top], [xPos - ext, top]);
                _addLine([left - stopBot, bott], [xPos - ext, bott]);

                if (tw < (elH - gap * 2 - arW * 3)) {
                    // Inside layout
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

            } else if (activeSide === 'right') {
                labelText = lablH + units;
                xPos = right + stopTop;

                tfInfo = _addText(labelText, xPos, midY, -90);
                tw = tfInfo.width;
                th = tfInfo.height;

                // Stop witness lines extending past dimension line by ext
                _addLine([right + stopBot, top], [xPos + ext, top]);
                _addLine([right + stopBot, bott], [xPos + ext, bott]);

                if (tw < (elH - gap * 2 - arW * 3)) {
                    // Inside layout
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
            if (!isCircle(selElem)) {
                return null;
            }
            var isLeft = (side === 'tl' || side === 'bl' || side === 'left');
            var isBottom = (side === 'br' || side === 'bl' || side === 'bott');

            var rad = elW / 2;
            var cos45 = Math.cos(Math.PI / 4);
            var sin45 = Math.sin(Math.PI / 4);

            var xr = isLeft ? (midX - rad * cos45) : (midX + rad * cos45);
            var yr = isBottom ? (midY + rad * sin45) : (midY - rad * sin45);

            // Radius line from center to circle edge
            _addLine([midX, midY], [xr, yr]);

            // Arrow at circle edge pointing outwards
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

            // Leader lines & landing shelf
            var kneeX = isLeft ? (xr - stopTop * cos45) : (xr + stopTop * cos45);
            var kneeY = isBottom ? (yr + stopTop * sin45) : (yr - stopTop * sin45);
            var endX = isLeft ? (kneeX - stopTop) : (kneeX + stopTop);
            
            _addLine([xr, yr], [kneeX, kneeY]);
            _addLine([kneeX, kneeY], [endX, kneeY]);

            // Text label
            var radLabel = 'R ' + lablR + units;
            var rTf = _addText(radLabel, isLeft ? endX - gap : endX + gap, kneeY, 0);
            if (isLeft) {
                rTf.frame.geometricBounds = [kneeY - rTf.height / 2, endX - gap - rTf.width, kneeY + rTf.height / 2, endX - gap];
            } else {
                rTf.frame.geometricBounds = [kneeY - rTf.height / 2, endX + gap, kneeY + rTf.height / 2, endX + gap + rTf.width];
            }

        } else if (measType === 'diam') {
            if (!isCircle(selElem)) {
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

            // Diameter line across circle
            _addLine([x1, y1], [x2, y2]);

            // Arrows at both ends
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
                _addArrow([[x2, y2], [x2 - arW * cos45d + (arH / 2) * sin45d, y2 + arW * sin45d + (arH / 2) * cos45d], [x2 - arW * cos45d - (arH / 2) * sin45d, y2 + arW * sin45d - (arH / 2) * cos45d], [x2, y2]]);
            }

            // Leader line & landing shelf
            var kneeXd = isLeft ? (x2 - stopTop * cos45d) : (x2 + stopTop * cos45d);
            var kneeYd = isBottom ? (y2 + stopTop * sin45d) : (y2 - stopTop * sin45d);
            var endXd = isLeft ? (kneeXd - stopTop) : (kneeXd + stopTop);

            _addLine([x2, y2], [kneeXd, kneeYd]);
            _addLine([kneeXd, kneeYd], [endXd, kneeYd]);

            // Text label
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

            // Center crosshair ticks
            _addLine([midX - N_HOR, midY], [midX + N_HOR, midY]);
            _addLine([midX, midY - N_VER], [midX, midY + N_VER]);

            // Outer extensions
            _addLine([left - N, midY], [midX - 2 * N_HOR, midY]);
            _addLine([midX + 2 * N_HOR, midY], [right + N, midY]);
            _addLine([midX, top - N], [midX, midY - 2 * N_VER]);
            _addLine([midX, midY + 2 * N_VER], [midX, bott + N]);
        }

        if (createdItems.length === 0) return null;

        var measGroup = (createdItems.length > 1) ? targetParent.groups.add(createdItems) : createdItems[0];
        var measName = makeRandStr(7);
        measGroup.name = measName;
        measGroup.label = "ID_DIMENSION_" + measName;

        return measName;
    }

    // --- Public API ---
    return {
        run: function (u) {
            if (app.documents.length === 0) return "[]";
            var doc = app.activeDocument;
            var sel = doc.selection || app.selection;
            if (!sel || sel.length === 0) return "[]";

            var origUnit = app.scriptPreferences.measurementUnit;
            var origRedraw = app.scriptPreferences.enableRedraw;

            try {
                app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
                app.scriptPreferences.enableRedraw = false;

                var res = [];

                // Dedicated Gap modes (gap_h, gap_v) or Ctrl+Click on 2 objects
                if ((u.measType === 'gap_h' || u.measType === 'gap_v') || (sel.length === 2 && u.ctrl === true)) {
                    if (sel.length >= 2) {
                        var name2 = executeMeasure(doc, u, -1);
                        if (name2) res.push(name2);
                        return stringifyJSON(res);
                    }
                }

                // Normal per-object measurement
                for (var i = 0; i < sel.length; i++) {
                    if (sel[i].name && sel[i].name.match(/\d{7}/)) continue;
                    var nameSingle = executeMeasure(doc, u, i);
                    if (nameSingle) res.push(nameSingle);
                }
                return stringifyJSON(res);

            } finally {
                app.scriptPreferences.measurementUnit = origUnit;
                app.scriptPreferences.enableRedraw = origRedraw;
            }
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

        getAllFonts: function () {
            var lines = [];
            try {
                var names = app.fonts.everyItem().name;
                var families = app.fonts.everyItem().fontFamily;
                var styles = app.fonts.everyItem().fontStyleName;
                if (names && names.length) {
                    for (var i = 0; i < names.length; i++) {
                        var n = names[i] || '';
                        var f = (families && families[i]) ? families[i] : n;
                        var s = (styles && styles[i]) ? styles[i] : '';
                        if (n) {
                            lines.push(n + '@@' + f + '@@' + s);
                        }
                    }
                }
            } catch (eAll) {}
            return lines.join('\n');
        }
    };
})();

$.global.IDMeasurement = IDMeasurement;

function stringifyJSON(obj) {
    if (typeof obj === 'string') return obj;
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

// --- Expose Global Functions for Panel CSInterface ---
function measAllSelect(u) {
    var uStr = (typeof u === 'string') ? u : stringifyJSON(u);
    try {
        return app.doScript("$.global.IDMeasurement.run(" + uStr + ");", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "ID Dimension");
    } catch (e) {
        return IDMeasurement.run(u);
    }
}

function delMeasByName(name) {
    try {
        return app.doScript("$.global.IDMeasurement.deleteByName('" + name + "');", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Delete ID Dimension");
    } catch (e) {
        return IDMeasurement.deleteByName(name);
    }
}

function delAllMeasurements() {
    try {
        return app.doScript("$.global.IDMeasurement.deleteAll();", ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Delete ID Dimensions");
    } catch (e) {
        return IDMeasurement.deleteAll();
    }
}

function getAllInstalledFonts() {
    return IDMeasurement.getAllFonts();
}
