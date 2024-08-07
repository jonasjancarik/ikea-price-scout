// content-script.js

(async () => {
    const moduleUrls = {
        main: chrome.runtime.getURL('main.js'),
        ProductPage: chrome.runtime.getURL('ProductPage.js'),
        Cart: chrome.runtime.getURL('Cart.js'),
        ExchangeRates: chrome.runtime.getURL('ExchangeRates.js'),
        DisplayUtils: chrome.runtime.getURL('DisplayUtils.js'),
        DomUtils: chrome.runtime.getURL('DomUtils.js'),
        PriceUtils: chrome.runtime.getURL('PriceUtils.js'),
        ProductItem: chrome.runtime.getURL('ProductItem.js')
    };

    const main = await import(moduleUrls.main);
    main.default(moduleUrls);
})();