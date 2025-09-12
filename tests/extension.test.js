const puppeteer = require('puppeteer');

let browser;
let page;


describe('IKEA Price Scout Extension', () => {
    beforeAll(async () => {
        browser = await puppeteer.launch({  // this shouldn't be needed - we should be able to set the extension in jest-puppeteer.config.js and browser should be launched automatically, but I couldn't get it to work
            headless: process.env.CI === 'true',
            args: [
                `--disable-extensions-except=dev-dist`,
                `--load-extension=dev-dist`,
                '--start-maximized', // This will maximize the browser window
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });
        page = await browser.newPage();
        page.on('console', (msg) => {
            try {
                const args = msg.args();
                const text = args.length ? args.map((a) => a._remoteObject?.value).join(' ') : msg.text();
                // Surface page console in Jest output
                console.log(`[PAGE:${msg.type()}]`, text);
            } catch (_) {
                console.log(`[PAGE:${msg.type()}]`, msg.text());
            }
        });
        console.log('Setting up the browser...');
        await page.setViewport({
            width: 1920,
            height: 1080,
        });
        console.log('New page created with 1920x1080 viewport');
    });

    afterAll(async () => {
        await browser.close();
    });

    const productUrls = [
        'https://www.ikea.com/cz/cs/p/-80275887/',
        'https://www.ikea.com/cz/cs/p/-30403571/',
        // Add more product URLs as needed
    ];

    async function addToCart(url) {
        console.log('Going to product page:', url);
        await page.goto('about:blank');
        console.log('Navigating to product page...');
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('Navigation completed');

            // Check if we're on the correct page
            const currentUrl = page.url();
            if (currentUrl === 'https://www.ikea.com/cz/cs/cat/produkty-products/') {
                throw new Error('Redirected to main products page instead of specific product');
            }
            if (!currentUrl.includes('/p/')) {
                throw new Error(`Unexpected URL: ${currentUrl}. Expected a product page.`);
            }

        } catch (error) {
            console.error('Navigation failed:', error);
            throw error;
        }

        console.log('Product page loaded, waiting for price comparison...');
        try {
            await page.waitForSelector('.price-scout-price-comparison', { timeout: 30000 });
            console.log('Price comparison element found');
        } catch (error) {
            console.error('Price comparison element not found:', error);
            console.log('Current URL:', page.url());
            // console.log('Page content:', await page.content());
            throw error;
        }

        console.log('Price comparison found, checking content...');
        const comparisonDiv = await page.$('.price-scout-price-comparison');
        expect(comparisonDiv).not.toBeNull();

        // Wait for loading state to disappear
        await page.waitForFunction(() => {
            const el = document.querySelector('.price-scout-price-comparison');
            return !!el && !el.textContent?.includes('Načítání cen');
        }, { timeout: 30000 });
        const comparisonText = await page.evaluate(el => el.textContent, comparisonDiv);
        console.log('Comparison text:', comparisonText);
        expect(comparisonText).toContain('Cena v okolních zemích:');
        expect(comparisonText).toMatch(/Polsko|Německo|Rakousko|Slovensko/);

        console.log('Clicking "Add to cart" button...');
        try {
            await page.waitForSelector('::-p-xpath(//span[contains(text(), "Přidat do nákupního košíku")])', { timeout: 10000 });

            const addToCartButton = await page.$('::-p-xpath(//span[contains(text(), "Přidat do nákupního košíku")])');

            if (addToCartButton) {
                await addToCartButton.click();
                console.log('Add to cart button clicked');
            } else {
                throw new Error('Add to cart button not found');
            }
        } catch (error) {
            console.error('Failed to find or click "Add to cart" button:', error);
            throw error;
        }

        console.log('Waiting for confirmation...');
        try {
            // Use the ::-p-xpath syntax for waiting on the confirmation message
            await page.waitForSelector('::-p-xpath(//p[contains(text(), "Přidáno do košíku")])', { timeout: 10000 });
            console.log('Product added to cart');
        } catch (error) {
            console.error('Failed to get confirmation of item added to cart:', error);
            throw error;
        }
    }

    test('Add products to cart and verify price comparison', async () => {
        // Increase timeout to 60 seconds (or more if needed)
        jest.setTimeout(60000);
        
        console.log('Starting test...');
        for (const url of productUrls) {
            try {
                await addToCart(url);
            } catch (error) {
                console.error(`Failed to add product to cart: ${url}`, error);
                // Optionally, you can choose to continue with the next URL instead of failing the entire test
                // continue;
            }
        }

        console.log('Navigating to cart page...');
        await page.goto('https://www.ikea.com/cz/cs/shoppingcart/');
        console.log('Waiting for price comparison summary...');
        
        console.log('Checking if summary is loaded...');

        await page.waitForSelector('#price-scout-comparison-summary');

        await page.waitForFunction(
            () => {
                const summaryDiv = document.querySelector('#price-scout-comparison-summary');
                return summaryDiv && summaryDiv.textContent.includes('Srovnání cen');
            },
            { timeout: 30000 }
        );

        console.log('Verifying individual product comparisons...');
        const cartItems = await page.$$('.price-scout-price-comparison');

        expect(cartItems.length).toBe(productUrls.length);

        for (const item of cartItems) {
            const itemText = await page.evaluate(el => el.textContent, item);
            expect(itemText).toContain('Cena v okolních zemích:');
            expect(itemText).toMatch(/Polsko|Německo|Rakousko|Slovensko/);
        }

        console.log('Test completed successfully');
    }, 60000);  // Add timeout here as well
});