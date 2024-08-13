// src/IkeaProductPage.ts

import { ProductItem } from '../models/ProductItem.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';

export const IkeaProductPage = {
    async compareProductPrice(retryCount = 0) {
        try {
            const productId = window.location.href.replace(/\/$/, '').split('-').pop();
            const localPriceElement = document.querySelector('.pip-temp-price__integer');
            if (!localPriceElement) {
                throw new Error('Local price element not found');
            }

            const localPriceStr = localPriceElement?.textContent?.trim().replace(/[^0-9.,]/g, '').replace(',', '.');
            const localPrice = localPriceStr ? parseFloat(localPriceStr) : null;

            const productNameElement = document.querySelector('.pip-header-section__title--big');
            if (!productNameElement) {
                throw new Error('Product name element not found');
            }
            const productName = productNameElement?.textContent?.trim() || '';

            if (productName && productId && localPrice) {
                const productItem = await new ProductItem(productName, productId, localPrice, 1);
                DisplayUtils.displayProductComparison(productItem);
            }
        } catch (error) {
            IkeaDomUtils.handleComparisonError(error as Error, retryCount, this.compareProductPrice);
        }
    }
};
