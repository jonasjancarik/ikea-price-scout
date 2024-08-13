import { Cart } from '../models/Cart.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';
export class CartPage {
    constructor() {
        this.cart = null;
        this.lastCartState = '';
        this.storedComparisons = new Map();
        this.cartObserver = null;
        this.resizeObserver = null;
        this.entriesSeen = new Set();
        this.lastWidth = 0;
    }
    async initialize() {
        await this.compareCartPrices(); // Immediate initial comparison
        this.setupCartObserver();
        this.attachCartEventListeners();
    }
    async compareCartPrices() {
        console.log("compareCartPrices function called");
        const currentCartState = this.getCartState();
        console.log("Current cart state:", currentCartState);
        console.log("Last cart state:", this.lastCartState);
        if (currentCartState !== this.lastCartState || this.lastCartState === '') {
            console.log("Cart state changed or initial load, updating comparisons");
            try {
                this.cart = new Cart();
                const cartItemElements = document.querySelectorAll('.product_product__pvcUf');
                const cartItemPromises = Array.from(cartItemElements).map(async (itemElement) => {
                    const productId = itemElement.querySelector('.cart-ingka-link').href.split('-').pop() || '';
                    const localPriceElement = itemElement.querySelector('.cart-ingka-price__sr-text');
                    if (!localPriceElement) {
                        throw new Error('Local price element not found');
                    }
                    let localPrice = parseFloat(itemElement.querySelector('.cart-ingka-price-module__addons .cart-ingka-price__integer')?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
                    // check if the displayed price is the discounted price - in that case, use the other price field
                    if (itemElement.querySelector('.cart-ingka-price-module__addon')?.textContent?.includes('Původní cena')) {
                        localPrice = parseFloat(itemElement.querySelector('.cart-ingka-price-module__primary-currency-price .cart-ingka-price__integer')?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
                    }
                    const quantityInput = itemElement.querySelector('.cart-ingka-quantity-stepper__input');
                    const quantity = parseInt(quantityInput.value);
                    const nameElement = itemElement.querySelector('.cart-ingka-price-module__name-decorator');
                    const descriptionElement = itemElement.querySelector('.cart-ingka-price-module__description');
                    const productName = `${nameElement?.textContent?.trim()} - ${descriptionElement?.textContent?.trim()}`;
                    await this.cart.addItem(productName, productId, localPrice, quantity);
                });
                await Promise.all(cartItemPromises);
                const cartItems = this.cart.getComparisonData();
                if (cartItems.length > 0) {
                    this.updateCartComparisons(cartItems);
                }
                this.lastCartState = currentCartState;
            }
            catch (error) {
                console.error("Error in compareCartPrices:", error);
            }
        }
        else {
            console.log("Cart state unchanged, reapplying stored comparisons");
            this.reapplyStoredComparisons();
        }
    }
    updateCartComparisons(cartItems) {
        const cartItemElements = document.querySelectorAll('.product_product__pvcUf');
        cartItemElements.forEach((itemElement) => {
            const productId = itemElement.querySelector('.cart-ingka-link').href.split('-').pop() || '';
            const cartItem = cartItems.find(item => item.id === productId);
            if (cartItem) {
                const comparisonHTML = DisplayUtils.generateComparisonHTML(cartItem);
                let comparisonDiv = itemElement.querySelector('.ikea-price-comparison');
                if (!comparisonDiv) {
                    comparisonDiv = DisplayUtils.createComparisonDiv(comparisonHTML);
                    comparisonDiv.classList.add('ikea-price-comparison');
                    IkeaDomUtils.insertAfterElement('.cart-ingka-price-module__primary-currency-price', comparisonDiv, itemElement);
                }
                else {
                    comparisonDiv.innerHTML = comparisonHTML;
                }
                this.storedComparisons.set(productId, comparisonDiv.outerHTML);
            }
        });
        const summaryHTML = DisplayUtils.updateCartSummary(cartItems);
        this.storedComparisons.set('cartSummary', summaryHTML);
    }
    reapplyStoredComparisons() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        cartItems.forEach(itemElement => {
            const productId = itemElement.getAttribute('data-product-id') || '';
            const storedComparison = this.storedComparisons.get(productId);
            if (storedComparison) {
                let comparisonDiv = itemElement.querySelector('.ikea-price-comparison');
                if (!comparisonDiv) {
                    itemElement.insertAdjacentHTML('beforeend', storedComparison);
                }
            }
        });
        const storedSummary = this.storedComparisons.get('cartSummary');
        if (storedSummary) {
            let summaryDiv = document.getElementById('ikea-price-comparison-summary');
            if (!summaryDiv) {
                DisplayUtils.insertSummaryDiv(storedSummary);
            }
        }
    }
    getCartState() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        console.log("Found", cartItems.length, "cart items");
        const state = Array.from(cartItems).map(item => {
            const id = item.firstElementChild ? item.firstElementChild.getAttribute('data-testid')?.split('_').pop() : '';
            const quantityInput = item.querySelector('.cart-ingka-quantity-stepper__input');
            const quantity = quantityInput ? quantityInput.value : '1';
            console.log("Cart item:", id, "Quantity:", quantity);
            return `${id}:${quantity}`;
        }).join(',');
        return state;
    }
    setupCartObserver() {
        let cartMutationCount = 0;
        console.log("Setting up cart observer");
        this.cartObserver = new MutationObserver(this.debounce(() => {
            console.log("Cart mutation observed");
            if (cartMutationCount === 0) { // TODO: This is a bit of a hack, but it works - the mutation observer is only needed once to detect that the cart has been added to the DOM
                this.compareCartPrices();
            }
            cartMutationCount += 1;
        }, 50));
        const attachObserver = () => {
            const desktopContainer = document.querySelector('.shoppingBag_desktop_contentGrid__RPQ4V');
            const mobileContainer = document.querySelector('.shoppingBag_mobile_contentGrid__wLMZ7');
            const cartContainer = desktopContainer || mobileContainer;
            if (cartContainer) {
                this.cartObserver?.observe(cartContainer, { childList: true, subtree: true });
                console.log("Cart observer attached to", desktopContainer ? "desktop" : "mobile", "container");
                return true;
            }
            console.log("Cart container not found, will retry");
            return false;
        };
        const attemptAttachment = (retries = 0, maxRetries = 10) => {
            if (attachObserver())
                return;
            if (retries < maxRetries) {
                setTimeout(() => attemptAttachment(retries + 1), 500);
            }
            else {
                console.error("Failed to attach cart observer after maximum retries");
            }
        };
        attemptAttachment();
        const handleResize = this.debounce(() => {
            console.log("Significant resize detected, checking if reattachment is necessary");
            const desktopContainer = document.querySelector('.shoppingBag_desktop_contentGrid__RPQ4V');
            const mobileContainer = document.querySelector('.shoppingBag_mobile_contentGrid__wLMZ7');
            const currentContainer = desktopContainer || mobileContainer;
            if (currentContainer && !currentContainer.contains(this.cartObserver?.takeRecords()[0]?.target)) {
                console.log("Cart container changed, reattaching observer");
                this.cartObserver?.disconnect();
                this.cartObserver?.observe(currentContainer, { childList: true, subtree: true });
            }
            this.reapplyStoredComparisons();
        }, 250);
        this.resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (!this.entriesSeen.has(entry.target)) {
                    this.entriesSeen.add(entry.target);
                    this.lastWidth = entry.contentRect.width;
                }
                else {
                    const widthDiff = Math.abs(entry.contentRect.width - this.lastWidth);
                    if (widthDiff > 50) { // Only trigger for significant width changes
                        this.lastWidth = entry.contentRect.width;
                        handleResize();
                    }
                }
            }
        });
        // Explicitly observe the element that contains the cart
        const cartContainer = document.querySelector('.shoppingBag_desktop_contentGrid__RPQ4V') ||
            document.querySelector('.shoppingBag_mobile_contentGrid__wLMZ7');
        if (cartContainer) {
            this.resizeObserver.observe(cartContainer);
            console.log("ResizeObserver attached to cart container");
        }
        else {
            console.error("Cart container not found for ResizeObserver");
        }
    }
    attachCartEventListeners() {
        console.log("Attaching cart event listeners");
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.parentElement?.matches('.cart-ingka-quantity-stepper__decrease, .cart-ingka-quantity-stepper__increase')) {
                const productId = (target.closest('.product_product__pvcUf')?.querySelector('.cart-ingka-link')).href.split('-').pop() || null;
                const quantityInput = target.closest('.product_product__pvcUf')?.querySelector('.cart-ingka-quantity-stepper__input');
                const newQuantity = parseInt(quantityInput.value);
                // this.cart?.updateItemQuantity(productId, newQuantity);
                this.compareCartPrices();
            }
        });
        document.addEventListener('input', this.debounce((event) => {
            const target = event.target;
            if (target.matches('.cart-ingka-quantity-stepper__input')) {
                const productId = (target.closest('.product_product__pvcUf')?.querySelector('.cart-ingka-link')).href.split('-').pop() || null;
                const newQuantity = parseInt(target.value);
                // this.cart?.updateItemQuantity(productId, newQuantity);
                this.compareCartPrices();
            }
        }, 250));
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target?.parentElement?.attributes['data-testid'].value.startsWith('remove')) {
                const productId = (target.closest('.product_product__pvcUf')?.querySelector('.cart-ingka-link')).href.split('-').pop() || null;
                if (productId) {
                    this.cart?.removeItem(productId);
                    setTimeout(() => this.compareCartPrices(), 250);
                }
            }
        });
    }
    debounce(func, delay) {
        let debounceTimer;
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }
    cleanup() {
        this.cartObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.storedComparisons.clear();
        this.entriesSeen.clear();
    }
}
