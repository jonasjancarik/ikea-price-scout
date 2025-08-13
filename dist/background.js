"use strict";
// background.ts
let exchangeRates = {};
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
// Function to fetch exchange rates from GitHub (primary) or CNB (fallback)
async function fetchExchangeRates() {
    try {
        // Primary: Try GitHub-hosted rates (comprehensive coverage)
        const githubRates = await fetchFromGitHub();
        if (githubRates && Object.keys(githubRates).length > 30) {
            console.log('✅ Background: Using GitHub-hosted exchange rates:', Object.keys(githubRates).length, 'currencies');
            return githubRates;
        }
    }
    catch (error) {
        console.warn('⚠️ Background: GitHub rates failed, trying CNB fallback:', error instanceof Error ? error.message : String(error));
    }
    try {
        // Fallback: Czech National Bank
        const cnbRates = await fetchFromCNB();
        console.log('✅ Background: Using CNB fallback rates:', Object.keys(cnbRates).length, 'currencies');
        return cnbRates;
    }
    catch (error) {
        console.error('❌ Background: All exchange rate sources failed:', error);
        throw error;
    }
}
// Fetch from GitHub-hosted exchange rates
async function fetchFromGitHub() {
    // TODO: Change back to 'main' before merging to production
    const branch = 'add-countries'; // For testing - use current branch
    const githubUrl = `https://raw.githubusercontent.com/janca/ikea-price-scout/${branch}/src/data/exchange_rates.json`;
    const response = await fetch(githubUrl, {
        cache: 'no-cache',
        headers: { 'Accept': 'application/json' }
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
        console.warn(`⚠️ Background: GitHub rates are stale (${Math.round(hoursDiff)} hours old)`);
    }
    console.log(`📊 Background: GitHub rates loaded: ${data.coverage?.totalCurrencies || Object.keys(data.rates).length} currencies, updated ${Math.round(hoursDiff)}h ago`);
    return data.rates;
}
// Fetch from Czech National Bank (fallback)
async function fetchFromCNB() {
    const url = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n').slice(2); // Skip the first two lines
    const newRates = {};
    lines.forEach(line => {
        const [, , , code, rate] = line.split('|');
        if (code && rate) {
            newRates[code] = parseFloat(rate.replace(',', '.'));
        }
    });
    return newRates;
}
// Function to get exchange rates, using cache if possible
async function getExchangeRates() {
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
function isTodayCET(timestamp) {
    const nowCET = new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' });
    const todayMidnightCET = new Date(nowCET);
    todayMidnightCET.setHours(0, 0, 0, 0);
    return timestamp >= todayMidnightCET.getTime();
}
// Function to cache exchange rates for fallback use
async function cacheExchangeRates(rates) {
    try {
        await chrome.storage.local.set({
            cachedExchangeRates: rates,
            cacheTimestamp: Date.now()
        });
    }
    catch (error) {
        console.warn('Failed to cache exchange rates:', error);
    }
}
// Fetch exchange rates immediately when the background script starts
getExchangeRates()
    .then(rates => {
    exchangeRates = rates;
    // Cache the rates for fallback use by ExchangeRatesService
    cacheExchangeRates(rates);
})
    .catch(console.error);
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
    getExchangeRates()
        .then(rates => {
        exchangeRates = rates;
        cacheExchangeRates(rates);
    })
        .catch(console.error);
}, 3600000); // 3600000 ms = 1 hour
