export const ExchangeRates = {
    exchangeRates: {},
    async getExchangeRates() {
        try {
            // Background script now handles GitHub → CNB fallback automatically
            const rates = await this.fetchFromBackground();
            if (rates && Object.keys(rates).length > 0) {
                this.exchangeRates = rates;
                return rates;
            }
        }
        catch (error) {
            console.warn('⚠️ Background script failed, using cached/default rates:', error instanceof Error ? error.message : String(error));
        }
        // Ultimate fallback: Use cached rates or minimal defaults
        const cachedRates = await this.getCachedRates();
        console.log('⚠️ Using cached/default rates:', Object.keys(cachedRates).length, 'currencies');
        this.exchangeRates = cachedRates;
        return cachedRates;
    },
    async fetchFromBackground() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Background script error: ' + chrome.runtime.lastError.message));
                    return;
                }
                if (!response || Object.keys(response).length === 0) {
                    reject(new Error('No response from background script'));
                    return;
                }
                resolve(response);
            });
        });
    },
    async getCachedRates() {
        // Try to get cached rates from local storage
        try {
            const result = await chrome.storage.local.get(['cachedExchangeRates']);
            if (result.cachedExchangeRates && Object.keys(result.cachedExchangeRates).length > 0) {
                return result.cachedExchangeRates;
            }
        }
        catch (error) {
            console.warn('Failed to get cached rates:', error);
        }
        // Ultimate fallback: minimal default rates (approximate values)
        return {
            'USD': 24.25,
            'EUR': 25.12,
            'GBP': 30.45,
            'JPY': 0.16,
            'PLN': 6.05,
            'CZK': 1.0
        };
    },
    getRates() {
        return this.exchangeRates;
    }
};
