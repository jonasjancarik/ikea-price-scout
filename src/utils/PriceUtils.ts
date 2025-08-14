// IkeaPriceUtils.ts

import { ExchangeRates } from '../services/ExchangeRatesService.js';
import { SelectorsService } from '../services/SelectorsService.js';
const currencyMapping: { [key: string]: string } = {
    "Puerto Rico": "USD",
    "United Arab Emirates": "AED",
    "Hong Kong": "HKD",
    "Dominican Republic": "USD",
    "Canada": "CAD",
    "Morocco": "MAD",
    "Poland": "PLN",
    "Jordan": "JOD",
    "Czech Republic": "CZK",
    "Thailand": "THB",
    "United Kingdom": "GBP",
    "Switzerland": "CHF",
    "Serbia": "RSD",
    "Belgium": "EUR",
    "Bahrain": "BHD",
    "Hungary": "HUF",
    "Greece": "EUR",
    "Indonesia": "IDR",
    "Egypt": "EGP",
    "United States": "USD",
    "Slovakia": "EUR",
    "Sweden": "SEK",
    "Singapore": "SGD",
    "Philippines": "PHP",
    "Portugal": "EUR",
    "Denmark": "DKK",
    "Iceland": "ISK",
    "Bulgaria": "BGN",
    "Turkey": "TRY",
    "Lithuania": "EUR",
    "Japan": "JPY",
    "Cyprus": "EUR",
    "New Zealand": "NZD",
    "Australia": "AUD",
    "China": "CNY",
    "Saudi Arabia": "SAR",
    "Kuwait": "KWD",
    "South Korea": "KRW",
    "Finland": "EUR",
    "Spain": "EUR",
    "Croatia": "EUR",
    "Norway": "NOK",
    "Qatar": "QAR",
    "Israel": "ILS",
    "Oman": "OMR",
    "Germany": "EUR",
    "Estonia": "EUR",
    "Latvia": "EUR",
    "Slovenia": "EUR",
    "Malaysia": "MYR",
    "Taiwan": "TWD",
    "Romania": "RON",
    "Ireland": "EUR",
    "Italy": "EUR",
    "France": "EUR",
    "Austria": "EUR",
    "Ukraine": "UAH",
    "Mexico": "MXN",
    "India": "INR",
    "Netherlands": "EUR",
    "Chile": "CLP",
    "Colombia": "COP"
};

interface StoredCountry {
    country: string;
    language: string;
    url: string;
    isHome?: boolean;
}

interface ComparisonCountry {
    country: string;
    language: string;
    name: string;
    currencyCode: string;
}

interface ForeignPriceResult extends ComparisonCountry {
    price: number | null;
    isAvailable: boolean;
    url?: string;
}

interface PriceDifference {
    convertedPrice: number | null;
    percentageDiff: string | null;
}

export const IkeaPriceUtils = {
    async getSelectedCountries(): Promise<ComparisonCountry[]> {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['selectedCountries'], (result) => {
                if (result.selectedCountries && Array.isArray(result.selectedCountries)) {
                    // Filter out home country and map to comparison countries
                    const comparisonCountries = result.selectedCountries
                        .filter((stored: StoredCountry) => !stored.isHome)
                        .map((stored: StoredCountry) => ({
                            country: this.extractCountryCode(stored.url),
                            language: stored.language,
                            name: stored.country,
                            currencyCode: currencyMapping[stored.country] || 'EUR'
                        }));
                    resolve(comparisonCountries);
                } else {
                    // No countries selected - return empty array
                    // User needs to configure countries via popup
                    resolve([]);
                }
            });
        });
    },

    extractCountryCode(url: string): string {
        // Extract country code from URL like https://www.ikea.com/de/de/ -> de
        const match = url.match(/\/([a-z]{2})\/[a-z]{2}\//);
        return match ? match[1] : 'cz';
    },

    async fetchForeignPrices(productId: string): Promise<ForeignPriceResult[]> {
        const selectors = await SelectorsService.getSelectors();
        const comparisonCountries = await this.getSelectedCountries();
        
        return Promise.all(comparisonCountries.map(async (comp) => {
            const comparisonUrl = `https://www.ikea.com/${comp.country}/${comp.language}/p/-${productId}/`;
            try {
                const response = await fetch(comparisonUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${comp.name}`);
                }
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const comparisonPriceElement = doc.querySelector(selectors.productPage.priceInteger);
                if (!comparisonPriceElement) {
                    return { ...comp, price: null, isAvailable: false };
                }
                let priceParsedFloat = null;
                try {
                    let priceParsed = comparisonPriceElement.textContent?.trim().replace('.', '').replace(' ', '') ?? null;
                    if (priceParsed) {
                        priceParsedFloat = parseFloat(priceParsed);
                    }
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        console.warn(`Error parsing price for ${comp.name}:`, error);
                        return { ...comp, price: null, isAvailable: false, url: comparisonUrl };
                    } else {
                        throw error;
                    }
                }
                
                return {
                    ...comp,
                    price: priceParsedFloat,
                    isAvailable: true,
                    url: comparisonUrl
                };
            } catch (error) {
                console.warn(`Error fetching price for ${comp.name}:`, error);
                return { ...comp, price: null, isAvailable: false };
            }
        }));
    },

    async calculatePriceDifference(localPriceNum: number, result: ForeignPriceResult): Promise<PriceDifference> {
        if (!result.isAvailable || result.price === null) {
            return { convertedPrice: null, percentageDiff: null };
        }
        try {
            let exchangeRates = await ExchangeRates.getExchangeRates();
            let exchangeRate = exchangeRates[result.currencyCode] || 1;
            const convertedPrice = result.price ? result.price * exchangeRate : null;
            const percentageDiff = convertedPrice ? ((convertedPrice - localPriceNum) / localPriceNum * 100).toFixed(0) : null;
            return { convertedPrice, percentageDiff };
        } catch (error) {
            console.error("Error calculating price difference:", error);
            return { convertedPrice: null, percentageDiff: null };
        }
    },

    formatPrice(price: number | null): string {
        if (price === null) return 'N/A';
        return Math.ceil(price).toLocaleString("cs-CZ", { style: "currency", currency: "CZK" }).replace(",00", ",-");
    }
};