export const ExchangeRates = {
    exchangeRates: {},
    async getExchangeRates() {
        try {
            // Primary: Try GitHub-hosted rates (comprehensive coverage)
            const githubRates = await this.fetchFromGitHub();
            if (githubRates && Object.keys(githubRates).length > 30) {
                console.log('✅ Using GitHub-hosted exchange rates:', Object.keys(githubRates).length, 'currencies');
                this.exchangeRates = githubRates;
                return githubRates;
            }
        }
        catch (error) {
            console.warn('⚠️ GitHub rates failed, trying fallback:', error instanceof Error ? error.message : String(error));
        }
        try {
            // Fallback: Use background script (Czech National Bank)
            const cnbRates = await this.fetchFromBackground();
            if (cnbRates && Object.keys(cnbRates).length > 0) {
                console.log('✅ Using CNB fallback rates:', Object.keys(cnbRates).length, 'currencies');
                this.exchangeRates = cnbRates;
                return cnbRates;
            }
        }
        catch (error) {
            console.warn('⚠️ CNB fallback failed:', error instanceof Error ? error.message : String(error));
        }
        // Ultimate fallback: Use cached rates or minimal defaults
        const cachedRates = await this.getCachedRates();
        console.log('⚠️ Using cached/default rates:', Object.keys(cachedRates).length, 'currencies');
        this.exchangeRates = cachedRates;
        return cachedRates;
    },
    async fetchFromGitHub() {
        const githubUrl = 'https://raw.githubusercontent.com/janca/ikea-price-scout/main/src/data/exchange_rates.json';
        const response = await fetch(githubUrl, {
            cache: 'no-cache', // Always get fresh data
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        // Validate data structure
        if (!data.rates || !data.lastUpdated || !data.baseCurrency) {
            throw new Error('Invalid GitHub data structure');
        }
        // Check if rates are fresh (less than 3 days old)
        const lastUpdated = new Date(data.lastUpdated);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 3600);
        if (hoursDiff > 72) {
            console.warn(`⚠️ GitHub rates are stale (${Math.round(hoursDiff)} hours old)`);
            // Don't throw error, still use the rates but warn
        }
        // Validate critical currencies
        const criticalCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        const missingCritical = criticalCurrencies.filter(curr => !data.rates[curr]);
        if (missingCritical.length > 0) {
            throw new Error(`Missing critical currencies: ${missingCritical.join(', ')}`);
        }
        console.log(`📊 GitHub rates loaded: ${data.coverage.totalCurrencies} currencies, updated ${Math.round(hoursDiff)}h ago`);
        return data.rates;
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
