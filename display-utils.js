// display-utils.js
var IkeaDisplayUtils = (function () {
    function displayProductComparison(localPrice, comparisonResults) {
        const comparisonHTML = generateComparisonHTML(localPrice, comparisonResults);
        const comparisonDiv = createComparisonDiv(comparisonHTML);
        IkeaDomUtils.insertAfterElement('.pip-temp-price-module__addons', comparisonDiv);
    }

    function displayCartItemComparison(localPrice, comparisonResults, itemElement, quantity) {
        const comparisonHTML = generateComparisonHTML(localPrice, comparisonResults, quantity);
        const comparisonDiv = createComparisonDiv(comparisonHTML, 'font-size: 0.9em;');
        IkeaDomUtils.insertAfterElement('.cart-ingka-price-module__primary-currency-price', comparisonDiv, itemElement);
    }

    function displayCartSummary(comparisonResults) {
        const { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy } = calculateSavings(comparisonResults);
        const summaryHTML = generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy);
        const summaryDiv = createSummaryDiv(summaryHTML);
        IkeaDomUtils.insertAfterElement('.checkoutInformation_checkoutInformation__Xh4rd', summaryDiv);
    }

    function generateComparisonHTML(localPrice, comparisonResults, quantity = 1) {
        let html = quantity === 1 ? '<strong>Cena v jiných zemích:</strong><br><br>' : `<strong>Cena za ${quantity} ks v jiných zemích:</strong><br><br>`;
        comparisonResults.forEach(result => {
            if (result.isAvailable) {
                const { convertedPrice, percentageDiff } = IkeaPriceUtils.calculatePriceDifference(localPrice, result);
                const formattedPrice = IkeaPriceUtils.formatPrice(convertedPrice);
                const color = percentageDiff > 0 ? 'red' : 'green';
                html += `<a href="${result.url}" target="_blank" style="color: inherit; text-decoration: none;">${result.name}</a>: <span style="color: ${color};">${formattedPrice} (${percentageDiff > 0 ? '+' : ''}${percentageDiff}%)</span><br>`;
            } else {
                html += `<span style="color: gray;">${result.name}: Nedostupné</span><br>`;
            }
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
        let unavailableCounts = {};
        let optimalPurchaseStrategy = [];

        comparisonResults.forEach(item => {
            totalLocalPrice += item.localPriceNum;

            let cheapestPrice = item.localPriceNum;
            let cheapestCountry = 'Czech Republic';

            item.adjustedComparisonResults.forEach(result => {
                if (!unavailableCounts[result.name]) {
                    unavailableCounts[result.name] = 0;
                }

                if (!result.isAvailable) {
                    unavailableCounts[result.name]++;
                    return;
                }

                const { convertedPrice } = IkeaPriceUtils.calculatePriceDifference(item.localPriceNum, result);

                if (!totalSavings[result.name]) {
                    totalSavings[result.name] = 0;
                }
                if (convertedPrice < item.localPriceNum) {
                    totalSavings[result.name] += item.localPriceNum - convertedPrice;
                }

                if (convertedPrice < cheapestPrice) {
                    cheapestPrice = convertedPrice;
                    cheapestCountry = result.name;
                }
            });

            optimalSavings += item.localPriceNum - cheapestPrice;
            optimalPurchaseStrategy.push({
                productName: item.productName,
                country: cheapestCountry,
                price: cheapestPrice,
                saving: item.localPriceNum - cheapestPrice
            });
        });

        return { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy };
    }

    function generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy) {
        let html = '<strong>Shrnutí úspor:</strong><br><br>';
        for (const [country, savings] of Object.entries(totalSavings)) {
            const unavailableCount = unavailableCounts[country];
            html += `Úspora při nákupu všeho v IKEA ${country}: ${IkeaPriceUtils.formatPrice(savings)}`;
            if (unavailableCount > 0) {
                html += ` (${unavailableCount} ${unavailableCount === 1 ? 'položka není dostupná' : 'položky nejsou dostupné'})`;
                html += ` <a href="#" class="show-unavailable" data-country="${country}">Zobrazit nedostupné položky</a>`;
            }
            html += '<br>';
        }
        html += `<br><strong>Optimální úspora při nákupu z nejlevnější země pro každý produkt: ${IkeaPriceUtils.formatPrice(optimalSavings)}</strong>`;
        html += '<br><br><strong>Optimální strategie nákupu:</strong><br>';
        optimalPurchaseStrategy.forEach(item => {
            html += `${item.productName}: Koupit v ${item.country} za ${IkeaPriceUtils.formatPrice(item.price)} (úspora ${IkeaPriceUtils.formatPrice(item.saving)})<br>`;
        });

        return html;
    }

    function attachUnavailableItemsListeners(comparisonResults) {
        document.querySelectorAll('.show-unavailable').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const country = e.target.getAttribute('data-country');
                const unavailableItems = comparisonResults
                    .filter(item => item.adjustedComparisonResults.find(result => result.name === country && !result.isAvailable))
                    .map(item => item.productName);
                alert(`Nedostupné položky v ${country}:\n\n${unavailableItems.join('\n')}`);
            });
        });
    }

    return {
        displayProductComparison: displayProductComparison,
        displayCartItemComparison: displayCartItemComparison,
        displayCartSummary: displayCartSummary,
        attachUnavailableItemsListeners: attachUnavailableItemsListeners
    };
})();