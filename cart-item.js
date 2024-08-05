class CartItem {
    constructor(productName, productId, localPrice, quantity) {
        return (async () => {
            this.productName = productName;
            this.productId = productId;
            this.localPrice = localPrice;
            this.quantity = quantity;
            this.product = await new Product(productId, localPrice);
            return this
        })();
    }

    async fetchForeignPrices() {
        await this.product.fetchForeignPrices();
    }

    getComparisonData() {
        return this.product.getComparisonData().map(result => ({
            ...result,
            price: result.price !== null
                ? (parseFloat(result.price.replace(/[^0-9.,]/g, '').replace(',', '.')) * this.quantity).toFixed(2)
                : null
        }));
    }
}