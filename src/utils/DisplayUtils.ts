import { IkeaPriceUtils } from './PriceUtils.js';
import { ProductItem } from '../models/ProductItem.js';

export const DisplayUtils = {
    createComparisonDiv(html: string, additionalStyles: string = ''): HTMLDivElement {
        const div = document.createElement('div');
        div.style.cssText = `background-color: #f0f0f0; padding: 10px; margin-top: 10px; border-radius: 5px; ${additionalStyles}`;
        div.innerHTML = html;
        return div;
    },

    generateComparisonHTML(item: ProductItem): string {
        let html = item.quantity === 1 ? '<strong>Cena v okolních zemích:</strong><br><br>' : `<strong>Cena za ${item.quantity} ks v okolních zemích:</strong><br><br>`;
        item.otherCountries.forEach((result: any) => {
            if (result.isAvailable) {
                const formattedPrice = IkeaPriceUtils.formatPrice(result.totalPrice);
                const color = result.priceDiff.percentageDiff > 0 ? 'red' : 'green';
                html += `<a href="${result.url}" target="_blank" style="color: inherit; text-decoration: none;">${result.name}</a>: <span style="color: ${color};">${formattedPrice} (${result.priceDiff.percentageDiff > 0 ? '+' : ''}${result.priceDiff.percentageDiff} %)</span><br>`;
            } else {
                html += `<span style="color: gray;">${result.name}: Nedostupné</span><br>`;
            }
        });
        return html;
    },

    formatPrice(price: number | null): string {
        return IkeaPriceUtils.formatPrice(price);
    },

    showError(message: string): HTMLDivElement {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background-color: #ffeeee; color: #ff0000; padding: 10px; margin-top: 10px; border-radius: 5px;';
        errorDiv.textContent = message;
        return errorDiv;
    },

    createTooltip(content: string): HTMLDivElement {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = 'position: absolute; background-color: #333; color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 0.8em; z-index: 1000; display: none;';
        tooltip.textContent = content;
        return tooltip;
    },

    showTooltip(element: HTMLElement, tooltip: HTMLDivElement): void {
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.display = 'block';
    },

    hideTooltip(tooltip: HTMLDivElement): void {
        tooltip.style.display = 'none';
    },

    createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = 'padding: 5px 10px; margin: 5px; border: none; border-radius: 4px; background-color: #0051ba; color: white; cursor: pointer;';
        button.addEventListener('click', onClick);
        return button;
    },

    createLoadingIndicator(): HTMLDivElement {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('ikea-price-comparison-loading');
        loadingDiv.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-color: #f0f0f0;
            border-radius: 5px;
            margin-top: 10px;
        `;
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <span style="margin-left: 10px;">Načítání cen...</span>
        `;
        return loadingDiv;
    },

    showLoadingIndicator(container: HTMLElement): void {
        const loadingIndicator = this.createLoadingIndicator();
        container.appendChild(loadingIndicator);
    },

    hideLoadingIndicator(container: HTMLElement): void {
        const loadingIndicator = container.querySelector('.ikea-price-comparison-loading');
        if (loadingIndicator) {
            container.removeChild(loadingIndicator);
        }
    },

};