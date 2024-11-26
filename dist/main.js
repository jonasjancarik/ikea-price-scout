export default async function initializeExtension(moduleUrls) {
    const [{ IkeaProductPage }, { ExchangeRates }, { CartPage }, { ErrorUtils }, { SelectorsService },] = await Promise.all([
        import(moduleUrls.ProductPage),
        import(moduleUrls.ExchangeRates),
        import(moduleUrls.CartPage),
        import(moduleUrls.ErrorUtils),
        import(moduleUrls.SelectorsService),
    ]);
    let cartPage = null;
    try {
        async function initializeExtension() {
            try {
                console.log("Checking if extension should be initialized");
                const { selectedCountries } = await chrome.storage.sync.get(['selectedCountries']);
                if (!selectedCountries || selectedCountries.length === 0) {
                    console.log("No countries selected. Extension will not run.");
                    return;
                }
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
            catch (error) {
                ErrorUtils.handleError(error, 'initializeExtension', 'Nepodařilo se inicializovat rozšíření. Zkuste obnovit stránku nebo kontaktujte podporu.');
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
    }
    catch (error) {
        ErrorUtils.handleError(error, 'main', 'Nastala neočekávaná chyba při načítání rozšíření. Zkuste obnovit stránku nebo kontaktujte podporu.');
    }
}
