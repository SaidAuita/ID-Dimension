/**
 * FontPicker Module for ID Dimension
 * Provides curated popular font picker with instant search, recent fonts, and keyboard navigation.
 */
var FontPicker = (function () {
    'use strict';

    var STORAGE_KEY_RECENT = 'id_dimension_recent_fonts';

    // Curated popular fonts
    var POPULAR_FONTS = [
        { label: 'Default (Minion Pro / System)', name: 'default', family: 'Default', style: 'Regular' },
        { label: 'Arial', name: 'Arial', family: 'Arial', style: 'Regular' },
        { label: 'Arial Bold', name: 'Arial Bold', family: 'Arial', style: 'Bold' },
        { label: 'Calibri', name: 'Calibri', family: 'Calibri', style: 'Regular' },
        { label: 'Calibri Bold', name: 'Calibri Bold', family: 'Calibri', style: 'Bold' },
        { label: 'Century Gothic', name: 'Century Gothic', family: 'Century Gothic', style: 'Regular' },
        { label: 'Consolas', name: 'Consolas', family: 'Consolas', style: 'Regular' },
        { label: 'Courier New', name: 'Courier New', family: 'Courier New', style: 'Regular' },
        { label: 'Futura', name: 'Futura', family: 'Futura', style: 'Regular' },
        { label: 'Helvetica', name: 'Helvetica', family: 'Helvetica', style: 'Regular' },
        { label: 'Minion Pro', name: 'Minion Pro', family: 'Minion Pro', style: 'Regular' },
        { label: 'Minion Pro Bold', name: 'Minion Pro Bold', family: 'Minion Pro', style: 'Bold' },
        { label: 'Myriad Pro', name: 'Myriad Pro', family: 'Myriad Pro', style: 'Regular' },
        { label: 'Myriad Pro Bold', name: 'Myriad Pro Bold', family: 'Myriad Pro', style: 'Bold' },
        { label: 'Roboto', name: 'Roboto', family: 'Roboto', style: 'Regular' },
        { label: 'Segoe UI', name: 'Segoe UI', family: 'Segoe UI', style: 'Regular' },
        { label: 'Times New Roman', name: 'Times New Roman', family: 'Times New Roman', style: 'Regular' },
        { label: 'Times New Roman Bold', name: 'Times New Roman Bold', family: 'Times New Roman', style: 'Bold' },
        { label: 'Trebuchet MS', name: 'Trebuchet MS', family: 'Trebuchet MS', style: 'Regular' },
        { label: 'Verdana', name: 'Verdana', family: 'Verdana', style: 'Regular' }
    ];

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

    function renderList(query) {
        if (!elements.list) return;
        elements.list.innerHTML = '';
        activeIndex = -1;

        query = (query || '').toLowerCase();

        var filtered = POPULAR_FONTS.filter(function (f) {
            if (!query) return true;
            return f.label.toLowerCase().indexOf(query) !== -1 ||
                   f.name.toLowerCase().indexOf(query) !== -1 ||
                   f.family.toLowerCase().indexOf(query) !== -1;
        });

        // 1. Recent section (only when not searching)
        if (!query && recentFonts.length > 0) {
            var headerRecent = document.createElement('div');
            headerRecent.className = 'font-group-header';
            headerRecent.textContent = '⭐ Recent Fonts';
            elements.list.appendChild(headerRecent);

            recentFonts.forEach(function (rf) {
                var item = createFontItemElement(rf);
                elements.list.appendChild(item);
            });

            var headerAll = document.createElement('div');
            headerAll.className = 'font-group-header';
            headerAll.textContent = 'Popular Fonts';
            elements.list.appendChild(headerAll);
        }

        if (filtered.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'font-empty';
            empty.textContent = 'No matching fonts';
            elements.list.appendChild(empty);
            return;
        }

        filtered.forEach(function (f) {
            var item = createFontItemElement(f);
            elements.list.appendChild(item);
        });
    }

    function createFontItemElement(fontObj) {
        var el = document.createElement('div');
        el.className = 'font-item';
        if (elements.hidden && elements.hidden.value === fontObj.name) {
            el.classList.add('selected');
        }
        el.dataset.fontName = fontObj.name;
        el.dataset.fontLabel = fontObj.label;

        var nameSpan = document.createElement('span');
        nameSpan.className = 'font-item-name';
        nameSpan.textContent = fontObj.label;
        nameSpan.style.fontFamily = '"' + fontObj.family + '", sans-serif';

        var styleSpan = document.createElement('span');
        styleSpan.className = 'font-item-style';
        styleSpan.textContent = fontObj.style || '';

        el.appendChild(nameSpan);
        el.appendChild(styleSpan);

        el.addEventListener('mousedown', function (e) {
            e.preventDefault();
            selectFont(fontObj);
        });

        return el;
    }

    function selectFont(fontObj) {
        if (!fontObj) return;
        if (elements.hidden) elements.hidden.value = fontObj.name;
        if (elements.input) elements.input.value = fontObj.label;
        saveRecentFont(fontObj);
        closeDropdown();

        if (typeof Presets !== 'undefined' && Presets.saveCurrentState) {
            Presets.saveCurrentState();
        }
    }

    function setSelectedFont(fontName) {
        if (!fontName) fontName = 'default';
        var found = null;
        for (var i = 0; i < POPULAR_FONTS.length; i++) {
            if (POPULAR_FONTS[i].name === fontName || POPULAR_FONTS[i].label === fontName || POPULAR_FONTS[i].family === fontName) {
                found = POPULAR_FONTS[i];
                break;
            }
        }
        if (!found) {
            for (var r = 0; r < recentFonts.length; r++) {
                if (recentFonts[r].name === fontName) {
                    found = recentFonts[r];
                    break;
                }
            }
        }
        if (!found) {
            found = { label: fontName, name: fontName, family: fontName, style: '' };
        }

        if (elements.hidden) elements.hidden.value = found.name;
        if (elements.input) elements.input.value = found.label;
    }

    function getSelectedFontName() {
        return elements.hidden ? elements.hidden.value : 'default';
    }

    function openDropdown() {
        if (elements.dropdown) {
            elements.dropdown.classList.add('open');
            isDropdownOpen = true;
        }
    }

    function closeDropdown() {
        if (elements.dropdown) {
            elements.dropdown.classList.remove('open');
            isDropdownOpen = false;
        }
        activeIndex = -1;
    }

    function handleKeyDown(e) {
        if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            openDropdown();
            renderList(elements.input.value.trim());
            return;
        }

        var items = elements.list ? elements.list.querySelectorAll('.font-item') : [];
        if (!items || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < items.length) {
                var selectedItem = items[activeIndex];
                var fName = selectedItem.dataset.fontName;
                var fLabel = selectedItem.dataset.fontLabel;
                selectFont({ name: fName, label: fLabel, family: fLabel });
            } else if (items.length > 0) {
                var firstItem = items[0];
                selectFont({ name: firstItem.dataset.fontName, label: firstItem.dataset.fontLabel, family: firstItem.dataset.fontLabel });
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
        setSelectedFont: setSelectedFont,
        getSelectedFontName: getSelectedFontName
    };
})();
