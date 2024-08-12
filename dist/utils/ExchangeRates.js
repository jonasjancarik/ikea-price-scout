// exchange-rates.ts
export const ExchangeRates = {
    exchangeRates: {},
    async getExchangeRates() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error receiving exchange rates:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (!response) {
                    reject('No response received from background script.');
                    return;
                }
                this.exchangeRates = response;
                resolve(this.exchangeRates);
            });
        });
    },
    getRates() {
        return this.exchangeRates;
    }
};
