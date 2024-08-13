// Cart.ts
import { ProductItem } from './ProductItem.js';
export class Cart {
    constructor() {
        this.items = new Map();
    }
    async addItem(productName, productId, localPrice, quantity) {
        if (this.items.has(productId)) {
            const item = this.items.get(productId);
            if (item) {
                item.setQuantity(item.quantity + quantity);
            }
        }
        else {
            const newItem = await new ProductItem(productName, productId, localPrice, quantity);
            this.items.set(productId, newItem);
        }
    }
    removeItem(productId) {
        this.items.delete(productId);
    }
    updateItemQuantity(productId, newQuantity) {
        const item = this.items.get(productId);
        if (item) {
            item.setQuantity(newQuantity);
        }
        else {
            console.error(`Item with id ${productId} not found in cart`);
        }
    }
    getItems() {
        return Array.from(this.items.values());
    }
    getTotalPrice() {
        return this.getItems().reduce((total, item) => total + item.localPriceForQuantity, 0);
    }
}
