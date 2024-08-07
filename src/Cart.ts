// Cart.ts

import { ProductItem } from './ProductItem.js';

export class Cart {
    private items: Map<string, ProductItem>;

    constructor() {
        this.items = new Map();
    }

    async addItem(productName: string, productId: string, localPrice: number, quantity: number): Promise<void> {
        if (this.items.has(productId)) {
            const item = this.items.get(productId);
            if (item) {
                item.setQuantity(item.quantity + quantity);
            }
        } else {
            const newItem = await new ProductItem(productName, productId, localPrice, quantity);
            this.items.set(productId, newItem);
        }
    }

    removeItem(productId: string): void {
        this.items.delete(productId);
    }

    updateItemQuantity(productId: string, newQuantity: number): void {
        const item = this.items.get(productId);
        if (item) {
            item.setQuantity(newQuantity);
        } else {
            console.error(`Item with id ${productId} not found in cart`);
        }
    }

    getItems(): ProductItem[] {
        return Array.from(this.items.values());
    }

    getTotalPrice(): number {
        return this.getItems().reduce((total, item) => total + item.getTotalPrice(), 0);
    }

    getComparisonData() {
        return this.getItems().map(item => ({
            id: item.id,
            productName: item.productName,
            quantity: item.quantity,
            localPriceForQuantity: item.getTotalPrice(),
            otherCountries: item.getComparisonDataForQuantity()
        }));
    }
}