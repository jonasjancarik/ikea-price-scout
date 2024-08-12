export default async function initializeExtension(moduleUrls) {
    const [{ IkeaProductPage }, { Cart }, { ExchangeRates }, { DisplayUtils }, { IkeaDomUtils }, { CartPage },] = await Promise.all([
        import(moduleUrls.ProductPage),
        import(moduleUrls.Cart),
        import(moduleUrls.ExchangeRates),
        import(moduleUrls.DisplayUtils),
        import(moduleUrls.DomUtils),
        import(moduleUrls.CartPage),
    ]);
    let cartPage = null;
    async function initializeExtension() {
        console.log("Initializing extension");
        await ExchangeRates.getExchangeRates();
        if (isProductPage()) {
            initializeProductPage();
        }
        else if (isCartPage()) {
            initializeCartPage();
        }
        else {
            console.log("Not a product or cart page");
        }
    }
    function isProductPage() {
        return window.location.pathname.includes('/p/');
    }
    function isCartPage() {
        return window.location.pathname.includes('/shoppingcart/');
    }
    function initializeProductPage() {
        console.log("Initializing product page functionality");
        IkeaProductPage.compareProductPrice();
    }
    function initializeCartPage() {
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
