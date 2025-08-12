# IKEA Price Scout - Multi-Country Transition Status

## 📊 Current State Overview

The IKEA Price Scout extension is in the middle of transitioning from a hardcoded 4-country system (Czech Republic + 3 comparison countries) to a flexible multi-country system supporting 67 countries worldwide.

### ✅ What's Already Implemented

#### 1. **Comprehensive Country Data Structure**
- **File**: `src/data/ikea_countries.json`
  - Contains 67 countries organized by continent
  - Includes neighbor relationships for intelligent suggestions
  - Covers: Europe (33), Asia (18), North America (5), South America (2), Africa (2), Oceania (2)

- **File**: `src/data/ikea_sites.json`
  - Contains 67 countries with their IKEA domains and language options
  - Each country has: `domain`, `languages[]` with `code`, `name`, and `url`
  - Supports multi-language countries (e.g., Switzerland: German, French, Italian, English)

#### 2. **Modern Popup Interface**
- **File**: `src/popup.js`
- **Features**:
  - Two-step selection process: Home country → Comparison countries
  - Intelligent neighbor suggestions based on geographic proximity
  - Language selection dropdown for multi-language countries
  - Search functionality for easy country finding
  - Real-time status updates and validation

#### 3. **Dynamic Storage System**
- Countries stored in `chrome.storage.sync` as objects: `{country, language, url}`
- Extension initialization checks for selected countries
- Proper fallback handling when no countries selected

#### 4. **Infrastructure Components**
- **SelectorsService**: Dynamic selector loading system
- **ExchangeRatesService**: Currency conversion from Czech National Bank
- **Background script**: Handles extension lifecycle and data fetching

---

## 🚨 Critical Issues Requiring Immediate Attention

### 1. **Hardcoded Country Lists in PriceUtils** (HIGH PRIORITY)
**File**: `src/utils/PriceUtils.ts` (lines 25-30)
```typescript
comparisonCountries: [
    { country: 'pl', language: 'pl', name: 'Polsko', currencyCode: 'PLN' },
    { country: 'de', language: 'de', name: 'Německo', currencyCode: 'EUR' },
    { country: 'at', language: 'de', name: 'Rakousko', currencyCode: 'EUR' },
    { country: 'sk', language: 'sk', name: 'Slovensko', currencyCode: 'EUR' },
] as ComparisonCountry[],
```
**Impact**: Only these 4 countries are fetched for price comparison, ignoring user selection.

### 2. **ProductItem Filtering Logic Mismatch** (HIGH PRIORITY)
**File**: `src/models/ProductItem.ts` (line 29)
```typescript
.filter(details => selectedCountries ? selectedCountries.includes(details.country) : true)
```
**Issue**: 
- `selectedCountries` contains objects: `[{country: "Germany", language: "de", url: "..."}]`
- Filter expects strings: `["pl", "de", "at", "sk"]`
**Impact**: Filtering doesn't work, all countries processed regardless of user selection.

### 3. **Missing Currency Mapping System** (MEDIUM PRIORITY)
**Issue**: No systematic way to map 67 countries to their currencies
**Current**: Only handles PLN, EUR hardcoded
**Needed**: Complete currency mapping for all supported countries

### 4. **Hardcoded Home Country Assumptions** (MEDIUM PRIORITY)
**Files affected**:
- `src/models/ProductItem.ts` (line 19): `https://www.ikea.com/cz/cs/p/-${this.id}`
- `src/pages/CartPage.ts` (line 505): `let cheapestCountry = 'Česko'`
- Various Czech language error messages

### 5. **Exchange Rate System Limitations** (MEDIUM PRIORITY)
**Current**: Only fetches from Czech National Bank (CZK-based rates)
**Issue**: May not have rates for all currencies in 67 countries
**Needed**: Fallback exchange rate sources or USD-based conversion

---

## 📋 Action Plan & TODO List

### Phase 1: Core Functionality Fixes (HIGH PRIORITY)

#### ✅ Task 1.1: Update PriceUtils to Use Dynamic Countries
**File**: `src/utils/PriceUtils.ts`
**Actions**:
- [ ] Remove hardcoded `comparisonCountries` array
- [ ] Create `getSelectedCountries()` method to fetch from storage
- [ ] Update `fetchForeignPrices()` to use dynamic country list
- [ ] Add currency mapping for all countries
- [ ] Test with various country selections

#### ✅ Task 1.2: Fix ProductItem Country Filtering
**File**: `src/models/ProductItem.ts`
**Actions**:
- [ ] Update filtering logic to work with new storage format
- [ ] Extract country codes from storage objects properly
- [ ] Test filtering with different country combinations
- [ ] Ensure quantity updates work correctly

