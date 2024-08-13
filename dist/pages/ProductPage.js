import { ProductItem } from '../models/ProductItem.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';
import { Selectors } from '../selectors/selectors.js';
import { ErrorUtils } from '../utils/ErrorUtils.js';
export const IkeaProductPage = {
    async compareProductPrice(retryCount = 0) {
        try {
            const productId = window.location.href.replace(/\/$/, '').split('-').pop();
            const localPriceElement = document.querySelector(Selectors.productPage.priceInteger);
            if (!localPriceElement) {
                throw new Error('Local price element not found');
            }
            const localPriceStr = localPriceElement?.textContent?.trim().replace(/[^0-9.,]/g, '').replace(',', '.');
            const localPrice = localPriceStr ? parseFloat(localPriceStr) : null;
            const productNameElement = document.querySelector(Selectors.productPage.productName);
            if (!productNameElement) {
                throw new Error('Product name element not found');
            }
            const productName = productNameElement?.textContent?.trim() || '';
            if (productName && productId && localPrice) {
                const comparisonContainer = DisplayUtils.createComparisonDiv('');
                IkeaDomUtils.insertAfterElement(Selectors.productPage.priceAddons, comparisonContainer);
                DisplayUtils.showLoadingIndicator(comparisonContainer);
                const productItem = await new ProductItem(productName, productId, localPrice, 1);
                const comparisonHTML = DisplayUtils.generateComparisonHTML(productItem);
                DisplayUtils.hideLoadingIndicator(comparisonContainer);
                comparisonContainer.innerHTML = comparisonHTML;
            }
        }
        catch (error) {
            if (retryCount < 3) {
                console.log(`Retrying (${retryCount + 1}/3)...`);
                setTimeout(() => this.compareProductPrice(retryCount + 1), 2000);
            }
            else {
                ErrorUtils.handleError(error, 'ProductPage.compareProductPrice', 'Nepodařilo se načíst srovnání cen. Zkuste obnovit stránku.');
            }
        }
    }
};
