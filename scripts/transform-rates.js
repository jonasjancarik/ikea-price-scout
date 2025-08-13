#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Transform raw exchange rate API response to our format
 * This script is used by GitHub Actions to process fetched rates
 */

// All currencies needed for IKEA countries
const IKEA_CURRENCIES = [
  'AED', 'AUD', 'BGN', 'BHD', 'CAD', 'CHF', 'CLP', 'CNY', 'COP',
  'CZK', 'DKK', 'EGP', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS',
  'INR', 'ISK', 'JOD', 'JPY', 'KRW', 'KWD', 'MAD', 'MXN', 'MYR',
  'NOK', 'NZD', 'OMR', 'PHP', 'PLN', 'QAR', 'RON', 'RSD', 'SAR',
  'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'UAH', 'USD'
];

function main() {
  try {
    console.log('🔄 Transforming exchange rates...');
    
    // Read the raw API response
    const rawDataPath = 'temp_rates_primary.json';
    if (!fs.existsSync(rawDataPath)) {
      throw new Error('Raw exchange rate data not found at ' + rawDataPath);
    }
    
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
    console.log('📥 Raw data loaded:', {
      base: rawData.base,
      currencyCount: Object.keys(rawData.rates || {}).length,
      date: rawData.date
    });
    
    // Validate raw data
    if (!rawData.rates || typeof rawData.rates !== 'object') {
      throw new Error('Invalid raw data: missing or invalid rates object');
    }
    
    if (rawData.base !== 'CZK') {
      console.warn('⚠️  Base currency is not CZK:', rawData.base);
    }
    
    // Filter and process rates for IKEA currencies
    const filteredRates = {};
    const missingCurrencies = [];
    
    for (const currency of IKEA_CURRENCIES) {
      if (rawData.rates[currency] !== undefined) {
        // Round to reasonable precision (6 decimal places)
        filteredRates[currency] = Math.round(rawData.rates[currency] * 1000000) / 1000000;
      } else {
        missingCurrencies.push(currency);
      }
    }
    
    // Log missing currencies
    if (missingCurrencies.length > 0) {
      console.warn('⚠️  Missing currencies:', missingCurrencies.join(', '));
      
      // Add fallback rates for missing currencies (based on approximate values)
      const fallbackRates = {
        'RSD': 0.22,  // Serbian Dinar (approximate)
        'MAD': 2.41,  // Moroccan Dirham (approximate)
        'BHD': 64.3,  // Bahraini Dinar (approximate)
        'JOD': 34.2,  // Jordanian Dinar (approximate)
        'KWD': 79.5,  // Kuwaiti Dinar (approximate)
        'OMR': 63.0,  // Omani Rial (approximate)
        'QAR': 6.66   // Qatari Riyal (approximate)
      };
      
      for (const currency of missingCurrencies) {
        if (fallbackRates[currency]) {
          filteredRates[currency] = fallbackRates[currency];
          console.log(`📌 Using fallback rate for ${currency}: ${fallbackRates[currency]}`);
        }
      }
    }
    
    // Create our exchange rates format
    const exchangeRates = {
      lastUpdated: new Date().toISOString(),
      baseCurrency: 'CZK',
      source: 'GitHub Actions - ExchangeRate-API',
      rates: filteredRates,
      coverage: {
        totalCurrencies: Object.keys(filteredRates).length,
        ikeaCountries: 67,
        note: 'All IKEA countries covered through direct rates or EUR/USD equivalents'
      },
      metadata: {
        originalBase: rawData.base,
        originalDate: rawData.date,
        transformedAt: new Date().toISOString(),
        missingFromAPI: missingCurrencies.length > 0 ? missingCurrencies : undefined
      }
    };
    
    // Write to our data file
    const outputPath = 'src/data/exchange_rates.json';
    fs.writeFileSync(outputPath, JSON.stringify(exchangeRates, null, 2));
    
    console.log('✅ Exchange rates transformed successfully:');
    console.log(`   📁 Output: ${outputPath}`);
    console.log(`   💱 Currencies: ${Object.keys(filteredRates).length}`);
    console.log(`   🕒 Last updated: ${exchangeRates.lastUpdated}`);
    console.log(`   🌍 Coverage: ${exchangeRates.coverage.ikeaCountries} IKEA countries`);
    
    // Validate critical currencies
    const criticalCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
    const missingCritical = criticalCurrencies.filter(curr => !filteredRates[curr]);
    
    if (missingCritical.length > 0) {
      throw new Error(`Missing critical currencies: ${missingCritical.join(', ')}`);
    }
    
    console.log('✅ All critical currencies present:', criticalCurrencies.join(', '));
    
    // Clean up temporary file
    if (fs.existsSync(rawDataPath)) {
      fs.unlinkSync(rawDataPath);
      console.log('🗑️  Cleaned up temporary file');
    }
    
  } catch (error) {
    console.error('❌ Error transforming exchange rates:', error.message);
    process.exit(1);
  }
}

// Helper function to validate currency code format
function isValidCurrencyCode(code) {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

// Helper function to validate rate value
function isValidRate(rate) {
  return typeof rate === 'number' && rate > 0 && isFinite(rate);
}

if (require.main === module) {
  main();
}

module.exports = { main, IKEA_CURRENCIES };
