var IkeaCartComparison = (function () {
    async function compareCartPrices() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        const cartItemObjects = Array.from(cartItems).map(createCartItem);
        await Promise.all(cartItemObjects.map(item => item.fetchForeignPrices()));
        const comparisonResults = cartItemObjects.map(item => ({
            localPriceNum: item.localPrice * item.quantity,
            adjustedComparisonResults: item.getComparisonData(),
            quantity: item.quantity,
            productName: item.productName
        }));
        comparisonResults.forEach((result, index) => {
            IkeaDisplayUtils.displayCartItemComparison(
                result.localPriceNum,
                result.adjustedComparisonResults,
                cartItems[index],
                result.quantity
            );
        });
        return comparisonResults;
    }

    function createCartItem(itemElement) {
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

        const nameElement = itemElement.querySelector('.cart-ingka-price-module__name-decorator');
        const descriptionElement = itemElement.querySelector('.cart-ingka-price-module__description');
        const productName = `${nameElement.textContent.trim()} - ${descriptionElement.textContent.trim()}`;

        return new CartItem(productName, productId, localPricePerItem, quantity);
    }

    return {
        compareCartPrices: compareCartPrices
    };
})();