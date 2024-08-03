// display-utils.js
var IkeaDisplayUtils = (function () {
    function updateCartComparisons(comparisonResults) {
        console.log("Updating cart comparisons");
        updateCartItemComparisons(comparisonResults);
        updateCartSummary(comparisonResults);
    }

    function updateCartItemComparisons(comparisonResults) {
        console.log("Updating cart item comparisons");
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        console.log("Found", cartItems.length, "cart items");
        comparisonResults.forEach((result, index) => {
            const itemElement = cartItems[index];
            if (itemElement && result) {
                console.log("Updating comparison for item", index);
                const comparisonHTML = generateComparisonHTML(result.localPriceNum, result.adjustedComparisonResults, result.quantity);
                let comparisonDiv = itemElement.querySelector('.ikea-price-comparison');
                if (!comparisonDiv) {
                    console.log("Creating new comparison div for item", index);
                    comparisonDiv = createComparisonDiv(comparisonHTML, 'font-size: 0.9em;');
                    comparisonDiv.classList.add('ikea-price-comparison');
                    IkeaDomUtils.insertAfterElement('.cart-ingka-price-module__primary-currency-price', comparisonDiv, itemElement);
                } else {
                    console.log("Updating existing comparison div for item", index);
                    comparisonDiv.innerHTML = comparisonHTML;
                }
            } else {
                console.log("No comparison result or item element for item", index);
            }
        });
    }

    function updateCartSummary(comparisonResults) {
        console.log("Updating cart summary");
        const { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy } = calculateSavings(comparisonResults);
        const summaryHTML = generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy);

        let summaryDiv = document.querySelector('#ikea-price-comparison-summary');
        if (!summaryDiv) {
            console.log("Creating new summary div");
            summaryDiv = createSummaryDiv(summaryHTML);
            summaryDiv.id = 'ikea-price-comparison-summary';
            IkeaDomUtils.insertAfterElement('.checkoutInformation_checkoutInformation__Xh4rd', summaryDiv);
        } else {
            console.log("Updating existing summary div");
            summaryDiv.innerHTML = summaryHTML;
        }

        attachUnavailableItemsListeners(comparisonResults);
    }

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
            const itemTotalLocalPrice = item.localPriceNum * item.quantity;
            totalLocalPrice += itemTotalLocalPrice;

            let cheapestPrice = itemTotalLocalPrice;
            let cheapestCountry = 'Česko';
            let cheapestUrl = item.url;

            item.adjustedComparisonResults.forEach(result => {
                if (!unavailableCounts[result.name]) {
                    unavailableCounts[result.name] = 0;
                }

                if (!result.isAvailable) {
                    unavailableCounts[result.name]++;
                    return;
                }

                const { convertedPrice } = IkeaPriceUtils.calculatePriceDifference(item.localPriceNum, result);
                const totalConvertedPrice = convertedPrice * item.quantity;

                if (!totalSavings[result.name]) {
                    totalSavings[result.name] = 0;
                }
                if (totalConvertedPrice < itemTotalLocalPrice) {
                    totalSavings[result.name] += itemTotalLocalPrice - totalConvertedPrice;
                }

                if (totalConvertedPrice < cheapestPrice) {
                    cheapestPrice = totalConvertedPrice;
                    cheapestCountry = result.name;
                    cheapestUrl = result.url;
                }
            });

            optimalSavings += itemTotalLocalPrice - cheapestPrice;
            optimalPurchaseStrategy.push({
                productName: item.productName,
                country: cheapestCountry,
                price: cheapestPrice,
                saving: itemTotalLocalPrice - cheapestPrice,
                url: cheapestUrl,
                quantity: item.quantity
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
                html += `<li><a href="${item.url}" target="_blank">${item.productName}</a> (${item.quantity} ks):<br><span style="white-space: nowrap;">${IkeaPriceUtils.formatPrice(item.price)}</span>`
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
        attachUnavailableItemsListeners: attachUnavailableItemsListeners,
        updateCartComparisons: updateCartComparisons
    };
})();