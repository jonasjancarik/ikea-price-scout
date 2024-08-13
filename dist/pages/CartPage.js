import { Cart } from '../models/Cart.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';
import { Selectors } from '../selectors/selectors.js';
import { IkeaPriceUtils } from '../utils/PriceUtils.js';
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
                const cartItemElements = document.querySelectorAll(Selectors.cartPage.cartItem);
                const cartItemPromises = Array.from(cartItemElements).map(async (itemElement) => {
                    const productId = itemElement.querySelector(Selectors.cartPage.productLink).href.split('-').pop() || '';
                    const localPriceElement = itemElement.querySelector(Selectors.cartPage.priceElement);
                    if (!localPriceElement) {
                        throw new Error('Local price element not found');
                    }
                    let localPrice = parseFloat(itemElement.querySelector(Selectors.cartPage.priceInteger)?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
                    // check if the displayed price is the discounted price - in that case, use the other price field
                    if (itemElement.querySelector(Selectors.cartPage.priceModuleAddon)?.textContent?.includes('Původní cena')) {
                        localPrice = parseFloat(itemElement.querySelector(Selectors.cartPage.discountedPriceInteger)?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
                    }
                    const quantityInput = itemElement.querySelector(Selectors.cartPage.quantityInput);
                    const quantity = parseInt(quantityInput.value);
                    const nameElement = itemElement.querySelector(Selectors.cartPage.nameDecorator);
                    const descriptionElement = itemElement.querySelector(Selectors.cartPage.description);
                    const productName = `${nameElement?.textContent?.trim()} - ${descriptionElement?.textContent?.trim()}`;
                    await this.cart.addItem(productName, productId, localPrice, quantity);
                });
                await Promise.all(cartItemPromises);
                const cartItems = this.cart.getItems();
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
        const cartItemElements = document.querySelectorAll(Selectors.cartPage.cartItem);
        cartItemElements.forEach((itemElement) => {
            const productId = itemElement.querySelector(Selectors.cartPage.productLink).href.split('-').pop() || '';
            const cartItem = cartItems.find(item => item.id === productId);
            if (cartItem) {
                const comparisonHTML = DisplayUtils.generateComparisonHTML(cartItem);
                let comparisonDiv = itemElement.querySelector(Selectors.cartPage.priceComparison);
                if (!comparisonDiv) {
                    comparisonDiv = DisplayUtils.createComparisonDiv(comparisonHTML);
                    comparisonDiv.classList.add('ikea-price-comparison');
                    IkeaDomUtils.insertAfterElement(Selectors.cartPage.primaryCurrencyPrice, comparisonDiv, itemElement);
                }
                else {
                    comparisonDiv.innerHTML = comparisonHTML;
                }
                this.storedComparisons.set(productId, comparisonDiv.outerHTML);
            }
        });
        const summaryHTML = this.generateCartSummaryHTML(cartItems);
        this.insertSummaryDiv(summaryHTML);
        this.storedComparisons.set('cartSummary', summaryHTML);
    }
    reapplyStoredComparisons() {
        const cartItems = document.querySelectorAll(Selectors.cartPage.cartItem);
        cartItems.forEach(itemElement => {
            const productId = itemElement.getAttribute('data-product-id') || '';
            const storedComparison = this.storedComparisons.get(productId);
            if (storedComparison) {
                let comparisonDiv = itemElement.querySelector(Selectors.cartPage.priceComparison);
                if (!comparisonDiv) {
                    itemElement.insertAdjacentHTML('beforeend', storedComparison);
                }
            }
        });
        const storedSummary = this.storedComparisons.get('cartSummary');
        if (storedSummary) {
            let summaryDiv = document.getElementById(Selectors.summary.container);
            if (!summaryDiv) {
                this.insertSummaryDiv(storedSummary);
            }
        }
    }
    getCartState() {
        const cartItems = document.querySelectorAll(Selectors.cartPage.cartItem);
        console.log("Found", cartItems.length, "cart items");
        const state = Array.from(cartItems).map(item => {
            const id = item.firstElementChild ? item.firstElementChild.getAttribute('data-testid')?.split('_').pop() : '';
            const quantityInput = item.querySelector(Selectors.cartPage.quantityInput);
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
            if (cartMutationCount === 0) {
                this.compareCartPrices();
            }
            cartMutationCount += 1;
        }, 50));
        const attachObserver = () => {
            const desktopContainer = document.querySelector(Selectors.cartContainer.desktop);
            const mobileContainer = document.querySelector(Selectors.cartContainer.mobile);
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
            const desktopContainer = document.querySelector(Selectors.cartContainer.desktop);
            const mobileContainer = document.querySelector(Selectors.cartContainer.mobile);
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
                    if (widthDiff > 50) {
                        this.lastWidth = entry.contentRect.width;
                        handleResize();
                    }
                }
            }
        });
        const cartContainer = document.querySelector(Selectors.cartContainer.desktop) ||
            document.querySelector(Selectors.cartContainer.mobile);
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
            if (target.parentElement?.matches(`${Selectors.cartPage.quantityDecrease}, ${Selectors.cartPage.quantityIncrease}`)) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink)).href.split('-').pop() || null;
                const quantityInput = target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.quantityInput);
                const newQuantity = parseInt(quantityInput.value);
                this.compareCartPrices();
            }
        });
        document.addEventListener('input', this.debounce((event) => {
            const target = event.target;
            if (target.matches(Selectors.cartPage.quantityInput)) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink)).href.split('-').pop() || null;
                const newQuantity = parseInt(target.value);
                this.compareCartPrices();
            }
        }, 250));
        document.addEventListener('click', (event) => {
            const target = event.target;
            const parentElement = target?.parentElement;
            const dataTestIdAttr = parentElement?.attributes.getNamedItem('data-testid');
            if (dataTestIdAttr && dataTestIdAttr.value.startsWith('remove')) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink)).href.split('-').pop() || null;
                if (productId) {
                    this.cart?.removeItem(productId);
                    setTimeout(() => this.compareCartPrices(), 250);
                }
            }
        });
    }
    insertSummaryDiv(summaryHTML) {
        console.log("Inserting summary div");
        let summaryDiv = document.getElementById(Selectors.summary.container);
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = Selectors.summary.container;
            summaryDiv.style.cssText = 'background-color: #e6f7ff; padding: 15px; margin-top: 20px; border-radius: 5px; font-size: 1.1em;';
        }
        summaryDiv.innerHTML = summaryHTML;
        const insertAttempt = () => {
            const targetElement = document.querySelector(Selectors.summary.insertTarget);
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
    }
    generateCartSummaryHTML(cartItems) {
        const { totalSavings, optimalSavings, unavailableCounts, optimalPurchaseStrategy } = this.calculateSavings(cartItems);
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
