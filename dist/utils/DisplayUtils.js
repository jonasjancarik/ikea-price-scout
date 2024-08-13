import { IkeaPriceUtils } from './PriceUtils.js';
export const DisplayUtils = {
    createComparisonDiv(html, additionalStyles = '') {
        const div = document.createElement('div');
        div.style.cssText = `background-color: #f0f0f0; padding: 10px; margin-top: 10px; border-radius: 5px; ${additionalStyles}`;
        div.innerHTML = html;
        return div;
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
    formatPrice(price) {
        return IkeaPriceUtils.formatPrice(price);
    },
    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; padding: 20px;';
        loadingDiv.innerHTML = '<span style="font-size: 1.2em;">Načítání cen...</span>';
        return loadingDiv;
    },
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background-color: #ffeeee; color: #ff0000; padding: 10px; margin-top: 10px; border-radius: 5px;';
        errorDiv.textContent = message;
        return errorDiv;
    },
    createTooltip(content) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = 'position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 0.8em; z-index: 1000; display: none;';
        tooltip.textContent = content;
        return tooltip;
    },
    showTooltip(element, tooltip) {
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.display = 'block';
    },
    hideTooltip(tooltip) {
        tooltip.style.display = 'none';
    },
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = 'padding: 5px 10px; margin: 5px; border: none; border-radius: 4px; background-color: #0051ba; color: white; cursor: pointer;';
        button.addEventListener('click', onClick);
        return button;
    }
};
