// IkeaPriceUtils.ts

import { ExchangeRates } from './ExchangeRates';

interface ComparisonCountry {
    country: string;
    language: string;
    name: string;
    currencyCode: string;
}

interface ForeignPriceResult extends ComparisonCountry {
    price: string | null;
    isAvailable: boolean;
    url?: string;
}

interface PriceDifference {
    convertedPrice: number | null;
    percentageDiff: string | null;
}

export const IkeaPriceUtils = {
    comparisonCountries: [
        { country: 'pl', language: 'pl', name: 'Polsko', currencyCode: 'PLN' },
        { country: 'de', language: 'de', name: 'Německo', currencyCode: 'EUR' },
        { country: 'at', language: 'de', name: 'Rakousko', currencyCode: 'EUR' },
        { country: 'sk', language: 'sk', name: 'Slovensko', currencyCode: 'EUR' },
    ] as ComparisonCountry[],

    async fetchForeignPrices(productId: string): Promise<ForeignPriceResult[]> {
        return Promise.all(this.comparisonCountries.map(async (comp) => {
            const comparisonUrl = `https://www.ikea.com/${comp.country}/${comp.language}/p/foo-${productId}/`;
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
                return {
                    ...comp,
                    price: comparisonPriceElement.textContent?.trim() ?? null,
                    isAvailable: true,
                    url: comparisonUrl
                };
            } catch (error) {
                console.warn(`Error fetching price for ${comp.name}:`, error);
                return { ...comp, price: null, isAvailable: false };
            }
        }));
    },

    calculatePriceDifference(localPriceNum: number, result: ForeignPriceResult): PriceDifference {
        if (!result.isAvailable || result.price === null) {
            return { convertedPrice: null, percentageDiff: null };
        }
        if (typeof result.price !== 'string') {
            throw new Error('Result (other country) price is not a string');
        }
        const comparisonPriceNum = parseFloat(result.price.replace(' ', '').replace('.', '').replace(',', '.'));
        let exchangeRate = ExchangeRates.getRates()[result.currencyCode] || 1;  // TODO: investigate performance impact - we get exchange rates every time
        const convertedPrice = comparisonPriceNum * exchangeRate;
        const percentageDiff = ((convertedPrice - localPriceNum) / localPriceNum * 100).toFixed(0);
        return { convertedPrice, percentageDiff };
    },

    formatPrice(price: number | null): string {
        if (price === null) return 'N/A';
        return Math.ceil(price).toLocaleString("cs-CZ", { style: "currency", currency: "CZK" }).replace(",00", ",-");
    }
};