# Exchange Rate System

This document describes the GitHub Actions-based exchange rate system that provides comprehensive currency coverage for all 67 IKEA countries.

## 🏗️ Architecture

### Data Flow
1. **GitHub Actions** runs daily at 10:00 AM UTC
2. **Fetches rates** from ExchangeRate-API (free, no API key required)
3. **Transforms data** to CZK-based rates covering all IKEA currencies
4. **Updates** `src/data/exchange_rates.json` in the repository
5. **Extension fetches** rates from GitHub CDN (fast, reliable)

### Fallback Strategy
```
GitHub Rates (Primary) → CNB Rates (Fallback) → Cached Rates (Emergency)
```

## 📁 Files

### Core Files
- `.github/workflows/update-exchange-rates.yml` - GitHub Actions workflow
- `scripts/transform-rates.js` - Rate transformation script
- `src/data/exchange_rates.json` - Exchange rate data (auto-updated)
- `src/services/ExchangeRatesService.ts` - Service with GitHub integration

### Data Format
```json
{
  "lastUpdated": "2024-12-19T10:00:00Z",
  "baseCurrency": "CZK",
  "source": "GitHub Actions - ExchangeRate-API",
  "rates": {
    "USD": 24.25,
    "EUR": 25.12,
    "GBP": 30.45,
    // ... all 43 IKEA currencies
  },
  "coverage": {
    "totalCurrencies": 43,
    "ikeaCountries": 67,
    "note": "All IKEA countries covered"
  }
}
```

## 🚀 Features

### ✅ Comprehensive Coverage
- **43 currencies** covering all 67 IKEA countries
- **Daily updates** via GitHub Actions
- **No API keys** required from users
- **Fast delivery** via GitHub CDN

### ✅ Reliability
- **Primary source**: ExchangeRate-API (free tier: 1,500 requests/month)
- **Fallback source**: Czech National Bank (unlimited, European focus)
- **Emergency fallback**: Cached rates + minimal defaults
- **Validation**: Checks for critical currencies and data freshness

### ✅ Smart Caching
- **Daily updates**: Rates refresh once per day
- **Stale detection**: Warns if rates are >72 hours old
- **Local caching**: Background script caches rates for offline use
- **Minimal requests**: Only updates when needed

## 🔧 Configuration

### GitHub Actions Schedule
```yaml
schedule:
  - cron: '0 10 * * *'  # Daily at 10:00 AM UTC
```

### Supported Currencies
All major currencies for IKEA countries:
- **Europe**: EUR, GBP, CHF, SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN, HRK, ISK, RSD, UAH
- **Americas**: USD, CAD, MXN, CLP, COP
- **Asia**: JPY, CNY, KRW, HKD, TWD, SGD, MYR, THB, PHP, IDR, INR
- **Middle East**: AED, SAR, QAR, KWD, BHD, OMR, JOD, ILS, TRY
- **Africa**: EGP, MAD
- **Oceania**: AUD, NZD

## 🛠️ Manual Operations

### Trigger Manual Update
```bash
# Via GitHub UI: Actions → Update Exchange Rates → Run workflow
# Or via GitHub CLI:
gh workflow run update-exchange-rates.yml
```

### Force Update (ignore cache)
```bash
gh workflow run update-exchange-rates.yml -f force_update=true
```

### Local Testing
```bash
# Test transformation script (requires temp_rates_primary.json)
node scripts/transform-rates.js

# Test API fetch
curl -s "https://api.exchangerate-api.com/v4/latest/CZK" > temp_rates_primary.json
node scripts/transform-rates.js
```

## 📊 Monitoring

### Success Indicators
- ✅ Daily commits with "chore: update exchange rates"
- ✅ Browser console: "Using GitHub-hosted exchange rates: X currencies"
- ✅ Fresh `lastUpdated` timestamp in exchange_rates.json

### Failure Indicators
- ❌ No commits for >2 days
- ❌ Browser console: "GitHub rates failed, trying fallback"
- ❌ Stale rates warning: "GitHub rates are stale (X hours old)"

### Debugging
1. Check GitHub Actions logs in repository
2. Verify API availability: `curl -s "https://api.exchangerate-api.com/v4/latest/CZK"`
3. Test local transformation: `node scripts/transform-rates.js`
4. Check browser console for detailed error messages

## 🔄 Migration from CNB-only System

### Before (CNB Only)
- ❌ Limited to ~20 European currencies
- ❌ Missing Asian, American, Middle Eastern currencies
- ❌ Direct API calls from extension (slower, less reliable)

### After (GitHub + CNB Hybrid)
- ✅ All 43 currencies for 67 IKEA countries
- ✅ Fast GitHub CDN delivery
- ✅ Reliable fallback system
- ✅ No user API key management

## 🚨 Emergency Procedures

### If GitHub Actions Fails
1. **Immediate**: Extension falls back to CNB (European currencies work)
2. **Short-term**: Manual workflow trigger or force update
3. **Long-term**: Switch to alternative API in workflow

### If ExchangeRate-API is Down
1. **Automatic**: Workflow tries USD-base conversion
2. **Manual**: Update workflow to use alternative API
3. **Emergency**: Commit manual rates to exchange_rates.json

### If All APIs Fail
1. **Automatic**: Extension uses cached rates from background script
2. **Manual**: Update exchange_rates.json with approximate rates
3. **Emergency**: Extension falls back to minimal default rates

## 📈 Performance Impact

### Benefits
- **Faster loading**: GitHub CDN vs API calls
- **Reduced requests**: Daily updates vs hourly API calls
- **Better reliability**: Multiple fallback layers
- **Global coverage**: All IKEA currencies supported

### Resource Usage
- **GitHub Actions**: ~2 minutes runtime daily
- **Repository size**: +2KB for exchange_rates.json
- **Extension**: One additional HTTP request to GitHub CDN
- **Browser storage**: ~1KB cached rates

---

*This system provides comprehensive, reliable exchange rate coverage for the IKEA Price Scout extension's global expansion to 67 countries.*
