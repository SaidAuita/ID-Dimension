/**
 * FontPicker Module for ID Dimension
 * Provides fast searchable dropdown for installed fonts with persistent caching and keyboard navigation.
 */
var FontPicker = (function () {
    'use strict';

    var STORAGE_KEY_RECENT = 'id_dimension_recent_fonts';
    var STORAGE_KEY_CACHE = 'id_dimension_font_cache_v1';

    // Base popular fonts loaded immediately with zero latency
    var BASE_FONTS = [
        { label: 'Default (Minion Pro / System)', name: 'default', family: 'Default', style: 'Regular' },
        { label: 'Minion Pro Regular', name: 'MinionPro-Regular', family: 'Minion Pro', style: 'Regular' },
        { label: 'Minion Pro Bold', name: 'MinionPro-Bold', family: 'Minion Pro', style: 'Bold' },
        { label: 'Myriad Pro Regular', name: 'MyriadPro-Regular', family: 'Myriad Pro', style: 'Regular' },
        { label: 'Myriad Pro Bold Cond', name: 'MyriadPro-BoldCond', family: 'Myriad Pro', style: 'Bold Cond' },
        { label: 'Arial Regular', name: 'ArialMT', family: 'Arial', style: 'Regular' },
        { label: 'Arial Bold', name: 'Arial-BoldMT', family: 'Arial', style: 'Bold' },
        { label: 'Helvetica Regular', name: 'Helvetica', family: 'Helvetica', style: 'Regular' },
        { label: 'Helvetica Bold', name: 'Helvetica-Bold', family: 'Helvetica', style: 'Bold' },
        { label: 'Calibri Regular', name: 'Calibri', family: 'Calibri', style: 'Regular' },
        { label: 'Calibri Bold', name: 'Calibri-Bold', family: 'Calibri', style: 'Bold' },
        { label: 'Roboto Regular', name: 'Roboto-Regular', family: 'Roboto', style: 'Regular' },
        { label: 'Roboto Bold', name: 'Roboto-Bold', family: 'Roboto', style: 'Bold' },
        { label: 'Segoe UI Regular', name: 'SegoeUI', family: 'Segoe UI', style: 'Regular' },
        { label: 'Segoe UI Bold', name: 'SegoeUI-Bold', family: 'Segoe UI', style: 'Bold' },
        { label: 'Futura Bold', name: 'Futura-Bold', family: 'Futura', style: 'Bold' },
        { label: 'Times New Roman Regular', name: 'TimesNewRomanPSMT', family: 'Times New Roman', style: 'Regular' },
        { label: 'Times New Roman Bold', name: 'TimesNewRomanPS-BoldMT', family: 'Times New Roman', style: 'Bold' },
        { label: 'Trebuchet MS', name: 'TrebuchetMS', family: 'Trebuchet MS', style: 'Regular' },
        { label: 'Verdana', name: 'Verdana', family: 'Verdana', style: 'Regular' },
        { label: 'Consolas', name: 'Consolas', family: 'Consolas', style: 'Regular' }
    ];

    var allFonts = [];
    var recentFonts = [];
    var activeIndex = -1;
    var isDropdownOpen = false;

    var elements = {
        input: null,
        hidden: null,
        dropdown: null,
        list: null
    };

    function init() {
        elements.input = document.getElementById('font_search_input');
        elements.hidden = document.getElementById('font_name');
        elements.dropdown = document.getElementById('font_dropdown');
        elements.list = document.getElementById('font_list');

        if (!elements.input || !elements.hidden || !elements.dropdown || !elements.list) {
            return;
        }

        loadRecentFonts();
        loadCachedFonts();
        renderList('');

        // Bind DOM events
        elements.input.addEventListener('focus', function () {
            openDropdown();
            renderList(elements.input.value.trim());
        });

        elements.input.addEventListener('input', function () {
            openDropdown();
            renderList(elements.input.value.trim());
        });

        elements.input.addEventListener('keydown', handleKeyDown);

        // Click outside to close
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.font-picker-wrapper')) {
                closeDropdown();
            }
        });

        // Request host fonts in background
        fetchHostFonts();
    }

    function loadRecentFonts() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_RECENT);
            if (raw) {
                recentFonts = JSON.parse(raw) || [];
            }
        } catch (e) {
            recentFonts = [];
        }
    }

    function saveRecentFont(fontItem) {
        if (!fontItem || fontItem.name === 'default') return;
        recentFonts = recentFonts.filter(function (f) {
            return f.name !== fontItem.name;
        });
        recentFonts.unshift(fontItem);
        if (recentFonts.length > 5) {
            recentFonts = recentFonts.slice(0, 5);
        }
        try {
            localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentFonts));
        } catch (e) {}
    }

    function loadCachedFonts() {
        allFonts = BASE_FONTS.slice();
        try {
            var raw = localStorage.getItem(STORAGE_KEY_CACHE);
            if (raw) {
                var cached = JSON.parse(raw);
                if (cached && cached.length > 0) {
                    mergeHostFonts(cached);
                }
            }
        } catch (e) {}
    }

    function fetchHostFonts() {
        if (typeof csInterface === 'undefined' || !csInterface) return;

        csInterface.evalScript('getAllInstalledFonts()', function (result) {
            if (!result || result === 'EvalScript error.' || result === 'null' || result === '[]') {
                return;
            }
            try {
                var parsedList = [];
                var rawLines = result.split('\n');
                for (var i = 0; i < rawLines.length; i++) {
                    var line = rawLines[i].replace(/^\s+|\s+$/g, '');
                    if (!line) continue;
                    var parts = line.split('@@');
                    var psName = parts[0] || '';
                    var family = parts[1] || psName;
                    var style = parts[2] || '';
                    if (psName) {
                        var lbl = (style && style !== 'Regular') ? (family + ' ' + style) : family;
                        parsedList.push({
                            label: lbl,
                            name: psName,
                            family: family,
                            style: style || 'Regular'
                        });
                    }
                }
                if (parsedList.length > 0) {
                    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(parsedList));
                    mergeHostFonts(parsedList);
                    if (isDropdownOpen) {
                        renderList(elements.input.value.trim());
                    }
                }
            } catch (e) {}
        });
    }

    function mergeHostFonts(hostList) {
        var existingNames = {};
        allFonts = [BASE_FONTS[0]]; // Always keep Default at index 0
        existingNames['default'] = true;

        // Add base fonts
        for (var b = 1; b < BASE_FONTS.length; b++) {
            var bf = BASE_FONTS[b];
            allFonts.push(bf);
            existingNames[bf.name.toLowerCase()] = true;
            existingNames[bf.label.toLowerCase()] = true;
        }

        // Add host fonts
        for (var i = 0; i < hostList.length; i++) {
            var item = hostList[i];
            if (!item || !item.name) continue;
            var key = item.name.toLowerCase();
            if (!existingNames[key]) {
                existingNames[key] = true;
                allFonts.push(item);
            }
        }
    }

    function renderList(filterText) {
        elements.list.innerHTML = '';
        activeIndex = -1;

        var lowerFilter = filterText ? filterText.toLowerCase() : '';
        var itemsToRender = [];

        if (!lowerFilter) {
            // Show recent fonts if available
            if (recentFonts.length > 0) {
                var recentHeader = document.createElement('div');
                recentHeader.className = 'font-group-header';
                recentHeader.textContent = '⭐ Recent Fonts';
                elements.list.appendChild(recentHeader);

                for (var r = 0; r < recentFonts.length; r++) {
                    createFontElement(recentFonts[r], itemsToRender);
                }

                var allHeader = document.createElement('div');
                allHeader.className = 'font-group-header';
                allHeader.textContent = 'All Fonts';
                elements.list.appendChild(allHeader);
            }

            for (var i = 0; i < allFonts.length; i++) {
                createFontElement(allFonts[i], itemsToRender);
            }
        } else {
            // Filter fonts
            for (var j = 0; j < allFonts.length; j++) {
                var f = allFonts[j];
                if (f.label.toLowerCase().indexOf(lowerFilter) !== -1 ||
                    f.family.toLowerCase().indexOf(lowerFilter) !== -1 ||
                    f.name.toLowerCase().indexOf(lowerFilter) !== -1 ||
                    f.style.toLowerCase().indexOf(lowerFilter) !== -1) {
                    createFontElement(f, itemsToRender);
                }
            }
            if (itemsToRender.length === 0) {
                var noRes = document.createElement('div');
                noRes.className = 'font-no-results';
                noRes.textContent = 'No matching fonts found';
                elements.list.appendChild(noRes);
            }
        }
    }

    function createFontElement(fontItem, trackerArray) {
        var el = document.createElement('div');
        el.className = 'font-item';
        if (elements.hidden.value === fontItem.name) {
            el.classList.add('selected');
        }

        var labelSpan = document.createElement('span');
        labelSpan.className = 'font-item-label';
        labelSpan.textContent = fontItem.label;

        var sampleSpan = document.createElement('span');
        sampleSpan.className = 'font-item-sample';
        sampleSpan.textContent = fontItem.style || '';

        el.appendChild(labelSpan);
        el.appendChild(sampleSpan);

        el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            selectFont(fontItem);
        });

        elements.list.appendChild(el);
        trackerArray.push({ el: el, font: fontItem });
    }

    function selectFont(fontItem) {
        if (!fontItem) return;
        elements.input.value = fontItem.label;
        elements.hidden.value = fontItem.name;
        saveRecentFont(fontItem);
        closeDropdown();

        // Trigger change event
        var event = new Event('change', { bubbles: true });
        elements.hidden.dispatchEvent(event);
    }

    function setFontByName(fontName) {
        if (!fontName) fontName = 'default';
        elements.hidden.value = fontName;

        if (fontName === 'default') {
            elements.input.value = 'Default (Minion Pro / System)';
            return;
        }

        for (var i = 0; i < allFonts.length; i++) {
            if (allFonts[i].name === fontName || allFonts[i].family === fontName || allFonts[i].label === fontName) {
                elements.input.value = allFonts[i].label;
                return;
            }
        }
        elements.input.value = fontName;
    }

    function getSelectedFontName() {
        return elements.hidden ? (elements.hidden.value || 'default') : 'default';
    }

    function openDropdown() {
        if (isDropdownOpen) return;
        elements.dropdown.classList.add('open');
        isDropdownOpen = true;
    }

    function closeDropdown() {
        if (!isDropdownOpen) return;
        elements.dropdown.classList.remove('open');
        isDropdownOpen = false;
        activeIndex = -1;

        // If user typed something custom, restore label corresponding to current hidden value
        setFontByName(elements.hidden.value);
    }

    function handleKeyDown(e) {
        if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            openDropdown();
            renderList(elements.input.value.trim());
            return;
        }

        var items = elements.list.querySelectorAll('.font-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex++;
            if (activeIndex >= items.length) activeIndex = 0;
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex--;
            if (activeIndex < 0) activeIndex = items.length - 1;
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < items.length) {
                items[activeIndex].dispatchEvent(new MouseEvent('mousedown'));
            } else if (items.length > 0) {
                items[0].dispatchEvent(new MouseEvent('mousedown'));
            }
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    }

    function updateActiveItem(items) {
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
        }
        if (activeIndex >= 0 && activeIndex < items.length) {
            items[activeIndex].classList.add('active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    return {
        init: init,
        setFontByName: setFontByName,
        getSelectedFontName: getSelectedFontName
    };
})();
