// main.js
(function () {
    let cartObserver;
    let resizeObserver;
    let lastCartState = '';
    let storedComparisons = new Map(); // Store our added elements

    function initializeExtension() {
        console.log("Initializing extension");
        if (isProductPage()) {
            initializeProductPage();
        } else if (isCartPage()) {
            initializeCartPage();
        } else {
            console.log("Not a product or cart page");
        }
    }

    function isProductPage() {
        return window.location.pathname.includes('/p/');
    }

    function isCartPage() {
        return window.location.pathname.includes('/shoppingcart/');
    }

    function initializeProductPage() {
        console.log("Initializing product page functionality");
        IkeaProductPage.compareProductPrice();
    }

    function initializeCartPage() {
        console.log("Initializing cart page functionality");
        setupOneCheckoutObserver();
    }

    function setupOneCheckoutObserver() {
        const oneCheckoutObserver = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log("#one-checkout changed, initializing cart functionality");
                    initializeCartFunctionality();
                    oneCheckoutObserver.disconnect(); // Stop observing once initialized
                    break;
                }
            }
        });

        const oneCheckoutElement = document.getElementById('one-checkout');
        if (oneCheckoutElement) {
            oneCheckoutObserver.observe(oneCheckoutElement, { childList: true, subtree: true });
        } else {
            console.log("#one-checkout not found, retrying in 1000ms");
            setTimeout(setupOneCheckoutObserver, 1000);
        }
    }

    async function initializeCartFunctionality() {
        console.log("Initializing cart functionality");
        await IkeaExchangeRates.getExchangeRates();
        console.log("Exchange rates fetched");
        await compareCartPrices();
        setupCartObserver();
    }

    async function compareCartPrices() {
        console.log("compareCartPrices function called");
        const currentCartState = getCartState();
        console.log("Current cart state:", currentCartState);
        console.log("Last cart state:", lastCartState);
        if (currentCartState !== lastCartState || lastCartState === '') {
            console.log("Cart state changed or initial load, updating comparisons");
            try {
                const comparisonResults = await IkeaCartComparison.compareCartPrices();
                console.log("Comparison results:", comparisonResults);
                updateCartComparisons(comparisonResults);
                lastCartState = currentCartState;
            } catch (error) {
                console.error("Error in compareCartPrices:", error);
            }
        } else {
            console.log("Cart state unchanged, reapplying stored comparisons");
            reapplyStoredComparisons();
        }
    }

    function updateCartComparisons(comparisonResults) {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        comparisonResults.forEach((result, index) => {
            const itemElement = cartItems[index];
            if (itemElement && result) {
                const productId = itemElement.getAttribute('data-product-id');
                const comparisonHTML = IkeaDisplayUtils.generateComparisonHTML(result.localPriceNum, result.adjustedComparisonResults, result.quantity);
                let comparisonDiv = itemElement.querySelector('.ikea-price-comparison');
                if (!comparisonDiv) {
                    comparisonDiv = IkeaDisplayUtils.createComparisonDiv(comparisonHTML);
                    comparisonDiv.classList.add('ikea-price-comparison');
                    IkeaDomUtils.insertAfterElement('.cart-ingka-price-module__primary-currency-price', comparisonDiv, itemElement);
                } else {
                    comparisonDiv.innerHTML = comparisonHTML;
                }
                storedComparisons.set(productId, comparisonDiv.outerHTML);
            }
        });

        const summaryHTML = IkeaDisplayUtils.updateCartSummary(comparisonResults);
        storedComparisons.set('cartSummary', summaryHTML);
    }

    function reapplyStoredComparisons() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        cartItems.forEach(itemElement => {
            const productId = itemElement.getAttribute('data-product-id');
            const storedComparison = storedComparisons.get(productId);
            if (storedComparison) {
                let comparisonDiv = itemElement.querySelector('.ikea-price-comparison');
                if (!comparisonDiv) {
                    itemElement.insertAdjacentHTML('beforeend', storedComparison);
                }
            }
        });

        // Reapply cart summary
        const storedSummary = storedComparisons.get('cartSummary');
        if (storedSummary) {
            let summaryDiv = document.getElementById('ikea-price-comparison-summary');
            if (!summaryDiv) {
                IkeaDisplayUtils.insertSummaryDiv(storedSummary);
            }
        }
    }

    function getCartState() {
        const cartItems = document.querySelectorAll('.product_product__pvcUf');
        console.log("Found", cartItems.length, "cart items");
        const state = Array.from(cartItems).map(item => {
            const id = item.firstElementChild ? item.firstElementChild.getAttribute('data-testid').split('_').pop() : '';
            const quantityInput = item.querySelector('.cart-ingka-quantity-stepper__input');
            const quantity = quantityInput ? quantityInput.value : '1';
            console.log("Cart item:", id, "Quantity:", quantity);
            return `${id}:${quantity}`;
        }).join(',');
        console.log("Cart state:", state);
        return state;
    }

    function setupCartObserver() {
        console.log("Setting up cart observer");
        cartObserver = new MutationObserver(debounce(() => {
            console.log("Cart mutation observed");
            compareCartPrices();
        }, 500));

        function attachObserver() {
            const desktopContainer = document.querySelector('.shoppingBag_desktop_contentGrid__RPQ4V');
            const mobileContainer = document.querySelector('.shoppingBag_mobile_contentGrid__wLMZ7');
            const cartContainer = desktopContainer || mobileContainer;

            if (cartContainer) {
                cartObserver.observe(cartContainer, { childList: true, subtree: true });
                console.log("Cart observer attached to", desktopContainer ? "desktop" : "mobile", "container");
                attachCartEventListeners();
                return true;
            }
            console.log("Cart container not found, will retry");
            return false;
        }

        function attemptAttachment(retries = 0, maxRetries = 10) {
            if (attachObserver()) return;
            if (retries < maxRetries) {
                setTimeout(() => attemptAttachment(retries + 1), 1000);
            } else {
                console.error("Failed to attach cart observer after maximum retries");
            }
        }

        attemptAttachment();

        // Add resize observer to handle layout changes
        resizeObserver = new ResizeObserver(debounce(() => {
            console.log("Window resized, reattaching cart observer and reapplying comparisons");
            cartObserver.disconnect();
            attemptAttachment();
            reapplyStoredComparisons();
        }, 500));

        resizeObserver.observe(document.body);
    }

    function attachCartEventListeners() {
        console.log("Attaching cart event listeners");
        // Listen for quantity changes
        document.querySelectorAll('.cart-ingka-quantity-stepper__input').forEach(input => {
            input.addEventListener('change', debounce(compareCartPrices, 500));
        });

        // Listen for remove item actions
        document.querySelectorAll('.cart-ingka-product-actions__button').forEach(button => {
            if (button.textContent.trim().toLowerCase() === 'remove') {
                button.addEventListener('click', () => {
                    // Wait for the DOM to update before recalculating
                    setTimeout(compareCartPrices, 500);
                });
            }
        });
    }

    // Debounce function to limit how often the comparison is triggered
    function debounce(func, delay) {
        let debounceTimer;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        }
    }

    // Run main function when the page loads
    window.addEventListener('load', initializeExtension);

    // Also run main function when the URL changes without a full page reload
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log("URL changed, calling initializeExtension");
            if (cartObserver) cartObserver.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
            storedComparisons.clear(); // Clear stored comparisons on URL change
            initializeExtension();
        }
    }).observe(document, { subtree: true, childList: true });

    console.log("Script loaded");
})();