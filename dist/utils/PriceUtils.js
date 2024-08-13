// IkeaPriceUtils.ts
import { ExchangeRates } from './ExchangeRates.js';
export const IkeaPriceUtils = {
    comparisonCountries: [
        { country: 'pl', language: 'pl', name: 'Polsko', currencyCode: 'PLN' },
        { country: 'de', language: 'de', name: 'Německo', currencyCode: 'EUR' },
        { country: 'at', language: 'de', name: 'Rakousko', currencyCode: 'EUR' },
        { country: 'sk', language: 'sk', name: 'Slovensko', currencyCode: 'EUR' },
    ],
    async fetchForeignPrices(productId) {
        return Promise.all(this.comparisonCountries.map(async (comp) => {
            const comparisonUrl = `https://www.ikea.com/${comp.country}/${comp.language}/p/-${productId}/`;
            try {
                const response = await fetch(comparisonUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${comp.name}`);
                }
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const comparisonPriceElement = doc.querySelector('.pip-temp-price__integer');
                if (!comparisonPriceElement) {
                    return { ...comp, price: null, isAvailable: false };
                }
                let priceParsedFloat = null;
                try {
                    let priceParsed = comparisonPriceElement.textContent?.trim().replace('.', '').replace(' ', '') ?? null;
                    if (priceParsed) {
                        priceParsedFloat = parseFloat(priceParsed);
                    }
                }
                catch (error) {
                    if (error instanceof SyntaxError) {
                        console.warn(`Error parsing price for ${comp.name}:`, error);
                        return { ...comp, price: null, isAvailable: false, url: comparisonUrl };
                    }
                    else {
                        throw error;
                    }
                }
                return {
                    ...comp,
                    price: priceParsedFloat,
                    isAvailable: true,
                    url: comparisonUrl
                };
            }
            catch (error) {
                console.warn(`Error fetching price for ${comp.name}:`, error);
                return { ...comp, price: null, isAvailable: false };
            }
        }));
    },
    async calculatePriceDifference(localPriceNum, result) {
        if (!result.isAvailable || result.price === null) {
            return { convertedPrice: null, percentageDiff: null };
        }
        try {
            let exchangeRates = await ExchangeRates.getExchangeRates();
            let exchangeRate = exchangeRates[result.currencyCode] || 1;
            const convertedPrice = result.price ? result.price * exchangeRate : null;
            const percentageDiff = convertedPrice ? ((convertedPrice - localPriceNum) / localPriceNum * 100).toFixed(0) : null;
            return { convertedPrice, percentageDiff };
        }
        catch (error) {
            console.error("Error calculating price difference:", error);
            return { convertedPrice: null, percentageDiff: null };
        }
    },
    formatPrice(price) {
        if (price === null)
            return 'N/A';
        return Math.ceil(price).toLocaleString("cs-CZ", { style: "currency", currency: "CZK" }).replace(",00", ",-");
    }
};