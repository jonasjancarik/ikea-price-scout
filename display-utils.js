// display-utils.js
var IkeaDisplayUtils = (function () {
    function displayProductComparison(localPrice, comparisonResults) {
        const comparisonHTML = generateComparisonHTML(localPrice, comparisonResults);
        const comparisonDiv = createComparisonDiv(comparisonHTML);
        IkeaDomUtils.insertAfterElement('.pip-temp-price-module__addons', comparisonDiv);
    }

    function displayCartItemComparison(localPrice, comparisonResults, itemElement) {
        const comparisonHTML = generateComparisonHTML(localPrice, comparisonResults);
        const comparisonDiv = createComparisonDiv(comparisonHTML, 'font-size: 0.9em;');
        IkeaDomUtils.insertAfterElement('.cart-ingka-price-module__primary-currency-price', comparisonDiv, itemElement);
    }

    function displayCartSummary(comparisonResults) {
        const { totalSavings, optimalSavings } = calculateSavings(comparisonResults);
        const summaryHTML = generateSummaryHTML(totalSavings, optimalSavings);
        const summaryDiv = createSummaryDiv(summaryHTML);
        IkeaDomUtils.insertAfterElement('.checkoutInformation_checkoutInformation__Xh4rd', summaryDiv);
    }

    function generateComparisonHTML(localPrice, comparisonResults) {
        let html = '<strong>Cena v jiných zemích:</strong><br><br>';
        comparisonResults.forEach(result => {
            const { convertedPrice, percentageDiff } = IkeaPriceUtils.calculatePriceDifference(localPrice, result);
            const formattedPrice = IkeaPriceUtils.formatPrice(convertedPrice);
            const color = percentageDiff > 0 ? 'red' : 'green';
            html += `<a href="${result.url}" target="_blank" style="color: inherit; text-decoration: none;">${result.name}</a>: <span style="color: ${color};">${formattedPrice} (${percentageDiff > 0 ? '+' : ''}${percentageDiff}%)</span><br>`;
        });
        return html;
    }

    function createComparisonDiv(html, additionalStyles = '') {
        const div = document.createElement('div');
        div.style.cssText = `background-color: #f0f0f0; padding: 10px; margin-top: 10px; border-radius: 5px; ${additionalStyles}`;
        div.innerHTML = html;
        return div;
    }

    function createSummaryDiv(html) {
        const div = document.createElement('div');
        div.style.cssText = 'background-color: #e6f7ff; padding: 15px; margin-top: 20px; border-radius: 5px; font-size: 1.1em;';
        div.innerHTML = html;
        return div;
    }

    function calculateSavings(comparisonResults) {
        let totalLocalPrice = 0;
        let totalSavings = {};
        let optimalSavings = 0;

        comparisonResults.forEach(item => {
            totalLocalPrice += item.localPricePerItem;

            let cheapestPrice = item.localPricePerItem;
            item.comparisonResults.forEach(result => {
                const { convertedPrice } = IkeaPriceUtils.calculatePriceDifference(item.localPricePerItem, result);

                if (!totalSavings[result.name]) {
                    totalSavings[result.name] = 0;
                }
                if (convertedPrice < item.localPricePerItem) {
                    totalSavings[result.name] += item.localPricePerItem - convertedPrice;
                }

                if (convertedPrice < cheapestPrice) {
                    cheapestPrice = convertedPrice;
                }
            });

            optimalSavings += item.localPricePerItem - cheapestPrice;
        });

        return { totalSavings, optimalSavings };
    }

    function generateSummaryHTML(totalSavings, optimalSavings) {
        let html = '<strong>Shrnutí úspor:</strong><br><br>';
        for (const [country, savings] of Object.entries(totalSavings)) {
            html += `Úspora při nákupu v ${country}: ${IkeaPriceUtils.formatPrice(savings)}<br>`;
        }
        html += `<br><strong>Optimální úspora při nákupu z nejlevnější země pro každý produkt: ${IkeaPriceUtils.formatPrice(optimalSavings)}</strong>`;
        return html;
    }

    return {
        displayProductComparison: displayProductComparison,
        displayCartItemComparison: displayCartItemComparison,
        displayCartSummary: displayCartSummary
    };
})();