#### ✅ Task 1.3: Create Currency Mapping System
**New File**: `src/data/currency_mapping.json`
**Actions**:
- [ ] Research and map all 67 countries to their currencies
- [ ] Create currency code mapping (country → currency)
- [ ] Integrate with PriceUtils
- [ ] Handle special cases (Euro zone, USD territories, etc.)

### Phase 2: Home Country Flexibility (MEDIUM PRIORITY)

#### ✅ Task 2.1: Remove Hardcoded Czech Assumptions
**Files**: Multiple
**Actions**:
- [ ] Update ProductItem constructor to use dynamic home country
- [ ] Remove hardcoded Czech URLs and references
- [ ] Update CartPage to use dynamic home country name
- [ ] Implement home country detection from current URL

#### ✅ Task 2.2: Internationalize Error Messages
**Files**: Various
**Actions**:
- [ ] Replace Czech error messages with English
- [ ] Or implement proper i18n system
- [ ] Update status messages in popup

### Phase 3: Enhanced Exchange Rate System (MEDIUM PRIORITY)

#### ✅ Task 3.1: Multi-Source Exchange Rates
**File**: `src/services/ExchangeRatesService.ts`
**Actions**:
- [ ] Research alternative exchange rate APIs
- [ ] Implement fallback rate sources
- [ ] Handle currencies not available from Czech National Bank
- [ ] Add USD-based conversion as fallback

#### ✅ Task 3.2: Currency Rate Caching
**Actions**:
- [ ] Implement per-currency caching
- [ ] Add rate freshness validation
- [ ] Handle offline scenarios

### Phase 4: Testing & Validation (HIGH PRIORITY)

#### ✅ Task 4.1: Popup Functionality Testing
**Actions**:
- [ ] Test country selection flow
- [ ] Verify language selection works
- [ ] Test search functionality
- [ ] Validate storage persistence
- [ ] Test neighbor suggestions accuracy

#### ✅ Task 4.2: Price Comparison Testing
**Actions**:
- [ ] Test with various country combinations
- [ ] Verify price fetching from different domains
- [ ] Test currency conversions
- [ ] Validate price display formatting

#### ✅ Task 4.3: Cart Page Testing
**Actions**:
- [ ] Test multi-country savings calculations
- [ ] Verify unavailable item handling
- [ ] Test cheapest country detection

### Phase 5: Documentation & Cleanup (LOW PRIORITY)

#### ✅ Task 5.1: Update Documentation
**Actions**:
- [ ] Update README.md with new multi-country features
- [ ] Document new country selection process
- [ ] Update extension description
- [ ] Add troubleshooting guide

#### ✅ Task 5.2: Code Cleanup
**Actions**:
- [ ] Remove unused code from old 4-country system
- [ ] Optimize performance for 67-country system
- [ ] Add proper TypeScript types
- [ ] Improve error handling

---

## 🔍 Technical Considerations

### Performance Implications
- **Concern**: Fetching prices from 67 countries could be slow
- **Solution**: Implement concurrent fetching with reasonable limits
- **Consideration**: Add loading states and progress indicators

### Rate Limiting
- **Concern**: IKEA might rate-limit excessive requests
- **Solution**: Implement request throttling and retry logic
- **Consideration**: Cache prices for short periods

### Storage Limitations
- **Chrome storage limits**: 102,400 bytes for sync storage
- **Current usage**: Country selections + cached data
- **Consideration**: Monitor storage usage, implement cleanup

### Browser Compatibility
- **Current**: Chrome extension format
- **Consideration**: Firefox compatibility (already has dev-dist-firefox/)
- **Action**: Test multi-country functionality in Firefox

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] Users can select any combination of 67 countries
- [ ] Price comparison works for all selected countries
- [ ] Currency conversion accurate for all supported currencies
- [ ] Home country can be any of the 67 countries
- [ ] Language selection works for multi-language countries

### Performance Requirements
- [ ] Price fetching completes within 10 seconds for up to 10 countries
- [ ] Popup loads and responds within 2 seconds
- [ ] Extension doesn't significantly impact page load times

### User Experience Requirements
- [ ] Intuitive country selection process
- [ ] Clear error messages when prices unavailable
- [ ] Proper loading indicators during price fetching
- [ ] Responsive design works on all screen sizes

---

## 🚀 Getting Started

### Immediate Next Steps
1. **Start with Task 1.1**: Update PriceUtils to use dynamic countries
2. **Create currency mapping**: Research and document all 67 country currencies
3. **Fix ProductItem filtering**: Ensure user selections are respected
4. **Test basic functionality**: Verify price fetching works with new system

### Development Environment
- Ensure `npm run build:dev` works correctly
- Test in both Chrome and Firefox
- Use browser developer tools to monitor network requests
- Check storage usage in extension settings

---

*Last Updated: December 2024*
*Status: In Progress - Core functionality needs completion*
