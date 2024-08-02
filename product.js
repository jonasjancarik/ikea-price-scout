class Product {
    constructor(id, localPrice) {
        this.id = id;
        this.localPrice = localPrice;
        this.foreignPrices = [];
    }

    async fetchForeignPrices() {
        this.foreignPrices = await IkeaPriceUtils.fetchForeignPrices(this.id);
        return this.foreignPrices;
    }

    getComparisonData() {
        return this.foreignPrices.map(result => ({
            ...result,
            isAvailable: result.price !== null,
            priceDiff: result.isAvailable ?
                IkeaPriceUtils.calculatePriceDifference(this.localPrice, result) :
                { convertedPrice: null, percentageDiff: null }
        }));
    }
}