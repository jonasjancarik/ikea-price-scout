// content-script.js

(async () => {
    // Use the appropriate browser API (chrome or browser)
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    
    const moduleUrls = {
        main: browserAPI.runtime.getURL('main.js'),
        ProductPage: browserAPI.runtime.getURL('pages/ProductPage.js'),
        CartPage: browserAPI.runtime.getURL('pages/CartPage.js'),
        Cart: browserAPI.runtime.getURL('models/Cart.js'),
        ProductItem: browserAPI.runtime.getURL('models/ProductItem.js'),
        ExchangeRates: browserAPI.runtime.getURL('services/ExchangeRatesService.js'),
        DisplayUtils: browserAPI.runtime.getURL('utils/DisplayUtils.js'),
        DomUtils: browserAPI.runtime.getURL('utils/DomUtils.js'),
        PriceUtils: browserAPI.runtime.getURL('utils/PriceUtils.js'),
        ErrorUtils: browserAPI.runtime.getURL('utils/ErrorUtils.js'),
        SelectorsService: browserAPI.runtime.getURL('services/SelectorsService.js'),
        Selectors: browserAPI.runtime.getURL('selectors/selectors.json')
    };

    try {
        const main = await import(moduleUrls.main);
        main.default(moduleUrls);
    } catch (error) {
        console.error('Error loading module:', error);
    }
})();