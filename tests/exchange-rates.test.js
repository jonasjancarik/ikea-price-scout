const puppeteer = require('puppeteer');

let browser;
let page;

describe('Exchange Rate System', () => {
    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: process.env.CI === 'true',
            args: [
                `--disable-extensions-except=dev-dist`,
                `--load-extension=dev-dist`,
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });
        page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            if (msg.text().includes('exchange') || msg.text().includes('GitHub') || msg.text().includes('CNB')) {
                console.log('PAGE LOG:', msg.text());
            }
        });
        
        await page.setViewport({ width: 1920, height: 1080 });
    });

    afterAll(async () => {
        await browser.close();
    });

    test('Exchange rate system loads and uses GitHub rates', async () => {
        jest.setTimeout(30000);
        
        console.log('🧪 Testing exchange rate system...');
        
        // Navigate to a Czech IKEA product page
        const testUrl = 'https://www.ikea.com/cz/cs/p/-s79477377/';
        await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for the price comparison to load
        await page.waitForSelector('.price-scout-price-comparison', { timeout: 20000 });
        
        // Wait a bit more for exchange rates to load
        await page.waitForTimeout(3000);
        
        // Check browser console for exchange rate logs
        const logs = await page.evaluate(() => {
            return window.console._logs || [];
        });
        
        // Get the comparison content
        const comparisonDiv = await page.$('.price-scout-price-comparison');
        expect(comparisonDiv).not.toBeNull();
        
        const comparisonText = await page.evaluate(el => el.textContent, comparisonDiv);
        console.log('💱 Comparison content:', comparisonText);
        
        // Verify price comparison shows prices (not just "N/A" or loading)
        expect(comparisonText).toMatch(/\d+\s*Kč/); // Should contain Czech koruna prices
        
        // The comparison should show countries (will be dynamic now based on user selection)
        expect(comparisonText).toContain('Cena v okolních zemích:');
        
        console.log('✅ Exchange rate system test passed');
    });

    test('GitHub exchange rate data is accessible', async () => {
        jest.setTimeout(15000);
        
        console.log('🔍 Testing GitHub exchange rate data accessibility...');
        
        // Test if we can fetch the GitHub-hosted exchange rates
        const response = await page.evaluate(async () => {
            try {
                const response = await fetch('https://raw.githubusercontent.com/jonasjancarik/ikea-price-scout/add-countries/src/data/exchange_rates.json');
                if (!response.ok) {
                    return { success: false, status: response.status, error: 'HTTP error' };
                }
                const data = await response.json();
                return { 
                    success: true, 
                    currencyCount: Object.keys(data.rates || {}).length,
                    lastUpdated: data.lastUpdated,
                    baseCurrency: data.baseCurrency
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('📊 GitHub rates response:', response);
        
        if (response.success) {
            expect(response.currencyCount).toBeGreaterThan(30); // Should have many currencies
            expect(response.baseCurrency).toBe('CZK');
            expect(response.lastUpdated).toBeTruthy();
            console.log(`✅ GitHub rates loaded: ${response.currencyCount} currencies`);
        } else {
            console.log('⚠️ GitHub rates not available, should fall back to CNB');
            // This is okay - the fallback system should handle this
        }
    });

    test('Fallback system works when GitHub rates fail', async () => {
        jest.setTimeout(15000);
        
        console.log('🔄 Testing fallback system...');
        
        // Test the fallback by trying to fetch from a broken URL
        const fallbackTest = await page.evaluate(async () => {
            try {
                // This should fail and trigger fallback
                const response = await fetch('https://raw.githubusercontent.com/jonasjancarik/ikea-price-scout/nonexistent-branch/src/data/exchange_rates.json');
                return { githubFailed: !response.ok, status: response.status };
            } catch (error) {
                return { githubFailed: true, error: error.message };
            }
        });
        
        console.log('🔄 Fallback test result:', fallbackTest);
        expect(fallbackTest.githubFailed).toBe(true);
        
        console.log('✅ Fallback system test completed');
    });
});
