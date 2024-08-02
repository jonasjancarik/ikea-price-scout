// price-utils.js
var IkeaPriceUtils = (function () {
    const comparisonCountries = [
        { country: 'pl', language: 'pl', name: 'Polsko', currencyCode: 'PLN' },
        { country: 'de', language: 'de', name: 'Německo', currencyCode: 'EUR' }
    ];

    function fetchComparisonPrices(productId) {
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
                    throw new Error(`Price element not found for ${comp.name}`);
                }
                return {
                    ...comp,
                    price: comparisonPriceElement.textContent.trim(),
                    url: comparisonUrl
                };
            } catch (error) {
                console.warn(`Error fetching price for ${comp.name}:`, error);
                return null;
            }
        })).then(results => results.filter(Boolean));
    }

    function calculatePriceDifference(localPriceNum, result) {
        const comparisonPriceNum = parseFloat(result.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
        let exchangeRate = IkeaExchangeRates.getRates()[result.currencyCode] || 1;
        const convertedPrice = comparisonPriceNum * exchangeRate;
        const percentageDiff = ((convertedPrice - localPriceNum) / localPriceNum * 100).toFixed(1);
        return { convertedPrice, percentageDiff };
    }

    function formatPrice(price) {
        return Math.ceil(price).toLocaleString("cs-CZ", { style: "currency", currency: "CZK" }).replace(",00", ",-");
    }

    return {
        fetchComparisonPrices: fetchComparisonPrices,
        calculatePriceDifference: calculatePriceDifference,
        formatPrice: formatPrice,
        comparisonCountries: comparisonCountries
    };
})();