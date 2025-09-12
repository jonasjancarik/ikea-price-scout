interface ModuleUrls {
    main: string;
    ProductPage: string;
    CartPage: string;
    Cart: string;
    ExchangeRates: string;
    DisplayUtils: string;
    DomUtils: string;
    PriceUtils: string;
    ProductItem: string;
    ErrorUtils: string;
    SelectorsService: string;
    Selectors: string;
}

// Define types for the imported modules
type IkeaProductPageModule = typeof import('./pages/ProductPage');
type ExchangeRatesModule = typeof import('./services/ExchangeRatesService');
type CartPageModule = typeof import('./pages/CartPage');
type ErrorUtilsModule = typeof import('./utils/ErrorUtils');

export default async function initializeExtension(moduleUrls: ModuleUrls) {
    const [
        { IkeaProductPage },
        { ExchangeRates },
        { CartPage },
        { ErrorUtils },
    ]: [
            IkeaProductPageModule,
            ExchangeRatesModule,
            CartPageModule,
            ErrorUtilsModule,
        ] = await Promise.all([
            import(moduleUrls.ProductPage),
            import(moduleUrls.ExchangeRates),
            import(moduleUrls.CartPage),
            import(moduleUrls.ErrorUtils),
        ]);

    let cartPage: InstanceType<typeof CartPage> | null = null;

    try {
        async function initializeExtension(): Promise<void> {
            try {
                console.log("Checking if extension should be initialized");
                // Use the appropriate browser API (chrome or browser)
                const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
                const { selectedCountries } = await browserAPI.storage.sync.get(['selectedCountries']);

                if (!selectedCountries || selectedCountries.length === 0) {
                    const defaultCountries = ['pl', 'de', 'at', 'sk'];
                    await browserAPI.storage.sync.set({ selectedCountries: defaultCountries });
                    console.log('No countries selected. Default set by main.ts');
                }

                console.log("Initializing extension");
                await ExchangeRates.getExchangeRates();
                if (isProductPage()) {
                    initializeProductPage();
                } else if (isCartPage()) {
                    initializeCartPage();
                } else {
                    console.log("Not a product or cart page");
                }
            } catch (error) {
                ErrorUtils.handleError(
                    error as Error,
                    'initializeExtension',
                    'Nepodařilo se inicializovat rozšíření. Zkuste obnovit stránku nebo kontaktujte podporu.'
                );
            }
        }

        function isProductPage(): boolean {
            return window.location.pathname.includes('/p/');
        }

        function isCartPage(): boolean {
            return window.location.pathname.includes('/shoppingcart/');
        }

        function initializeProductPage(): void {
            console.log("Initializing product page functionality");
            IkeaProductPage.compareProductPrice();
        }

        function initializeCartPage(): void {
            console.log("Initializing cart page functionality");
            cartPage = new CartPage();
            cartPage.initialize();
        }

        window.addEventListener('load', initializeExtension);

        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                console.log("URL changed, calling initializeExtension");
                if (cartPage) {
                    cartPage.cleanup();
                    cartPage = null;
                }
                initializeExtension();
            }
        }).observe(document, { subtree: true, childList: true });

        console.log("Script loaded");

        // Call initializeExtension immediately
        await initializeExtension();

        const style = document.createElement('style');
        style.textContent = `
            .loading-spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    } catch (error) {
        ErrorUtils.handleError(
            error as Error,
            'main',
            'Nastala neočekávaná chyba při načítání rozšíření. Zkuste obnovit stránku nebo kontaktujte podporu.'
        );
    }

}

// Self-initialize when this module is loaded by the content script
(async () => {
    try {
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        const moduleUrls = {
            main: browserAPI.runtime.getURL('main.js'),
            ProductPage: browserAPI.runtime.getURL('pages/ProductPage.js'),
            CartPage: browserAPI.runtime.getURL('pages/CartPage.js'),
            ExchangeRates: browserAPI.runtime.getURL('services/ExchangeRatesService.js'),
            DisplayUtils: browserAPI.runtime.getURL('utils/DisplayUtils.js'),
            DomUtils: browserAPI.runtime.getURL('utils/DomUtils.js'),
            PriceUtils: browserAPI.runtime.getURL('utils/PriceUtils.js'),
            ProductItem: browserAPI.runtime.getURL('models/ProductItem.js'),
            ErrorUtils: browserAPI.runtime.getURL('utils/ErrorUtils.js'),
            SelectorsService: browserAPI.runtime.getURL('services/SelectorsService.js'),
            Selectors: browserAPI.runtime.getURL('selectors/selectors.json'),
        } as unknown as ModuleUrls;

        await initializeExtension(moduleUrls);
    } catch (e) {
        // If initialization fails, surface it in page console so tests can capture it
        console.error('Failed to initialize IKEA Price Scout main module', e);
    }
})();