// product-page.js
var IkeaProductPage = (function () {
    async function compareProductPrice(retryCount = 0) {
        try {
            const productId = window.location.href.replace(/\/$/, '').split('-').pop();
            const localPriceElement = document.querySelector('.pip-temp-price__integer');
            if (!localPriceElement) {
                throw new Error('Local price element not found');
            }
            const localPrice = parseFloat(localPriceElement.textContent.trim().replace(/[^0-9.,]/g, '').replace(',', '.'));

            const productNameElement = document.querySelector('.pip-header-section__title--big');
            if (!productNameElement) {
                throw new Error('Product name element not found');
            }
            const productName = productNameElement.textContent.trim();

            const productItem = await new ProductItem(productName, productId, localPrice, 1);

            IkeaDisplayUtils.displayProductComparison(productItem);
        } catch (error) {
            IkeaDomUtils.handleComparisonError(error, retryCount, compareProductPrice);
        }
    }

    return {
        compareProductPrice: compareProductPrice
    };
})();