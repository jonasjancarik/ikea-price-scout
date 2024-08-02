// cart-comparison.js
var IkeaCartComparison = (function () {
    async function compareCartPrices() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        const comparisonPromises = Array.from(cartItems).map(compareCartItemPrices);
        const comparisonResults = await Promise.all(comparisonPromises);
        return comparisonResults; // Return the results so we can use them in main.js
    }

    async function compareCartItemPrices(itemElement) {
        const productUrl = itemElement.querySelector('.cart-ingka-price-module__name a').href;
        const productId = productUrl.split('-').pop();
        const localPriceElement = itemElement.querySelector('.cart-ingka-price__sr-text');
        if (!localPriceElement) {
            throw new Error('Local price element not found');
        }
        const localPrice = localPriceElement.textContent.trim();
        const quantity = parseInt(itemElement.querySelector('.cart-ingka-quantity-stepper__input').value);
        const localPriceNum = parseFloat(localPrice.replace(/[^0-9.,]/g, '').replace(',', '.'));
        const localPricePerItem = localPriceNum / quantity;
        const comparisonResults = await IkeaPriceUtils.fetchForeignPrices(productId);

        const nameElement = itemElement.querySelector('.cart-ingka-price-module__name-decorator');
        const descriptionElement = itemElement.querySelector('.cart-ingka-price-module__description');
        const productName = `${nameElement.textContent.trim()} - ${descriptionElement.textContent.trim()}`;

        const adjustedComparisonResults = comparisonResults.map(result => ({
            ...result,
            price: result.price !== null
                ? (parseFloat(result.price.replace(/[^0-9.,]/g, '').replace(',', '.')) * quantity).toFixed(2)
                : null,
            isAvailable: result.price !== null
        }));

        IkeaDisplayUtils.displayCartItemComparison(localPriceNum, adjustedComparisonResults, itemElement, quantity);
        return { localPriceNum, adjustedComparisonResults, quantity, productName };
    }

    return {
        compareCartPrices: compareCartPrices
    };
})();