// main.js
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Initialize Theme Manager (InDesign UI theme sync)
    if (typeof themeManager !== 'undefined') {
        themeManager.init();
    }

    // Initialize logic modules
    if (typeof FontPicker !== 'undefined') {
        FontPicker.init();
    }
    Presets.init();
    Colors.init();
    UI.init();

    // Load user's last used configuration
    Presets.loadLastUsed();
});
