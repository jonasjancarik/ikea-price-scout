import { IkeaPriceUtils } from './PriceUtils'; // Adjust the import path as necessary

export class ProductItem {
    productName: string;
    id: string;
    localPricePerItem: number;
    quantity: number;
    url: string;
    otherCountries: any[];

    constructor(productName: string, id: string, localPrice: number, quantity: number = 1) {
        return (async () => {
            this.productName = productName;
            this.id = id;
            this.localPricePerItem = localPrice;
            this.quantity = quantity;
            this.url = `https://www.ikea.com/cz/cs/p/-${this.id}`;
            await this.fetchAndCalculateOtherCountries();
            return this;
        })() as unknown as ProductItem;
    }

    async fetchAndCalculateOtherCountries() {
        const otherCountryDetails = await IkeaPriceUtils.fetchForeignPrices(this.id);
        this.otherCountries = otherCountryDetails.map(details => ({
            ...details,
            priceDiff: details.isAvailable
                ? IkeaPriceUtils.calculatePriceDifference(this.localPricePerItem, details)
                : { convertedPrice: null, percentageDiff: null },
            totalPrice: details.isAvailable
                ? IkeaPriceUtils.calculatePriceDifference(this.localPricePerItem, details).convertedPrice * this.quantity
                : null
        }));
    }

    setQuantity(newQuantity: number) {
        if (newQuantity < 0 || !Number.isInteger(newQuantity)) {
            throw new Error('Quantity must be a non-negative integer');
        }
        this.quantity = newQuantity;
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

    getTotalPrice() {
        return this.localPricePerItem * this.quantity;
    }

    getComparisonDataForQuantity() {
        return this.otherCountries.map(country => ({
            ...country,
            price: country.totalPrice !== null ? country.totalPrice.toFixed(2) : null
        }));
    }
}