// product-page.js
var IkeaProductPage = (function () {
    async function compareProductPrice(retryCount = 0) {
        try {
            await IkeaExchangeRates.getExchangeRates();
            const productData = getProductData();
            const product = new Product(productData.id, productData.price);
            await product.fetchForeignPrices();
            const comparisonData = product.getComparisonData();

            // Apply currency conversion to comparison data
            const adjustedComparisonData = comparisonData.map(result => ({
                ...result,
                priceDiff: result.isAvailable ?
                    IkeaPriceUtils.calculatePriceDifference(product.localPrice, result) :
                    { convertedPrice: null, percentageDiff: null }
            }));

            IkeaDisplayUtils.displayProductComparison(product.localPrice, adjustedComparisonData);
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
        const localPrice = parseFloat(localPriceElement.textContent.trim().replace(/[^0-9.,]/g, '').replace(',', '.'));
        return {
            id: productId,
            price: localPrice
        };
    }

    return {
        compareProductPrice: compareProductPrice
    };
})();