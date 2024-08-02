// cart-comparison.js
var IkeaCartComparison = (function () {
    async function compareCartPrices() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        const comparisonPromises = Array.from(cartItems).map(compareCartItemPrices);
        const comparisonResults = await Promise.all(comparisonPromises);
        IkeaDisplayUtils.displayCartSummary(comparisonResults);
    }

    async function compareCartItemPrices(itemElement) {
        const productUrl = itemElement.querySelector('.cart-ingka-price-module__name a').href;
        const productId = productUrl.split('-').pop();
        const localPriceElement = itemElement.querySelector('.cart-ingka-price__sr-text');
        if (!localPriceElement) {
            throw new Error('Local price element not found');
        }
        const localPrice = localPriceElement.textContent.trim();
        // get quantity
        const quantity = parseInt(itemElement.querySelector('.cart-ingka-quantity-stepper__input').value);
        // parse localPrice
        const localPriceNum = parseFloat(localPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
        const localPricePerItem = localPriceNum / quantity;
        const comparisonResults = await IkeaPriceUtils.fetchComparisonPrices(productId);
        IkeaDisplayUtils.displayCartItemComparison(localPricePerItem, comparisonResults, itemElement);
        return { localPricePerItem, comparisonResults };
    }

    return {
        compareCartPrices: compareCartPrices
    };
})();