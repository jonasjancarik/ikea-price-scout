// Simple browser polyfill for cross-browser compatibility
// This provides a unified API for both Chrome and Firefox

(function() {
    'use strict';

    // If browser API already exists (Firefox), use it
    if (typeof browser !== 'undefined') {
        window.chrome = browser;
        return;
    }

    // If chrome API exists but not browser (Chromium), create browser alias
    if (typeof chrome !== 'undefined') {
        window.browser = chrome;
        return;
    }

    // Fallback for edge cases
    console.error('No browser extension API found');
})(); 