// exchange-rates.js
var IkeaExchangeRates = (function () {
    let exchangeRates = {};

    function getExchangeRates() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "getExchangeRates" }, (response) => {
                exchangeRates = response;
                resolve(exchangeRates);
            });
        });
    }

    return {
        getExchangeRates: getExchangeRates,
        getRates: function () { return exchangeRates; }
    };
})();