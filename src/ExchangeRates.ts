// exchange-rates.ts

interface ExchangeRates {
    [currencyCode: string]: number;
}

export const ExchangeRates = {
    exchangeRates: {} as ExchangeRates,

    getExchangeRates(): Promise<ExchangeRates> {
        return new Promise((resolve) => {
            // @ts-ignore
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response: ExchangeRates) => {
                this.exchangeRates = response;
                resolve(this.exchangeRates);
            });
        });
    },

    getRates(): ExchangeRates {
        return this.exchangeRates;
    }
};