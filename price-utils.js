// price-utils.js
var IkeaPriceUtils = (function () {
    const comparisonCountries = [
        { country: 'pl', language: 'pl', name: 'Polsko', currencyCode: 'PLN' },  // TODO: rename code to countryCode, maybe name to countryName
        { country: 'de', language: 'de', name: 'Německo', currencyCode: 'EUR' },
        { country: 'at', language: 'de', name: 'Rakousko', currencyCode: 'EUR' },
        { country: 'sk', language: 'sk', name: 'Slovensko', currencyCode: 'EUR' },
    ];

    function fetchForeignPrices(productId) {  // TODO: parse strings already in this function
        return Promise.all(comparisonCountries.map(async (comp) => {
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
                    price: comparisonPriceElement.textContent.trim(),
                    isAvailable: true,
                    url: comparisonUrl
                };
            } catch (error) {
                console.warn(`Error fetching price for ${comp.name}:`, error);
                return { ...comp, price: null, isAvailable: false };
            }
        }));
    }

    function calculatePriceDifference(localPriceNum, result) {
        if (!result.isAvailable || result.price === null) {  // ideally isAvailable should be set, but just in case we also check for the price being null directly
            return { convertedPrice: null, percentageDiff: null };
        }
        // check if result price is not a string, if so raise an error
        if (typeof result.price !== 'string') {
            throw new Error('Result (other country) price is not a string');
        }
        const comparisonPriceNum = parseFloat(result.price.replace(' ', '').replace('.', '').replace(',', '.'));
        let exchangeRate = IkeaExchangeRates.getRates()[result.currencyCode] || 1;
        const convertedPrice = comparisonPriceNum * exchangeRate;
        const percentageDiff = ((convertedPrice - localPriceNum) / localPriceNum * 100).toFixed(0); // todo: toFixed is not a good way to round, use rounding function
        return { convertedPrice, percentageDiff };
    }

    function formatPrice(price) {
        if (price === null) return 'N/A';
        return Math.ceil(price).toLocaleString("cs-CZ", { style: "currency", currency: "CZK" }).replace(",00", ",-");
    }

    return {
        fetchForeignPrices: fetchForeignPrices,
        calculatePriceDifference: calculatePriceDifference,
        formatPrice: formatPrice,
        comparisonCountries: comparisonCountries
    };
})();