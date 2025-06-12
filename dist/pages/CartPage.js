import { Cart } from '../models/Cart.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';
import { SelectorsService } from '../services/SelectorsService.js';
import { IkeaPriceUtils } from '../utils/PriceUtils.js';
import { ErrorUtils } from '../utils/ErrorUtils.js';
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
        try {
            this.selectors = await SelectorsService.getSelectors();
            await this.compareCartPrices();
            this.setupCartObserver();
            this.attachCartEventListeners();
        }
        catch (error) {
            ErrorUtils.handleError(error, 'CartPage.initialize', 'Nepodařilo se inicializovat porovnání cen v košíku. Zkuste obnovit stránku.');
        }
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
                const familyPriceElements = document.querySelectorAll(this.selectors.cartPage.ikeaFamilyCommercialMessage);
                if (familyPriceElements.length > 0) {
                    const errorDiv = DisplayUtils.showError('Na některé položky v košíku je sleva pro IKEA Family. Plná cena je u nich porovnána se zvýhodněnou cenou v jiných zemích. Pro správné srovnání se prosím přihlaste do svého IKEA účtu.');
                    const cartContainer = document.querySelector(this.selectors.cartContainer.desktop) ||
                        document.querySelector(this.selectors.cartContainer.mobile);
                    if (cartContainer) {
                        cartContainer.insertBefore(errorDiv, cartContainer.firstChild);
                    }
                    // this.hideAllLoadingIndicators();
                    // return;
                }
                const cartItemElements = document.querySelectorAll(this.selectors.cartPage.cartItem);
                this.updateLoadingState(cartItemElements, true);
                this.showSummaryLoadingIndicator();
                const cartItemPromises = Array.from(cartItemElements).map(async (itemElement) => {
                    const productId = itemElement.querySelector(this.selectors.cartPage.productLink).href.split('-').pop() || '';
                    const localPrice = this.getLocalPrice(itemElement);
                    const quantity = this.getQuantity(itemElement);
                    const productName = this.getProductName(itemElement);
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
                ErrorUtils.handleError(error, 'CartPage.compareCartPrices', 'Při porovnávání cen se něco pokazilo, už na tom pracujeme.');
                this.hideAllLoadingIndicators();
            }
        }
        else {
            console.log("Cart state unchanged, reapplying stored comparisons");
            this.reapplyStoredComparisons();
        }
    }
    getLocalPrice(itemElement) {
        const localPriceIntegerElement = itemElement.querySelector(this.selectors.cartPage.priceInteger);
        if (!localPriceIntegerElement || itemElement.querySelector(this.selectors.cartPage.priceModuleAddon)?.textContent?.includes('Původní cena')) {
            return parseFloat(itemElement.querySelector(this.selectors.cartPage.discountedPriceInteger)?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
        }
        else {
            return parseFloat(localPriceIntegerElement.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
        }
    }
    getQuantity(itemElement) {
        const quantityInput = itemElement.querySelector(this.selectors.cartPage.quantityInput);
        try {
            return parseInt(quantityInput.value);
        }
        catch (error) {
            ErrorUtils.handleError(error, 'CartPage.getQuantity', 'Nastala chyba při získávání počtu položek v košíku. Zkuste obnovit stránku.');
            return 1;
        }
    }
    getProductName(itemElement) {
        const nameElement = itemElement.querySelector(this.selectors.cartPage.nameDecorator);
        const descriptionElement = itemElement.querySelector(this.selectors.cartPage.description);
        return `${nameElement?.textContent?.trim()} - ${descriptionElement?.textContent?.trim()}`;
    }
    updateQuantity(productId, newQuantity) {
        const cartItem = this.cart?.getItems().find(item => item.id === productId);
        if (cartItem) {
            cartItem.setQuantity(newQuantity);
            this.updateItemComparison(cartItem);
            this.updateCartSummary();
        }
    }
    updateItemComparison(item) {
        const itemElement = document.querySelector(`${this.selectors.cartPage.cartItem} [href$="-${item.id}/"]`)?.closest(this.selectors.cartPage.cartItem);
        if (itemElement) {
            const comparisonDiv = itemElement.querySelector(this.selectors.cartPage.priceComparison);
            if (comparisonDiv) {
                const contentWrapper = comparisonDiv.querySelector('.comparison-content');
                const comparisonHTML = DisplayUtils.generateComparisonHTML(item);
                contentWrapper.innerHTML = comparisonHTML;
                this.storedComparisons.set(item.id, comparisonDiv.outerHTML);
            }
        }
    }
    updateCartSummary() {
        const cartItems = this.cart?.getItems() || [];
        const summaryHTML = this.generateCartSummaryHTML(cartItems);
        this.insertSummaryDiv(summaryHTML);
        this.storedComparisons.set('cartSummary', summaryHTML);
    }
    updateLoadingState(cartItemElements, isLoading) {
        cartItemElements.forEach((itemElement) => {
            let comparisonDiv = itemElement.querySelector(this.selectors.cartPage.priceComparison);
            if (!comparisonDiv) {
                comparisonDiv = this.createComparisonDiv();
                IkeaDomUtils.insertAfterElement(this.selectors.cartPage.primaryCurrencyPrice, comparisonDiv, itemElement);
            }
            const contentWrapper = comparisonDiv.querySelector('.comparison-content');
            const loadingIndicator = comparisonDiv.querySelector('.loading-indicator');
            if (isLoading) {
                contentWrapper.style.display = 'none';
                loadingIndicator.style.display = 'flex';
            }
            else {
                contentWrapper.style.display = 'block';
                loadingIndicator.style.display = 'none';
            }
        });
    }
    createComparisonDiv() {
        const comparisonDiv = document.createElement('div');
        comparisonDiv.classList.add(this.selectors.cartPage.priceComparison.replace('.', '')); // not sure if the replace is needed
        comparisonDiv.style.cssText = 'background-color: #f0f0f0; padding: 10px; margin-top: 10px; border-radius: 5px;';
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('comparison-content');
        const loadingIndicator = DisplayUtils.createLoadingIndicator();
        loadingIndicator.classList.add('loading-indicator');
        loadingIndicator.style.display = 'none';
        comparisonDiv.appendChild(contentWrapper);
        comparisonDiv.appendChild(loadingIndicator);
        return comparisonDiv;
    }
    updateCartComparisons(cartItems) {
        const cartItemElements = document.querySelectorAll(this.selectors.cartPage.cartItem);
        cartItemElements.forEach((itemElement) => {
            const productId = itemElement.querySelector(this.selectors.cartPage.productLink).href.split('-').pop() || '';
            const cartItem = cartItems.find(item => item.id === productId);
            if (cartItem) {
                const comparisonHTML = DisplayUtils.generateComparisonHTML(cartItem);
                let comparisonDiv = itemElement.querySelector(this.selectors.cartPage.priceComparison);
                if (comparisonDiv) {
                    const contentWrapper = comparisonDiv.querySelector('.comparison-content');
                    contentWrapper.innerHTML = comparisonHTML;
                    this.storedComparisons.set(productId, comparisonDiv.outerHTML);
                }
            }
        });
        // Hide loading indicators and show updated comparisons
        this.updateLoadingState(cartItemElements, false);
        const summaryHTML = this.generateCartSummaryHTML(cartItems);
        this.insertSummaryDiv(summaryHTML);
        this.storedComparisons.set('cartSummary', summaryHTML);
    }
    reapplyStoredComparisons() {
        const cartItems = document.querySelectorAll(this.selectors.cartPage.cartItem);
        cartItems.forEach(itemElement => {
            const productId = itemElement.getAttribute('data-product-id') || '';
            const storedComparison = this.storedComparisons.get(productId);
            if (storedComparison) {
                let comparisonDiv = itemElement.querySelector(this.selectors.cartPage.priceComparison);
                if (!comparisonDiv) {
                    itemElement.insertAdjacentHTML('beforeend', storedComparison);
                }
            }
        });
        const storedSummary = this.storedComparisons.get('cartSummary');
        if (storedSummary) {
            let summaryDiv = document.getElementById(this.selectors.summary.container);
            if (!summaryDiv) {
                this.insertSummaryDiv(storedSummary);
            }
        }
    }
    getCartState() {
        const cartItems = document.querySelectorAll(this.selectors.cartPage.cartItem);
        console.log("Found", cartItems.length, "cart items");
        const state = Array.from(cartItems).map(item => {
            const id = item.firstElementChild ? item.firstElementChild.getAttribute('data-testid')?.split('_').pop() : '';
            const quantityInput = item.querySelector(this.selectors.cartPage.quantityInput);
            const quantity = quantityInput ? quantityInput.value : '1';
            console.log("Cart item:", id, "Quantity:", quantity);
            return `${id}:${quantity}`;
        }).join(',');
        return state;
    }
    setupCartObserver() {
        try {
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
                const desktopContainer = document.querySelector(this.selectors.cartContainer.desktop);
                const mobileContainer = document.querySelector(this.selectors.cartContainer.mobile);
                const cartContainer = desktopContainer || mobileContainer;
                if (cartContainer) {
                    this.cartObserver?.observe(cartContainer, { childList: true, subtree: true });
                    console.log("Cart observer attached to", desktopContainer ? "desktop" : "mobile", "container");
                    return true;
                }
                console.log("Cart container not found, will retry");
                return false;
            };
            const attemptAttachment = (retries = 0, maxRetries = 20) => {
                if (attachObserver())
                    return;
                if (retries < maxRetries) {
                    setTimeout(() => attemptAttachment(retries + 1), 500);
                }
                else {
                    const error = new Error("Failed to attach cart observer after maximum retries");
                    ErrorUtils.handleError(error, 'CartPage.setupCartObserver', 'Při porovnávání cen se něco pokazilo, už na tom pracujeme.');
                }
            };
            attemptAttachment();
            const handleResize = this.debounce(() => {
                console.log("Significant resize detected, checking if reattachment is necessary");
                const desktopContainer = document.querySelector(this.selectors.cartContainer.desktop);
                const mobileContainer = document.querySelector(this.selectors.cartContainer.mobile);
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
            const cartContainer = document.querySelector(this.selectors.cartContainer.desktop) ||
                document.querySelector(this.selectors.cartContainer.mobile);
            if (cartContainer) {
                this.resizeObserver.observe(cartContainer);
                console.log("ResizeObserver attached to cart container");
            }
            else {
                console.error("Cart container not found for ResizeObserver");
            }
        }
        catch (error) {
            ErrorUtils.handleError(error, 'CartPage.setupCartObserver', 'Nepodařilo se nastavit sledování změn v košíku. Zkuste obnovit stránku.');
        }
    }
    attachCartEventListeners() {
        console.log("Attaching cart event listeners");
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.parentElement?.matches(`${this.selectors.cartPage.quantityDecrease}, ${this.selectors.cartPage.quantityIncrease}`)) {
                const productId = (target.closest(this.selectors.cartPage.cartItem)?.querySelector(this.selectors.cartPage.productLink)).href.split('-').pop() || null;
                const quantityInput = target.closest(this.selectors.cartPage.cartItem)?.querySelector(this.selectors.cartPage.quantityInput);
                const newQuantity = parseInt(quantityInput.value);
                if (productId) {
                    this.updateQuantity(productId, newQuantity);
                }
            }
        });
        document.addEventListener('input', this.debounce((event) => {
            const target = event.target;
            if (target.matches(this.selectors.cartPage.quantityInput)) {
                const productId = (target.closest(this.selectors.cartPage.cartItem)?.querySelector(this.selectors.cartPage.productLink)).href.split('-').pop() || null;
                const newQuantity = parseInt(target.value);
                if (productId) {
                    this.cart?.removeItem(productId);
                    setTimeout(() => this.compareCartPrices(), 250);
                }
            }
        }, 250));
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('toggle-unavailable') || target.classList.contains('toggle-cheaper-items')) {
                event.preventDefault();
                const country = target.getAttribute('data-country');
                const itemsDiv = document.querySelector(`.${target.classList.contains('toggle-unavailable') ? 'unavailable-items' : 'cheaper-items'}[data-country="${country}"]`);
                if (itemsDiv) {
                    if (itemsDiv.style.display === 'none') {
                        itemsDiv.style.display = 'block';
                        target.textContent = target.textContent.replace(')', ' - skrýt)');
                    }
                    else {
                        itemsDiv.style.display = 'none';
                        target.textContent = target.textContent.replace(' - skrýt)', ')');
                    }
                }
            }
        });
    }
    insertSummaryDiv(summaryHTML) {
        console.log("Inserting summary div");
        let summaryDiv = document.getElementById(this.selectors.summary.container);
        if (!summaryDiv) {
            summaryDiv = this.createSummaryDiv();
        }
        const contentWrapper = summaryDiv.querySelector('.summary-content');
        const loadingIndicator = summaryDiv.querySelector('.loading-indicator');
        contentWrapper.innerHTML = summaryHTML;
        contentWrapper.style.display = 'block';
        loadingIndicator.style.display = 'none';
        const insertAttempt = () => {
            const targetElement = document.querySelector(this.selectors.summary.insertTarget);
            if (targetElement && targetElement.parentNode) {
                console.log("Target element found, inserting summary div");
                targetElement.appendChild(summaryDiv);
            }
            else {
                console.log("Target element for summary not found, retrying in 500ms");
                setTimeout(insertAttempt, 500);
            }
        };
        insertAttempt();
    }
    generateCartSummaryHTML(cartItems) {
        const { totalDifference, differenceCheaperItems, optimalSavings, unavailableCounts, optimalPurchaseStrategy, unavailableItems } = this.calculateSavings(cartItems);
        let html = '<h3 style="font-size: 1.35rem;">Srovnání cen</h3>';
        html += '<br><strong style="font-size: 1.2rem;">Pouze levnější položky</strong><br>';
        html += '<span style="font-size: 0.8rem;">V dané zemi byste nakoupili jen levnější zboží a zbytek v ČR.</span><br><br>';
        const sortedCheaperItems = Object.entries(differenceCheaperItems).sort((a, b) => b[1] - a[1]);
        for (const [country, savings] of sortedCheaperItems) {
            const cheaperItemsCount = this.getCheaperItemsCount(cartItems, country);
            html += `<strong>${country}:</strong> <span ${savings > 0 ? 'style="color: green;"' : 'style="color: red;"'}>${savings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(savings > 0 ? savings : -savings)}</span>`;
            if (cheaperItemsCount > 0) {
                html += ` <a href="#" class="toggle-cheaper-items" data-country="${country}" style="font-size: 0.8rem;">(${cheaperItemsCount} ${cheaperItemsCount === 1 ? 'položka' : 'položky'})</a>`;
                html += `<div class="cheaper-items" data-country="${country}" style="display: none; font-size: 0.8em; margin-bottom: -1rem;">`;
                html += 'Levnější položky:<br>';
                html += `<ul style="margin-left: 1em;">`;
                cartItems.forEach(item => {
                    const countryData = item.otherCountries.find(c => c.name === country);
                    if (countryData && countryData.isAvailable && countryData.totalPrice < item.localPriceForQuantity) {
                        const savings = item.localPriceForQuantity - countryData.totalPrice;
                        html += `<li><a href="${countryData.url}" target="_blank" style="color: inherit; text-decoration: none;">${item.quantity}× ${item.productName}</a> (-${IkeaPriceUtils.formatPrice(savings)})<br>`;
                    }
                });
                html += '</ul></div>';
            }
            html += '<br>';
        }
        html += '<br><strong style="font-size: 1.2rem;">Celý nákup v jedné zemi</strong><br>';
        html += '<span style="font-size: 0.8rem;">V dané zemi byste nakoupili všechno zboží, nehledě na to, jestli je levnější než v ČR.</span><br><br>';
        const sortedSavings = Object.entries(totalDifference).sort((a, b) => b[1] - a[1]);
        for (const [country, savings] of sortedSavings) {
            const unavailableCount = unavailableCounts[country];
            html += `<strong>${country}:</strong> <span ${savings > 0 ? 'style="color: green;"' : 'style="color: red;"'}>${savings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(savings > 0 ? savings : -savings)}</span>`;
            if (unavailableCount > 0) {
                html += ` <a href="#" class="toggle-unavailable" data-country="${country}" style="font-size: 0.8rem;">(${unavailableCount} ${unavailableCount === 1 ? 'položka nedostupná' : 'položky nedostupné'})</a>`;
                html += `<div class="unavailable-items" data-country="${country}" style="display: none; font-size: 0.8em; margin-bottom: -1rem;">`;
                html += 'Nedostupné položky:<br>';
                html += `<ul style="margin-left: 1em;">`;
                unavailableItems[country].forEach(item => {
                    html += `<li><a href="${item.url}" target="_blank" style="color: inherit; text-decoration: none;">${item.name}</a><br>`;
                });
                html += '</ul></div>';
            }
            html += '<br>';
        }
        html += '<br><strong style="font-size: 1.2rem;">Nejlevnější zboží v každé zemi</strong><br>';
        html += '<span style="font-size: 0.8rem;">Každou položku byste nakoupili tam, kde je nejlevnější.</span><br>';
        html += `<br><strong>Celkový rozdíl:</strong> <span ${optimalSavings > 0 ? 'style="color: green;"' : ''}>${optimalSavings > 0 ? '-' : '+'}${IkeaPriceUtils.formatPrice(optimalSavings)}</span><br><br>`;
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
                html += `<li>${item.quantity}× <a href="${item.url}" target="_blank" style="color: inherit; text-decoration: none;">${item.productName}</a>:<br><span style="white-space: nowrap;">${IkeaPriceUtils.formatPrice(item.price)}</span>`;
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
        let totalDifference = {}; // total difference between local prices and prices in that country (including more expensive items)
        let differenceCheaperItems = {}; // savings if only items cheaper than local price were purchased in that country
        let optimalSavings = 0;
        let unavailableCounts = {};
        let unavailableItems = {};
        let optimalPurchaseStrategy = [];
        cartItems.forEach(item => {
            // initially, assume that the cheapest country is the local one, i.e. Czechia
            let cheapestPrice = item.localPriceForQuantity;
            let cheapestCountry = 'Česko';
            let cheapestUrl = item.url;
            // iterate over all other countries and find the cheapest one
            item.otherCountries.forEach((result) => {
                // initiate unavailable count for this country
                if (!unavailableCounts[result.name]) {
                    unavailableCounts[result.name] = 0;
                }
                // if the product is not available in this country, increment the unavailable count
                if (!result.isAvailable) {
                    unavailableCounts[result.name]++;
                    if (!unavailableItems[result.name]) {
                        unavailableItems[result.name] = [];
                    }
                    unavailableItems[result.name].push({
                        name: item.productName,
                        url: item.url
                    });
                    return;
                }
                // initiate total difference for this country
                if (!totalDifference[result.name]) {
                    totalDifference[result.name] = 0;
                }
                // initiate difference for cheaper items for this country
                if (!differenceCheaperItems[result.name]) {
                    differenceCheaperItems[result.name] = 0;
                }
                // update total difference by adding the difference between the local price for this item and the price in this country
                totalDifference[result.name] += item.localPriceForQuantity - result.totalPrice;
                // if the price in this country is cheaper than the local price for this item, update the difference for cheaper items
                if (result.totalPrice < item.localPriceForQuantity) {
                    differenceCheaperItems[result.name] += item.localPriceForQuantity - result.totalPrice;
                }
                // if the price in this country is cheaper than the cheapest price found so far, update the cheapest price and country
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
        return { totalDifference, differenceCheaperItems, optimalSavings, unavailableCounts, optimalPurchaseStrategy, unavailableItems };
    }
    getCheaperItemsCount(cartItems, country) {
        return cartItems.filter(item => {
            const countryData = item.otherCountries.find(c => c.name === country);
            return countryData && countryData.isAvailable && countryData.totalPrice < item.localPriceForQuantity;
        }).length;
    }
    showSummaryLoadingIndicator() {
        let summaryDiv = document.getElementById(this.selectors.summary.container);
        if (!summaryDiv) {
            summaryDiv = this.createSummaryDiv();
            const targetElement = document.querySelector(this.selectors.summary.insertTarget);
            if (targetElement && targetElement.parentNode) {
                targetElement.parentNode.appendChild(summaryDiv);
            }
        }
        const contentWrapper = summaryDiv.querySelector('.summary-content');
        const loadingIndicator = summaryDiv.querySelector('.loading-indicator');
        contentWrapper.style.display = 'none';
        loadingIndicator.style.display = 'flex';
    }
    hideAllLoadingIndicators() {
        const cartItemElements = document.querySelectorAll(this.selectors.cartPage.cartItem);
        this.updateLoadingState(cartItemElements, false);
        const summaryDiv = document.getElementById(this.selectors.summary.container);
        if (summaryDiv) {
            DisplayUtils.hideLoadingIndicator(summaryDiv);
        }
    }
    createSummaryDiv() {
        const summaryDiv = document.createElement('div');
        summaryDiv.id = this.selectors.summary.container;
        summaryDiv.style.cssText = 'background-color: #e6f7ff; padding: 15px; margin-top: 20px; border-radius: 5px; font-size: 1.1em;';
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('summary-content');
        const loadingIndicator = DisplayUtils.createLoadingIndicator();
        loadingIndicator.classList.add('loading-indicator');
        loadingIndicator.style.display = 'none';
        summaryDiv.appendChild(contentWrapper);
        summaryDiv.appendChild(loadingIndicator);
        return summaryDiv;
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
