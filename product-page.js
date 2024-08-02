// product-page.js
var IkeaProductPage = (function () {
    async function compareProductPrice(retryCount = 0) {
        try {
            const productData = getProductData();
            const comparisonResults = await IkeaPriceUtils.fetchForeignPrices(productData.id);
            const adjustedComparisonResults = comparisonResults.map(result => ({
                ...result,
                isAvailable: result.price !== null
            }));
            IkeaDisplayUtils.displayProductComparison(productData.price, adjustedComparisonResults);
        } catch (error) {
            IkeaDomUtils.handleComparisonError(error, retryCount, compareProductPrice);
        }
    }

    function getProductData() {
        const currentUrl = window.location.href;
        const currentUrlWithoutTrailingSlash = currentUrl.replace(/\/$/, '');
        const productId = currentUrlWithoutTrailingSlash.split('-').pop();
        const localPriceElement = document.querySelector('.pip-temp-price__integer');
        if (!localPriceElement) {
            throw new Error('Local price element not found');
        }
        return {
            id: productId,
            price: parseInt(localPriceElement.textContent.trim().replace(' ', ''))
        };
    }

    return {
        compareProductPrice: compareProductPrice
    };
})();