// background.ts

interface ExchangeRates {
    [currencyCode: string]: number;
}

let exchangeRates: ExchangeRates = {};

async function fetchExchangeRates(): Promise<void> {
    const url = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
    try {
        const response = await fetch(url);
        const text = await response.text();
        const lines = text.split('\n').slice(2); // Skip the first two lines
        lines.forEach(line => {
            const [, , , code, rate] = line.split('|');
            if (code && rate) {
                exchangeRates[code] = parseFloat(rate.replace(',', '.'));
            }
        });
        console.log('Exchange rates fetched:', exchangeRates);
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
}

// Fetch exchange rates when the background script starts
fetchExchangeRates();

// Set up a listener for messages from the content script
// @ts-ignore
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getExchangeRates") {
        sendResponse(exchangeRates);
    }
});

// Optionally, set up periodic refresh of exchange rates (e.g., every hour)
setInterval(fetchExchangeRates, 3600000); // 3600000 ms = 1 hour