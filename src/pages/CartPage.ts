import { Cart } from '../models/Cart.js';
import { ProductItem } from '../models/ProductItem.js';
import { DisplayUtils } from '../utils/DisplayUtils.js';
import { IkeaDomUtils } from '../utils/DomUtils.js';
import { Selectors } from '../selectors/selectors.js';

export class CartPage {
    private cart: Cart | null = null;
    private lastCartState = '';
    private storedComparisons = new Map<string, string>();
    private cartObserver: MutationObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private entriesSeen = new Set<Element>();
    private lastWidth: number = 0;

    async initialize(): Promise<void> {
        await this.compareCartPrices(); // Immediate initial comparison
        this.setupCartObserver();
        this.attachCartEventListeners();
    }

    private async compareCartPrices(): Promise<void> {
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
                    const productId = (itemElement.querySelector(Selectors.cartPage.productLink) as HTMLAnchorElement).href.split('-').pop() || '';
                    const localPriceElement = itemElement.querySelector(Selectors.cartPage.priceElement);
                    if (!localPriceElement) {
                        throw new Error('Local price element not found');
                    }

                    let localPrice = parseFloat(itemElement.querySelector(Selectors.cartPage.priceInteger)?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');

                    // check if the displayed price is the discounted price - in that case, use the other price field
                    if (itemElement.querySelector(Selectors.cartPage.priceModuleAddon)?.textContent?.includes('Původní cena')) {
                        localPrice = parseFloat(itemElement.querySelector(Selectors.cartPage.discountedPriceInteger)?.textContent?.trim().replace(/[^0-9.,]/g, '') || '0');
                    }

                    const quantityInput = itemElement.querySelector(Selectors.cartPage.quantityInput) as HTMLInputElement;
                    const quantity = parseInt(quantityInput.value);
                    const nameElement = itemElement.querySelector(Selectors.cartPage.nameDecorator);
                    const descriptionElement = itemElement.querySelector(Selectors.cartPage.description);
                    const productName = `${nameElement?.textContent?.trim()} - ${descriptionElement?.textContent?.trim()}`;

                    await this.cart!.addItem(productName, productId, localPrice, quantity);
                });

