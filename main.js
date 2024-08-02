// main.js
(function () {
    async function main() {
        await IkeaExchangeRates.getExchangeRates();
        setTimeout(comparePrice, 1000);
    }

    async function comparePrice() {
        const currentUrl = window.location.href;
        if (currentUrl.includes('/shoppingcart/')) {
            await IkeaCartComparison.compareCartPrices();
        } else {
            await IkeaProductPage.compareProductPrice();
        }
    }

    window.addEventListener('load', main);
})();