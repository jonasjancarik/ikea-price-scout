// content-script.js

(async function () {
    try {
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        const mainUrl = browserAPI.runtime.getURL('main.js');
        // Dynamically import the main module into the content script context to avoid CSP issues
        await import(mainUrl);
        // main.ts self-initializes when imported
        console.log('[IKEA Price Scout] main module imported');
    } catch (e) {
        console.error('[IKEA Price Scout] Failed to import main module', e);
    }
})();