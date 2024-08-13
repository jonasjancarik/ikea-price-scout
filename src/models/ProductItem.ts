import { IkeaPriceUtils } from '../utils/PriceUtils.js'; // Adjust the import path as necessary

export class ProductItem {
    productName: string = '';
    id: string = '';
    localPricePerItem: number = 0;
    localPriceForQuantity: number = 0;
    quantity: number = 1;
    url: string = '';
    otherCountries: any[] = [];

    constructor(productName: string, id: string, localPrice: number, quantity: number = 1) {
        return (async () => {
            this.productName = productName;
            this.id = id;
            this.localPricePerItem = localPrice;
            this.quantity = quantity;
            this.localPriceForQuantity = localPrice * quantity;
            this.url = `https://www.ikea.com/cz/cs/p/-${this.id}`;
            await this.fetchAndCalculateOtherCountries();
            return this;
        })() as unknown as ProductItem;
    }

    async fetchAndCalculateOtherCountries() {
        const otherCountryDetails = await IkeaPriceUtils.fetchForeignPrices(this.id);
        this.otherCountries = await Promise.all(otherCountryDetails.map(async (details) => {
            const priceDiff = details.isAvailable
                ? await IkeaPriceUtils.calculatePriceDifference(this.localPricePerItem, details)
                : { convertedPrice: null, percentageDiff: null };

            const totalPrice = details.isAvailable && priceDiff.convertedPrice
                ? priceDiff.convertedPrice * this.quantity
                : null;

            return {
                ...details,
                priceDiff,
                totalPrice,
            };
        }));        
    }

    setQuantity(newQuantity: number) {
        if (newQuantity < 0 || !Number.isInteger(newQuantity)) {
            throw new Error('Quantity must be a non-negative integer');
        }
        this.quantity = newQuantity;
        this.localPriceForQuantity = this.localPricePerItem * this.quantity;
        this.updateOtherCountriesTotalPrices();
    }

    updateOtherCountriesTotalPrices() {
        this.otherCountries = this.otherCountries.map(country => ({
            ...country,
            totalPrice: country.isAvailable
                ? country.priceDiff.convertedPrice * this.quantity
                : null
        }));
    }

    getComparisonDataForQuantity() {
        return this.otherCountries.map(country => ({
            ...country,
            price: country.totalPrice !== null ? country.totalPrice.toFixed(2) : null
        }));
    }
}