// src/config/selectors.ts
export const Selectors = {
    // Product page selectors
    productPage: {
        priceInteger: '.pip-temp-price__integer',
        productName: '.pip-header-section__title--big',
        priceAddons: '.pip-temp-price-module__addons',
    },
    // Cart page selectors
    cartPage: {
        cartItem: '[itemtype="http://schema.org/Product"]',
        productLink: '.cart-ingka-link',
        priceElement: '.cart-ingka-price__sr-text',
        priceInteger: '.cart-ingka-price-module__addons .cart-ingka-price__integer',
        discountedPriceInteger: '.cart-ingka-price-module__primary-currency-price .cart-ingka-price__integer',
        quantityInput: '.cart-ingka-quantity-stepper__input',
        nameDecorator: '.cart-ingka-price-module__name-decorator',
        description: '.cart-ingka-price-module__description',
        priceComparison: '.price-scout-price-comparison',
        primaryCurrencyPrice: '.cart-ingka-price-module__primary-currency-price',
        quantityDecrease: '.cart-ingka-quantity-stepper__decrease',
        quantityIncrease: '.cart-ingka-quantity-stepper__increase',
        priceModuleAddon: '.cart-ingka-price-module__addon',
    },
    // Cart container selectors
    cartContainer: {
        desktop: '[class^="_contentGrid_akbk2_1"]', // Matches any class starting with "shoppingBag_desktop_contentGrid__"
        mobile: '[class^="shoppingBag_mobile_contentGrid__"]', // Matches any class starting with "shoppingBag_mobile_contentGrid__"
    },
    // Summary selectors
    summary: {
        container: 'price-scout-comparison-summary',
        insertTarget: '[class^="_checkoutInformation_"]',
    },
};
