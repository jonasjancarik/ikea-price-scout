interface ExchangeRates {
    [currencyCode: string]: number;
}

export const ExchangeRates = {
    exchangeRates: {} as ExchangeRates,

    async getExchangeRates(): Promise<ExchangeRates> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response: ExchangeRates) => {
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

    getRates(): ExchangeRates {
        return this.exchangeRates;
    }
};