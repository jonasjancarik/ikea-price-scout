var IkeaCartComparison = (function () {
    async function compareCartPrices() {
        const cartItemElements = document.querySelectorAll('.product_product__pvcUf');
        const cartItemObjects = await Promise.all(Array.from(cartItemElements).map(createCartItem));
        await Promise.all(cartItemObjects.map(item => item.fetchForeignPrices()));
        const cartItems = cartItemObjects.map(item => ({
            localPriceForQuantity: item.localPrice * item.quantity,
            otherCountries: item.getComparisonData(),  // this will have amounts multiplied by quantity
            quantity: item.quantity,
            productName: item.productName,
            product: item.product
        }));
        return cartItems;
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