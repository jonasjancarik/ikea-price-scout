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
            let cheapestCountry = 'Česko';
            let cheapestUrl = item.url;  // todo: this is probably undefined

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
                    cheapestUrl = result.url;
                }
            });

            optimalSavings += item.localPriceNum - cheapestPrice;
            optimalPurchaseStrategy.push({
                productName: item.productName,
                country: cheapestCountry,
                price: cheapestPrice,
                saving: item.localPriceNum - cheapestPrice,
                url: cheapestUrl,
            });
        });

        return { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy };
    }

    function generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy) {
        let html = '<h3 style="font-size: 1.35rem;">Shrnutí úspor:</h3><br>';
        html += '<strong style="font-size: 1.2rem;">Celý nákup v jedné zemi:</strong><br><br>';

        const sortedSavings = Object.entries(totalSavings).sort((a, b) => b[1] - a[1]);
        for (const [country, savings] of sortedSavings) {
            const unavailableCount = unavailableCounts[country];
            html += `<strong>${country}:</strong> <span ${savings > 0 ? 'style="color: green;"' : ''}>${savings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(savings)}</span>`;
            if (unavailableCount > 0) {
                html += ` <a href="#" class="show-unavailable" style="font-size: 0.8rem;" data-country="${country}">(${unavailableCount} ${unavailableCount === 1 ? 'položka nedostupná' : 'položky nedostupné'})</a>`;
            }
            html += '<br>';
        }
        html += `<br><strong>Maximální úspora:</strong> <span ${optimalSavings > 0 ? 'style="color: green;"' : ''}>${optimalSavings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(optimalSavings)}</span>`;
        html += '<br><br><strong style="font-size: 1.2rem;">Optimální strategie nákupu:</strong><br><br>';
        const groupedItems = {};
        optimalPurchaseStrategy.forEach(item => {
            if (!groupedItems[item.country]) {
                groupedItems[item.country] = [];
            }
            groupedItems[item.country].push(item);
        });

        for (const country in groupedItems) {
            html += `<strong>${country}:</strong><br>`;
            html += `<ul style="margin-left: 1em;">`;
            groupedItems[country].forEach(item => {
                html += `<li><a href="${item.url}" target="_blank">${item.productName}</a>:<br><span style="white-space: nowrap;">${IkeaPriceUtils.formatPrice(item.price)}</span>`
                if (country !== 'Česko') {
                    html += ` <span style="white-space: nowrap; color: green; font-size: 0.8rem;">(-${IkeaPriceUtils.formatPrice(item.saving)})</span>`;
                }
            });
            html += '';
            html += `</ul><br>`;
        }

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