                await Promise.all(cartItemPromises);
                const cartItems = this.cart.getItems();
                if (cartItems.length > 0) {
                    this.updateCartComparisons(cartItems);
                }
                this.lastCartState = currentCartState;
            } catch (error) {
                console.error("Error in compareCartPrices:", error);
            }
        } else {
            console.log("Cart state unchanged, reapplying stored comparisons");
            this.reapplyStoredComparisons();
        }
    }

    private updateCartComparisons(cartItems: ProductItem[]): void {
        const cartItemElements = document.querySelectorAll(Selectors.cartPage.cartItem);
        cartItemElements.forEach((itemElement) => {
            const productId = (itemElement.querySelector(Selectors.cartPage.productLink) as HTMLAnchorElement).href.split('-').pop() || '';
            const cartItem = cartItems.find(item => item.id === productId);
            if (cartItem) {
                const comparisonHTML = DisplayUtils.generateComparisonHTML(cartItem);
                let comparisonDiv = itemElement.querySelector(Selectors.cartPage.priceComparison);
                if (!comparisonDiv) {
                    comparisonDiv = DisplayUtils.createComparisonDiv(comparisonHTML);
                    comparisonDiv.classList.add('ikea-price-comparison');
                    IkeaDomUtils.insertAfterElement(Selectors.cartPage.primaryCurrencyPrice, comparisonDiv, itemElement as HTMLElement);
                } else {
                    comparisonDiv.innerHTML = comparisonHTML;
                }
                this.storedComparisons.set(productId, comparisonDiv.outerHTML);
            }
        });

        const summaryHTML = DisplayUtils.updateCartSummary(cartItems);
        this.storedComparisons.set('cartSummary', summaryHTML);
    }

    private reapplyStoredComparisons(): void {
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
                DisplayUtils.insertSummaryDiv(storedSummary);
            }
        }
    }

    private getCartState(): string {
        const cartItems = document.querySelectorAll(Selectors.cartPage.cartItem);
        console.log("Found", cartItems.length, "cart items");
        const state = Array.from(cartItems).map(item => {
            const id = item.firstElementChild ? item.firstElementChild.getAttribute('data-testid')?.split('_').pop() : '';
            const quantityInput = item.querySelector(Selectors.cartPage.quantityInput) as HTMLInputElement;
            const quantity = quantityInput ? quantityInput.value : '1';
            console.log("Cart item:", id, "Quantity:", quantity);
            return `${id}:${quantity}`;
        }).join(',');
        return state;
    }

    private setupCartObserver(): void {
        let cartMutationCount = 0;

        console.log("Setting up cart observer");
        this.cartObserver = new MutationObserver(this.debounce(() => {
            console.log("Cart mutation observed");
            if (cartMutationCount === 0) {
                this.compareCartPrices();
            }
            cartMutationCount += 1;
        }, 50));

        const attachObserver = (): boolean => {
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

        const attemptAttachment = (retries: number = 0, maxRetries: number = 10): void => {
            if (attachObserver()) return;
            if (retries < maxRetries) {
                setTimeout(() => attemptAttachment(retries + 1), 500);
            } else {
                console.error("Failed to attach cart observer after maximum retries");
            }
        };

        attemptAttachment();

        const handleResize = this.debounce(() => {
            console.log("Significant resize detected, checking if reattachment is necessary");
            const desktopContainer = document.querySelector(Selectors.cartContainer.desktop);
            const mobileContainer = document.querySelector(Selectors.cartContainer.mobile);
            const currentContainer = desktopContainer || mobileContainer;

            if (currentContainer && !currentContainer.contains(this.cartObserver?.takeRecords()[0]?.target as Node)) {
                console.log("Cart container changed, reattaching observer");
                this.cartObserver?.disconnect();
                this.cartObserver?.observe(currentContainer, { childList: true, subtree: true });
            }

            this.reapplyStoredComparisons();
        }, 250);

        this.resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (!this.entriesSeen.has(entry.target as Element)) {
                    this.entriesSeen.add(entry.target as Element);
                    this.lastWidth = entry.contentRect.width;
                } else {
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
        } else {
            console.error("Cart container not found for ResizeObserver");
        }
    }

    private attachCartEventListeners(): void {
        console.log("Attaching cart event listeners");

        document.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.parentElement?.matches(`${Selectors.cartPage.quantityDecrease}, ${Selectors.cartPage.quantityIncrease}`)) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink) as HTMLAnchorElement).href.split('-').pop() || null;
                const quantityInput = target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.quantityInput) as HTMLInputElement;
                const newQuantity = parseInt(quantityInput.value);
                this.compareCartPrices();
            }
        });

        document.addEventListener('input', this.debounce((event: Event) => {
            const target = event.target as HTMLElement;
            if (target.matches(Selectors.cartPage.quantityInput)) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink) as HTMLAnchorElement).href.split('-').pop() || null;
                const newQuantity = parseInt((target as HTMLInputElement).value);
                this.compareCartPrices();
            }
        }, 250));

        document.addEventListener('click', (event: Event) => {
            const target = event.target as HTMLElement;
            const parentElement = target?.parentElement;
            const dataTestIdAttr = parentElement?.attributes.getNamedItem('data-testid');

            if (dataTestIdAttr && dataTestIdAttr.value.startsWith('remove')) {
                const productId = (target.closest(Selectors.cartPage.cartItem)?.querySelector(Selectors.cartPage.productLink) as HTMLAnchorElement).href.split('-').pop() || null;
                if (productId) {
                    this.cart?.removeItem(productId);
                    setTimeout(() => this.compareCartPrices(), 250);
                }
            }
        });
    }

    private debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
        let debounceTimer: ReturnType<typeof setTimeout>;
        return (...args: Parameters<F>) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    public cleanup(): void {
        this.cartObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.storedComparisons.clear();
        this.entriesSeen.clear();
    }
}