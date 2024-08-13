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
        cartItem: '[class^="product_product__"]',  // Matches any class starting with "product_product__"
        productLink: '.cart-ingka-link',
        priceElement: '.cart-ingka-price__sr-text',
        priceInteger: '.cart-ingka-price-module__addons .cart-ingka-price__integer',
        discountedPriceInteger: '.cart-ingka-price-module__primary-currency-price .cart-ingka-price__integer',
        quantityInput: '.cart-ingka-quantity-stepper__input',
        nameDecorator: '.cart-ingka-price-module__name-decorator',
        description: '.cart-ingka-price-module__description',
        priceComparison: '.ikea-price-comparison',
        primaryCurrencyPrice: '.cart-ingka-price-module__primary-currency-price',
        quantityDecrease: '.cart-ingka-quantity-stepper__decrease',
        quantityIncrease: '.cart-ingka-quantity-stepper__increase',
        priceModuleAddon: '.cart-ingka-price-module__addon',
    },

    // Cart container selectors
    cartContainer: {
        desktop: '[class^="shoppingBag_desktop_contentGrid__"]',  // Matches any class starting with "shoppingBag_desktop_contentGrid__"
        mobile: '[class^="shoppingBag_mobile_contentGrid__"]',  // Matches any class starting with "shoppingBag_mobile_contentGrid__"
    },

    // Summary selectors
    summary: {
        container: 'ikea-price-comparison-summary',  // This is an ID, so we don't need to change it
        insertTarget: '[class^="checkoutInformation_checkoutInformation__"]',  // Matches any class starting with "checkoutInformation_checkoutInformation__"
    },
};
