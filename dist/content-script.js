// content-script.js

(async () => {
    const moduleUrls = {
        main: chrome.runtime.getURL('main.js'),
        ProductPage: chrome.runtime.getURL('pages/ProductPage.js'),
        CartPage: chrome.runtime.getURL('pages/CartPage.js'),
        Cart: chrome.runtime.getURL('models/Cart.js'),
        ProductItem: chrome.runtime.getURL('models/ProductItem.js'),
        ExchangeRates: chrome.runtime.getURL('services/ExchangeRatesService.js'),
        DisplayUtils: chrome.runtime.getURL('utils/DisplayUtils.js'),
        DomUtils: chrome.runtime.getURL('utils/DomUtils.js'),
        PriceUtils: chrome.runtime.getURL('utils/PriceUtils.js'),
        ErrorUtils: chrome.runtime.getURL('utils/ErrorUtils.js'),
        SelectorsService: chrome.runtime.getURL('services/SelectorsService.js'),
        Selectors: chrome.runtime.getURL('selectors/selectors.json')
    };

    const main = await import(moduleUrls.main);
    main.default(moduleUrls);
})();