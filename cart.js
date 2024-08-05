// cart.js
class Cart {
    constructor() {
        this.items = new Map();
    }

    async addItem(productName, productId, localPrice, quantity) {
        if (this.items.has(productId)) {
            const item = this.items.get(productId);
            item.setQuantity(item.quantity + quantity);
        } else {
            const newItem = await new ProductItem(productName, productId, localPrice, quantity);
            this.items.set(productId, newItem);
        }
    }

    removeItem(productId) {
        this.items.delete(productId);
    }

    updateItemQuantity(productId, newQuantity) {
        if (this.items.has(productId)) {
            this.items.get(productId).setQuantity(newQuantity);
        } else {
            console.error(`Item with id ${productId} not found in cart`);
        }
    }

    getItems() {
        return Array.from(this.items.values());
    }

    getTotalPrice() {
        return this.getItems().reduce((total, item) => total + item.getTotalPrice(), 0);
    }

    getComparisonData() {  // todo: rename to something more descriptive
        return this.getItems().map(item => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            localPriceForQuantity: item.getTotalPrice(),  // todo: does this have to be done here?
            otherCountries: item.getComparisonDataForQuantity()
        }));
    }
}