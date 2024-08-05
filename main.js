// main.js
(function () {
    let cartObserver;
    let resizeObserver;
    let lastCartState = '';
    let storedComparisons = new Map();
    let cart;

    async function initializeExtension() {
        console.log("Initializing extension");
        await IkeaExchangeRates.getExchangeRates();
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
        setupCartObserver();
    }

    function setupCartObserver() {
        const cartObserver = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log("#one-checkout changed, initializing cart functionality");
                    initializeCartFunctionality();
                    cartObserver.disconnect();
                    break;
                }
            }
        });

        const cartElement = document.getElementById('one-checkout');
        if (cartElement) {
            cartObserver.observe(cartElement, { childList: true, subtree: true });
        } else {
            console.log("#one-checkout not found, retrying in 1000ms");
            setTimeout(setupCartObserver, 1000);
        }
    }

    async function initializeCartFunctionality() {
        console.log("Initializing cart functionality");
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
                cart = new Cart();
                const cartItemElements = document.querySelectorAll('.product_product__pvcUf');
                for (const itemElement of cartItemElements) {
                    // I'd like to be able to use const productId = itemElement.getAttribute('data-product-id'); but that ID doesn't work for constructing the URL, it's missing e.g. the s prefix, which is there sometimes but not always - investigate
                    const productId = itemElement.querySelector('.cart-ingka-link').href.split('-').pop();
                    const localPriceElement = itemElement.querySelector('.cart-ingka-price__sr-text');
                    const localPrice = parseFloat(localPriceElement.textContent.trim().replace(/[^0-9.,]/g, '').replace(',', '.'));
                    const quantity = parseInt(itemElement.querySelector('.cart-ingka-quantity-stepper__input').value);
                    const nameElement = itemElement.querySelector('.cart-ingka-price-module__name-decorator');
                    const descriptionElement = itemElement.querySelector('.cart-ingka-price-module__description');
                    const productName = `${nameElement.textContent.trim()} - ${descriptionElement.textContent.trim()}`;

                    await cart.addItem(productName, productId, localPrice / quantity, quantity);
                }
                const cartItems = cart.getComparisonData();
                updateCartComparisons(cartItems);
                lastCartState = currentCartState;
            } catch (error) {
                console.error("Error in compareCartPrices:", error);
            }
        } else {
            console.log("Cart state unchanged, reapplying stored comparisons");
            reapplyStoredComparisons();
        }
    }

    function updateCartComparisons(cartItems) {
        const cartItemElements = document.querySelectorAll('.product_product__pvcUf');
        cartItemElements.forEach((itemElement) => {
            const productId = itemElement.querySelector('.cart-ingka-link').href.split('-').pop();
            const cartItem = cartItems.find(item => item.id === productId);
            if (cartItem) {
                const comparisonHTML = IkeaDisplayUtils.generateComparisonHTML(cartItem);
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

        const summaryHTML = IkeaDisplayUtils.updateCartSummary(cartItems);
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
        document.querySelectorAll('.cart-ingka-quantity-stepper__input').forEach(input => {
            input.addEventListener('change', debounce((event) => {
                const productId = event.target.closest('.product_product__pvcUf').getAttribute('data-product-id');
                const newQuantity = parseInt(event.target.value);
                cart.updateItemQuantity(productId, newQuantity);
                compareCartPrices();
            }, 500));
        });

        document.querySelectorAll('.cart-ingka-product-actions__button').forEach(button => {
            if (button.textContent.trim().toLowerCase() === 'remove') {
                button.addEventListener('click', (event) => {
                    const productId = event.target.closest('.product_product__pvcUf').getAttribute('data-product-id');
                    cart.removeItem(productId);
                    setTimeout(compareCartPrices, 500);
                });
            }
        });
    }

    function debounce(func, delay) {
        let debounceTimer;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        }
    }

    window.addEventListener('load', initializeExtension);

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log("URL changed, calling initializeExtension");
            if (cartObserver) cartObserver.disconnect();
            if (resizeObserver) resizeObserver.disconnect();
            storedComparisons.clear();
            initializeExtension();
        }
    }).observe(document, { subtree: true, childList: true });

    console.log("Script loaded");
})();