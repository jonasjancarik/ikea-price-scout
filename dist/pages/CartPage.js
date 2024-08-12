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
    }
    async initialize() {
        console.log("Initializing cart page functionality");
        this.setupCartObserver();
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
                for (const itemElement of cartItemElements) {
                    const productId = itemElement.querySelector('.cart-ingka-link').href.split('-').pop() || '';
                    const localPriceElement = itemElement.querySelector('.cart-ingka-price__sr-text');
                    if (!localPriceElement) {
                        throw new Error('Local price element not found');
                    }
                    const localPrice = parseFloat(localPriceElement.textContent?.trim().replace(/[^0-9.,]/g, '').replace(',', '.') || '0');
                    const quantityInput = itemElement.querySelector('.cart-ingka-quantity-stepper__input');
                    const quantity = parseInt(quantityInput.value);
                    const nameElement = itemElement.querySelector('.cart-ingka-price-module__name-decorator');
                    const descriptionElement = itemElement.querySelector('.cart-ingka-price-module__description');
                    const productName = `${nameElement?.textContent?.trim()} - ${descriptionElement?.textContent?.trim()}`;
                    await this.cart.addItem(productName, productId, localPrice / quantity, quantity);
                }
                const cartItems = this.cart.getComparisonData();
                this.updateCartComparisons(cartItems);
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
        console.log("Cart state:", state);
        return state;
    }
    setupCartObserver() {
        console.log("Setting up cart observer");
        this.cartObserver = new MutationObserver(this.debounce(() => {
            console.log("Cart mutation observed");
            this.compareCartPrices();
        }, 500));
        const attachObserver = () => {
            const desktopContainer = document.querySelector('.shoppingBag_desktop_contentGrid__RPQ4V');
            const mobileContainer = document.querySelector('.shoppingBag_mobile_contentGrid__wLMZ7');
            const cartContainer = desktopContainer || mobileContainer;
            if (cartContainer) {
                this.cartObserver?.observe(cartContainer, { childList: true, subtree: true });
                console.log("Cart observer attached to", desktopContainer ? "desktop" : "mobile", "container");
                this.attachCartEventListeners();
                return true;
            }
            console.log("Cart container not found, will retry");
            return false;
        };
        const attemptAttachment = (retries = 0, maxRetries = 10) => {
            if (attachObserver())
                return;
            if (retries < maxRetries) {
                setTimeout(() => attemptAttachment(retries + 1), 1000);
            }
            else {
                console.error("Failed to attach cart observer after maximum retries");
            }
        };
        attemptAttachment();
        this.resizeObserver = new ResizeObserver(this.debounce(() => {
            console.log("Window resized, reattaching cart observer and reapplying comparisons");
            this.cartObserver?.disconnect();
            attemptAttachment();
            this.reapplyStoredComparisons();
        }, 500));
        this.resizeObserver.observe(document.body);
    }
    attachCartEventListeners() {
        console.log("Attaching cart event listeners");
        document.querySelectorAll('.cart-ingka-quantity-stepper__input').forEach(input => {
            input.addEventListener('change', this.debounce((event) => {
                const target = event.target;
                const productId = target.closest('.product_product__pvcUf')?.getAttribute('data-product-id') || '';
                const newQuantity = parseInt(target.value);
                this.cart?.updateItemQuantity(productId, newQuantity);
                this.compareCartPrices();
            }, 500));
        });
        document.querySelectorAll('.cart-ingka-product-actions__button').forEach(button => {
            if (button.textContent?.trim().toLowerCase() === 'remove') {
                button.addEventListener('click', (event) => {
                    const target = event.target;
                    const productId = target.closest('.product_product__pvcUf')?.getAttribute('data-product-id') || '';
                    this.cart?.removeItem(productId);
                    setTimeout(() => this.compareCartPrices(), 500);
                });
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
    }
}
