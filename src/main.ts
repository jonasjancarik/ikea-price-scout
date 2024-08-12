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
}

// Define types for the imported modules
type IkeaProductPageModule = typeof import('./pages/ProductPage');
type CartPageModule = typeof import('./pages/CartPage');
type CartModule = typeof import('./models/Cart');
type ExchangeRatesModule = typeof import('./utils/ExchangeRates');
type DisplayUtilsModule = typeof import('./utils/DisplayUtils');
type IkeaDomUtilsModule = typeof import('./utils/DomUtils');

export default async function initializeExtension(moduleUrls: ModuleUrls) {
    const [
        { IkeaProductPage },
        { Cart },
        { ExchangeRates },
        { DisplayUtils },
        { IkeaDomUtils },
        { CartPage },
    ]: [
            IkeaProductPageModule,
            CartModule,
            ExchangeRatesModule,
            DisplayUtilsModule,
            IkeaDomUtilsModule,
            CartPageModule
        ] = await Promise.all([
            import(moduleUrls.ProductPage),
            import(moduleUrls.Cart),
            import(moduleUrls.ExchangeRates),
            import(moduleUrls.DisplayUtils),
            import(moduleUrls.DomUtils),
            import(moduleUrls.CartPage),
        ]);

    let cartPage: InstanceType<typeof CartPage> | null = null;

    async function initializeExtension(): Promise<void> {
        console.log("Initializing extension");
        await ExchangeRates.getExchangeRates();
        if (isProductPage()) {
            initializeProductPage();
        } else if (isCartPage()) {
            initializeCartPage();
        } else {
            console.log("Not a product or cart page");
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
}