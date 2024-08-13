import { IkeaPriceUtils } from './PriceUtils.js';
export const DisplayUtils = {
    insertSummaryDiv(summaryHTML) {
        console.log("Inserting summary div");
        let summaryDiv = document.getElementById('ikea-price-comparison-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'ikea-price-comparison-summary';
            summaryDiv.style.cssText = 'background-color: #e6f7ff; padding: 15px; margin-top: 20px; border-radius: 5px; font-size: 1.1em;';
        }
        summaryDiv.innerHTML = summaryHTML;
        const insertAttempt = () => {
            const targetSelector = '.checkoutInformation_checkoutInformation__Xh4rd';
            const targetElement = document.querySelector(targetSelector);
            if (targetElement && targetElement.parentNode) {
                console.log("Target element found, inserting summary div");
                targetElement.parentNode.insertBefore(summaryDiv, targetElement.nextSibling);
            }
            else {
                console.log("Target element for summary not found, retrying in 500ms");
                setTimeout(insertAttempt, 500);
            }
        };
        insertAttempt();
    },
    updateCartSummary(cartItems) {
        console.log("Updating cart summary");
        const { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy } = this.calculateSavings(cartItems);
        const summaryHTML = this.generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy);
        this.insertSummaryDiv(summaryHTML);
        return summaryHTML;
    },
    generateComparisonHTML(item) {
        let html = item.quantity === 1 ? '<strong>Cena v jiných zemích:</strong><br><br>' : `<strong>Cena za ${item.quantity} ks v jiných zemích:</strong><br><br>`;
        item.otherCountries.forEach((result) => {
            if (result.isAvailable) {
                const formattedPrice = IkeaPriceUtils.formatPrice(result.totalPrice);
                const color = result.priceDiff.percentageDiff > 0 ? 'red' : 'green';
                html += `<a href="${result.url}" target="_blank" style="color: inherit; text-decoration: none;">${result.name}</a>: <span style="color: ${color};">${formattedPrice} (${result.priceDiff.percentageDiff > 0 ? '+' : ''}${result.priceDiff.percentageDiff} %)</span><br>`;
            }
            else {
                html += `<span style="color: gray;">${result.name}: Nedostupné</span><br>`;
            }
        });
        return html;
    },
    createComparisonDiv(html, additionalStyles = '') {
        const div = document.createElement('div');
        div.style.cssText = `background-color: #f0f0f0; padding: 10px; margin-top: 10px; border-radius: 5px; ${additionalStyles}`;
        div.innerHTML = html;
        return div;
    },
    calculateSavings(cartItems) {
        let totalSavings = {};
        let optimalSavings = 0;
        let unavailableCounts = {};
        let optimalPurchaseStrategy = [];
        cartItems.forEach(item => {
            let cheapestPrice = item.localPriceForQuantity;
            let cheapestCountry = 'Česko';
            let cheapestUrl = item.url;
            item.otherCountries.forEach((result) => {
                if (!unavailableCounts[result.name]) {
                    unavailableCounts[result.name] = 0;
                }
                if (!result.isAvailable) {
                    unavailableCounts[result.name]++;
                    return;
                }
                if (!totalSavings[result.name]) {
                    totalSavings[result.name] = 0;
                }
                totalSavings[result.name] += item.localPriceForQuantity - result.totalPrice;
                if (result.totalPrice < cheapestPrice) {
                    cheapestPrice = result.totalPrice;
                    cheapestCountry = result.name;
                    cheapestUrl = result.url;
                }
            });
            optimalSavings += item.localPriceForQuantity - cheapestPrice;
            optimalPurchaseStrategy.push({
                productName: item.productName,
                country: cheapestCountry,
                price: cheapestPrice,
                saving: item.localPriceForQuantity - cheapestPrice,
                url: cheapestUrl,
                quantity: item.quantity
            });
        });
        return { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy };
    },
    generateSummaryHTML(totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy) {
        let html = '<h3 style="font-size: 1.35rem;">Shrnutí úspor:</h3><br>';
        html += '<strong style="font-size: 1.2rem;">Celý nákup v jedné zemi:</strong><br><br>';
        const sortedSavings = Object.entries(totalSavings).sort((a, b) => b[1] - a[1]);
        for (const [country, savings] of sortedSavings) {
            const unavailableCount = unavailableCounts[country];
            html += `<strong>${country}:</strong> <span ${savings > 0 ? 'style="color: green;"' : 'style="color: red;"'}>${savings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(savings > 0 ? savings : -savings)}</span>`;
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
                html += `<li><a href="${item.url}" target="_blank">${item.productName}</a> (${item.quantity} ks):<br><span style="white-space: nowrap;">${IkeaPriceUtils.formatPrice(item.price)}</span>`;
                if (country !== 'Česko') {
                    html += ` <span style="white-space: nowrap; color: green; font-size: 0.8rem;">(-${IkeaPriceUtils.formatPrice(item.saving)})</span>`;
                }
                html += '</li>';
            });
            html += `</ul><br>`;
        }
        return html;
    }
};
