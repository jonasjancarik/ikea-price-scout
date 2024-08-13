// background.ts

interface ExchangeRates {
    [currencyCode: string]: number;
}

let exchangeRates: ExchangeRates = {};

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === "install" || details.reason === "update") {
        // Set default countries
        const defaultCountries = ['pl', 'de', 'at', 'sk'];
        chrome.storage.sync.get(['selectedCountries'], function (result) {
            if (!result.selectedCountries || result.selectedCountries.length === 0) {
                chrome.storage.sync.set({ selectedCountries: defaultCountries }, function () {
                    console.log('Default countries set on installation/update');
                });
            }
        });
    }
});

// Function to fetch exchange rates from the API
async function fetchExchangeRates(): Promise<ExchangeRates> {
    const url = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
    try {
        const response = await fetch(url);
        const text = await response.text();
        const lines = text.split('\n').slice(2); // Skip the first two lines
        const newRates: ExchangeRates = {};
        lines.forEach(line => {
            const [, , , code, rate] = line.split('|');
            if (code && rate) {
                newRates[code] = parseFloat(rate.replace(',', '.'));
            }
        });
        console.log('Exchange rates fetched:', newRates);
        return newRates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}

// Function to get exchange rates, using cache if possible
async function getExchangeRates(): Promise<ExchangeRates> {
    // Check if we have cached rates
    const { exchangeRates, lastFetched } = await chrome.storage.local.get(['exchangeRates', 'lastFetched']);

    if (exchangeRates && lastFetched && isTodayCET(lastFetched)) {
        console.log('Using cached exchange rates');
        return exchangeRates;
    }

    // If no valid cache, fetch new rates
    console.log('Fetching new exchange rates');
    const newRates = await fetchExchangeRates();
    await chrome.storage.local.set({ exchangeRates: newRates, lastFetched: Date.now() });
    return newRates;
}

// Function to check if the cached rates are from today (CET time zone)
function isTodayCET(timestamp: number): boolean {
    const nowCET = new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' });
    const todayMidnightCET = new Date(nowCET);
    todayMidnightCET.setHours(0, 0, 0, 0);
    return timestamp >= todayMidnightCET.getTime();
}

// Fetch exchange rates immediately when the background script starts
getExchangeRates().then(rates => exchangeRates = rates).catch(console.error);

// Set up a listener for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getExchangeRates") {
        getExchangeRates()
            .then(rates => sendResponse(rates))
            .catch(error => {
                console.error('Error sending exchange rates:', error);
                sendResponse({});
            });
        return true; // Indicates asynchronous sendResponse
    }
});

// Periodically refresh exchange rates (e.g., every hour)
setInterval(() => {
    getExchangeRates().then(rates => exchangeRates = rates).catch(console.error);
}, 3600000); // 3600000 ms = 1 hour