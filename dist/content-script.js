// content-script.js

(function() {
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    const mainUrl = browserAPI.runtime.getURL('main.js');

    const script = document.createElement('script');
    script.type = 'module';
    script.src = mainUrl;
    document.head.appendChild(script);
})();