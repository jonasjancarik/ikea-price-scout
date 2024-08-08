// exchange-rates.ts
export const ExchangeRates = {
    exchangeRates: {},
    getExchangeRates() {
        return new Promise((resolve) => {
            // @ts-ignore
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response) => {
                this.exchangeRates = response;
                resolve(this.exchangeRates);
            });
        });
    },
    getRates() {
        return this.exchangeRates;
    }
};
