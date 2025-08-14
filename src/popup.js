<<<<<<< Updated upstream
document.addEventListener('DOMContentLoaded', function () {
    let ikeaCountries = {};
    let ikeaSites = {};
    let selectedHomeCountry = null;
    let selectedComparisonCountries = new Set();

    // DOM elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const homeCountrySearch = document.getElementById('homeCountrySearch');
    const compareCountrySearch = document.getElementById('compareCountrySearch');
    const homeCountryOptions = document.getElementById('homeCountryOptions');
    const neighboringCountries = document.getElementById('neighboringCountries');
    const otherCountries = document.getElementById('otherCountries');
    const nextButton = document.getElementById('nextButton');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');

    // Initialize data
    Promise.all([
        fetch(chrome.runtime.getURL('data/ikea_countries.json')).then(response => response.json()),
        fetch(chrome.runtime.getURL('data/ikea_sites.json')).then(response => response.json())
    ]).then(([countriesData, sitesData]) => {
        ikeaCountries = countriesData;
        ikeaSites = sitesData.countries.reduce((acc, site) => {
            acc[site.country] = site;
            return acc;
        }, {});
        
        initializeStep1();
        loadSavedSettings();
    }).catch(error => {
        console.error('Failed to load data:', error);
        statusMessage.textContent = 'Chyba při načítání dat.';
        statusMessage.style.color = 'red';
    });

    function initializeStep1() {
        // Create flat list of all countries for home country selection
        const allCountries = Object.values(ikeaCountries)
            .flat()
            .map(country => country.name)
            .sort();

        allCountries.forEach(country => {
            const countryElement = createCountryElement(country, true);
            homeCountryOptions.appendChild(countryElement);
        });

        homeCountrySearch.addEventListener('input', (e) => {
            filterCountries(e.target.value, homeCountryOptions);
        });
    }

    function initializeStep2(homeCountry) {
        // Find neighbors of home country
        const neighbors = findNeighbors(homeCountry);
        
        // Populate neighboring countries section
        neighboringCountries.innerHTML = '';
        neighbors.forEach(neighbor => {
            const countryElement = createCountryElement(neighbor, false);
            neighboringCountries.appendChild(countryElement);
            // Pre-select neighboring countries
            const checkbox = countryElement.querySelector('input[type="checkbox"]');
            checkbox.checked = true;
            selectedComparisonCountries.add(neighbor);
        });

        // Populate other countries section
        otherCountries.innerHTML = '';
        getAllCountriesExcept([homeCountry, ...neighbors]).forEach(country => {
            const countryElement = createCountryElement(country, false);
            otherCountries.appendChild(countryElement);
        });

        compareCountrySearch.addEventListener('input', (e) => {
            filterCountries(e.target.value, otherCountries);
        });

        updateStatus();
    }

    function createCountryElement(country, isHomeCountry) {
        const div = document.createElement('div');
        div.className = 'country-option';
        
        if (isHomeCountry) {
            div.innerHTML = `
                <label>
                    <input type="radio" name="homeCountry" value="${country}">
                    ${country}
                </label>
            `;
            
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedHomeCountry = country;
                    nextButton.disabled = false;
                    nextButton.style.backgroundColor = '#0051ba';
                }
            });
        } else {
            // Find the site data for this country
            const site = ikeaSites[country];
            const hasMultipleLanguages = site && site.languages.length > 1;
            
            let innerHTML = `
                <label>
                    <input type="checkbox" value="${country}" data-country="${country}">
                    ${country}
                </label>`;
                
            if (hasMultipleLanguages) {
                innerHTML += `
                    <select class="language-select" style="display: none;">
                        ${site.languages.map(lang => 
                            `<option value="${lang.code}" data-url="${lang.url}">${lang.name}</option>`
                        ).join('')}
                    </select>`;
            }
            
            div.innerHTML = innerHTML;
            
            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function() {
                const select = div.querySelector('.language-select');
                if (select) {
                    select.style.display = this.checked ? 'inline-block' : 'none';
                }
                if (this.checked) {
                    selectedComparisonCountries.add(country);
                } else {
                    selectedComparisonCountries.delete(country);
                }
                updateStatus();
            });
        }
        
        return div;
    }

    function filterCountries(searchTerm, container) {
        // Don't filter neighboring countries section
        if (container === neighboringCountries) {
            return;
        }

        const countryElements = container.querySelectorAll('.country-option');
        searchTerm = searchTerm.toLowerCase().trim();
        
        let hasVisibleElements = false;
        countryElements.forEach(element => {
            const countryName = element.querySelector('label').textContent.trim().toLowerCase();
            const isVisible = countryName.includes(searchTerm);
            element.style.display = isVisible ? 'block' : 'none';
            if (isVisible) hasVisibleElements = true;
        });
        
        // Only update visibility for the other countries container
        if (container === otherCountries) {
            container.style.display = hasVisibleElements ? 'block' : 'none';
        }
    }

    function formatContinentName(continent) {
        return continent.replace('_', ' ');
    }

    function getSelectedCountries() {
        const selected = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            const country = checkbox.dataset.country;
            const site = ikeaSites[country];
            
            if (site) {
                const select = checkbox.closest('.country-option').querySelector('.language-select');
                if (select) {
                    const selectedOption = select.options[select.selectedIndex];
                    selected.push({
                        country,
                        language: select.value,
                        url: selectedOption.dataset.url
                    });
                } else {
                    selected.push({
                        country,
                        language: site.languages[0].code,
                        url: site.languages[0].url
                    });
                }
            }
        });
        return selected;
    }

    function loadSavedSettings() {
        chrome.storage.sync.get(['selectedCountries'], function(result) {
            if (result.selectedCountries) {
                result.selectedCountries.forEach(saved => {
                    const checkbox = document.querySelector(`input[value="${saved.country}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        const select = checkbox.closest('.country-option').querySelector('.language-select');
                        if (select) {
                            select.value = saved.language;
                            select.style.display = 'inline-block';
                        }
                    }
                });
                updateStatus();
            }
        });
    }

    function updateStatus() {
        const selected = getSelectedCountries();
        if (selected.length === 0) {
            statusMessage.textContent = 'Není vybrána žádná země pro porovnání. Rozšíření nebude nic dělat.';
            statusMessage.style.color = 'red';
        } else {
            statusMessage.textContent = `${selected.length} ${selected.length === 1 ? 'země vybrána' : 'země vybrány'} pro porovnání.`;
            statusMessage.style.color = 'green';
        }
    }

    saveButton.addEventListener('click', function() {
        const selectedCountries = getSelectedCountries();
        chrome.storage.sync.set({ selectedCountries }, function() {
            statusMessage.textContent = 'Nastavení uloženo!';
            statusMessage.style.color = 'green';
            setTimeout(() => {
                updateStatus();
            }, 2000);
        });
    });

    nextButton.addEventListener('click', () => {
        if (selectedHomeCountry) {
            step1.classList.remove('active');
            step2.classList.add('active');
            initializeStep2(selectedHomeCountry);
        }
    });

    function findNeighbors(country) {
        for (const continent of Object.values(ikeaCountries)) {
            const countryData = continent.find(c => c.name === country);
            if (countryData) {
                // Only return neighbors that exist in ikeaSites
                return countryData.neighbors.filter(neighbor => 
                    ikeaSites[neighbor] !== undefined
                );
            }
        }
        return [];
    }

    function getAllCountriesExcept(excludedCountries) {
        const allCountries = new Set();
        // Get all available IKEA sites countries
        Object.keys(ikeaSites).forEach(country => {
            if (!excludedCountries.includes(country)) {
                allCountries.add(country);
            }
        });
        return Array.from(allCountries).sort();
=======
class IkeaPopup {
    constructor() {
        this.countries = null;
        this.sites = null;
        this.selectedHomeCountry = null;
        this.selectedComparisonCountries = new Set();
        this.currentStep = 1;
        this.pendingLanguageSelections = new Map(); // country -> pending language selection
        
        this.init();
    }

    async init() {
        try {
            // Load data files
            await this.loadData();
            
            // Initialize UI
            this.initializeEventListeners();
            this.renderHomeCountries();
            
            // Load saved settings
            await this.loadSavedSettings();
            
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            this.showStatus('Failed to load country data', 'error');
        }
    }

    async loadData() {
        try {
            // Load countries and sites data
            const [countriesResponse, sitesResponse] = await Promise.all([
                fetch(chrome.runtime.getURL('data/ikea_countries.json')),
                fetch(chrome.runtime.getURL('data/ikea_sites.json'))
            ]);

            if (!countriesResponse.ok || !sitesResponse.ok) {
                throw new Error('Failed to fetch data files');
            }

            this.countries = await countriesResponse.json();
            this.sites = await sitesResponse.json();
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    initializeEventListeners() {
        // Search functionality
        document.getElementById('home-search').addEventListener('input', (e) => {
            this.filterCountries(e.target.value, 'home');
        });

        document.getElementById('comparison-search').addEventListener('input', (e) => {
            this.filterCountries(e.target.value, 'comparison');
        });

        // Action buttons
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSettings();
        });
    }

    renderHomeCountries(filter = '') {
        const container = document.getElementById('home-countries');
        container.innerHTML = '';

        const allCountries = this.getAllCountries();
        const filteredCountries = allCountries.filter(country =>
            country.name.toLowerCase().includes(filter.toLowerCase())
        );

        filteredCountries.forEach(country => {
            const option = this.createCountryOption(country, 'home');
            container.appendChild(option);
        });
    }

    renderComparisonCountries(filter = '') {
        const container = document.getElementById('comparison-countries');
        container.innerHTML = '';

        const allCountries = this.getAllCountries();
        const filteredCountries = allCountries.filter(country =>
            country.name.toLowerCase().includes(filter.toLowerCase()) &&
            country.name !== this.selectedHomeCountry?.name
        );

        filteredCountries.forEach(country => {
            const option = this.createCountryOption(country, 'comparison');
            container.appendChild(option);
        });
    }

    createCountryOption(country, type) {
        const option = document.createElement('div');
        option.className = 'country-option';

        const checkbox = document.createElement('input');
        checkbox.type = type === 'home' ? 'radio' : 'checkbox';
        checkbox.name = type === 'home' ? 'home-country' : 'comparison-country';
        checkbox.className = 'country-checkbox';
        checkbox.id = `${type}-${country.code}`;
        checkbox.value = country.name;

        if (type === 'home') {
            checkbox.checked = this.selectedHomeCountry?.name === country.name;
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectHomeCountry(country);
                }
            });
        } else {
            checkbox.checked = this.selectedComparisonCountries.has(country.name);
            checkbox.addEventListener('change', () => {
                this.toggleComparisonCountry(country, checkbox.checked);
            });
        }

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.className = 'country-name';
        label.textContent = country.name;

        option.appendChild(checkbox);
        option.appendChild(label);

        return option;
    }

    selectHomeCountry(country) {
        this.selectedHomeCountry = country;
        
        // Update step indicators
        document.getElementById('step1-indicator').classList.add('completed');
        document.getElementById('step2-indicator').classList.remove('inactive');
        
        // Show comparison section
        document.getElementById('comparison-section').classList.remove('hidden');
        
        // Render comparison countries and suggestions
        this.renderComparisonCountries();
        this.renderSuggestedCountries();
        
        // Update selected list
        this.updateSelectedList();
        
        this.currentStep = 2;
    }

    toggleComparisonCountry(country, selected) {
        if (selected) {
            this.selectedComparisonCountries.add(country.name);
            
            // Check if this country has multiple languages
            const siteData = this.sites.countries[country.name];
            if (siteData && siteData.languages.length > 1) {
                this.pendingLanguageSelections.set(country.name, null);
                this.showLanguageSelection();
            }
        } else {
            this.selectedComparisonCountries.delete(country.name);
            this.pendingLanguageSelections.delete(country.name);
        }
        
        this.updateSelectedList();
        this.updateSaveButton();
    }

    renderSuggestedCountries() {
        if (!this.selectedHomeCountry) return;

        const container = document.getElementById('suggested-countries');
        container.innerHTML = '';

        // Find neighbors of selected home country
        const homeCountryData = this.findCountryData(this.selectedHomeCountry.name);
        if (homeCountryData && homeCountryData.neighbors) {
            homeCountryData.neighbors.forEach(neighborName => {
                const neighbor = this.findCountryByName(neighborName);
                if (neighbor) {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggested-country';
                    suggestion.textContent = neighbor.name;
                    suggestion.addEventListener('click', () => {
                        this.addSuggestedCountry(neighbor);
                    });
                    container.appendChild(suggestion);
                }
            });
        }
    }

    addSuggestedCountry(country) {
        if (!this.selectedComparisonCountries.has(country.name)) {
            this.selectedComparisonCountries.add(country.name);
            
            // Update checkbox if visible
            const checkbox = document.getElementById(`comparison-${country.code}`);
            if (checkbox) {
                checkbox.checked = true;
            }
            
            // Check for language selection
            const siteData = this.sites.countries[country.name];
            if (siteData && siteData.languages.length > 1) {
                this.pendingLanguageSelections.set(country.name, null);
                this.showLanguageSelection();
            }
            
            this.updateSelectedList();
            this.updateSaveButton();
        }
>>>>>>> Stashed changes
    }

    showLanguageSelection() {
        const section = document.getElementById('language-section');
        const container = document.getElementById('language-options');
        
        // Find countries that need language selection
        const needingSelection = Array.from(this.pendingLanguageSelections.keys())
            .filter(countryName => this.pendingLanguageSelections.get(countryName) === null);
        
        if (needingSelection.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        container.innerHTML = '';
        
        // Show language options for the first country needing selection
        const countryName = needingSelection[0];
        const siteData = this.sites.countries[countryName];
        
        if (siteData) {
            const title = document.querySelector('#language-section .section-title');
            title.textContent = `Select Language for ${countryName}`;
            
            siteData.languages.forEach(lang => {
                const option = document.createElement('div');
                option.className = 'language-option';
                option.textContent = `${lang.name} (${lang.code})`;
                option.addEventListener('click', () => {
                    // Clear previous selections
                    container.querySelectorAll('.language-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    option.classList.add('selected');
                    
                    // Save selection
                    this.pendingLanguageSelections.set(countryName, lang);
                    
                    // Check if more selections needed
                    setTimeout(() => {
                        this.showLanguageSelection();
                    }, 300);
                });
                container.appendChild(option);
            });
        }
    }

    updateSelectedList() {
        const container = document.getElementById('selected-list');
        const countElement = document.getElementById('selected-count');
        
        const totalSelected = (this.selectedHomeCountry ? 1 : 0) + this.selectedComparisonCountries.size;
        countElement.textContent = totalSelected;
        
        if (totalSelected === 0) {
            container.innerHTML = '<div class="empty-state">No countries selected</div>';
            return;
        }
        
        container.innerHTML = '';
        
        // Add home country
        if (this.selectedHomeCountry) {
            const item = this.createSelectedItem(this.selectedHomeCountry, 'Home Country', false);
            container.appendChild(item);
        }
        
        // Add comparison countries
        this.selectedComparisonCountries.forEach(countryName => {
            const country = this.findCountryByName(countryName);
            if (country) {
                const item = this.createSelectedItem(country, 'Comparison', true);
                container.appendChild(item);
            }
        });
    }

    createSelectedItem(country, type, removable) {
        const item = document.createElement('div');
        item.className = 'selected-item';
        
        const info = document.createElement('div');
        const siteData = this.sites.countries[country.name];
        const selectedLang = this.pendingLanguageSelections.get(country.name);
        
        let langInfo = '';
        if (selectedLang) {
            langInfo = ` (${selectedLang.name})`;
        } else if (siteData && siteData.languages.length === 1) {
            langInfo = ` (${siteData.languages[0].name})`;
        }
        
        info.innerHTML = `<strong>${country.name}</strong>${langInfo} <small>${type}</small>`;
        item.appendChild(info);
        
        if (removable) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                this.removeComparisonCountry(country.name);
            });
            item.appendChild(removeBtn);
        }
        
        return item;
    }

    removeComparisonCountry(countryName) {
        this.selectedComparisonCountries.delete(countryName);
        this.pendingLanguageSelections.delete(countryName);
        
        // Update checkbox if visible
        const country = this.findCountryByName(countryName);
        if (country) {
            const checkbox = document.getElementById(`comparison-${country.code}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        }
        
        this.updateSelectedList();
        this.updateSaveButton();
        this.showLanguageSelection(); // Refresh language selection if needed
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('save-btn');
        const hasHomeCountry = this.selectedHomeCountry !== null;
        const hasComparisonCountries = this.selectedComparisonCountries.size > 0;
        const allLanguagesSelected = Array.from(this.pendingLanguageSelections.keys())
            .every(countryName => this.pendingLanguageSelections.get(countryName) !== null);
        
        saveBtn.disabled = !(hasHomeCountry && hasComparisonCountries && allLanguagesSelected);
    }

    async saveSettings() {
        try {
            const selectedCountries = [];
            
            // Add home country (not included in comparison but stored for reference)
            if (this.selectedHomeCountry) {
                const siteData = this.sites.countries[this.selectedHomeCountry.name];
                const language = siteData.languages[0]; // Use first/default language for home country
                
                selectedCountries.push({
                    country: this.selectedHomeCountry.name,
                    language: language.code,
                    url: language.url,
                    isHome: true
                });
            }
            
            // Add comparison countries
            for (const countryName of this.selectedComparisonCountries) {
                const siteData = this.sites.countries[countryName];
                let selectedLang = this.pendingLanguageSelections.get(countryName);
                
                if (!selectedLang) {
                    selectedLang = siteData.languages[0]; // Use default if only one language
                }
                
                selectedCountries.push({
                    country: countryName,
                    language: selectedLang.code,
                    url: selectedLang.url,
                    isHome: false
                });
            }
            
            // Save to storage
            await new Promise((resolve) => {
                chrome.storage.sync.set({ selectedCountries }, resolve);
            });
            
            this.showStatus(`Settings saved! Selected ${selectedCountries.length} countries.`, 'success');
            
            // Close popup after a short delay
            setTimeout(() => {
                window.close();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    async loadSavedSettings() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.sync.get(['selectedCountries'], resolve);
            });
            
            if (result.selectedCountries && Array.isArray(result.selectedCountries)) {
                // Load saved selections
                result.selectedCountries.forEach(saved => {
                    const country = this.findCountryByName(saved.country);
                    if (country) {
                        if (saved.isHome) {
                            this.selectHomeCountry(country);
                        } else {
                            this.selectedComparisonCountries.add(country.name);
                            
                            // Set language selection
                            const siteData = this.sites.countries[country.name];
                            if (siteData) {
                                const language = siteData.languages.find(lang => 
                                    lang.code === saved.language || lang.url === saved.url
                                );
                                if (language) {
                                    this.pendingLanguageSelections.set(country.name, language);
                                }
                            }
                        }
                    }
                });
                
                this.updateSelectedList();
                this.updateSaveButton();
                this.renderComparisonCountries();
                
                if (this.selectedComparisonCountries.size > 0) {
                    this.showStatus('Loaded saved settings', 'info');
                }
            }
            
        } catch (error) {
            console.error('Error loading saved settings:', error);
        }
    }

    resetSettings() {
        this.selectedHomeCountry = null;
        this.selectedComparisonCountries.clear();
        this.pendingLanguageSelections.clear();
        this.currentStep = 1;
        
        // Reset UI
        document.getElementById('step1-indicator').classList.remove('completed');
        document.getElementById('step2-indicator').classList.add('inactive');
        document.getElementById('comparison-section').classList.add('hidden');
        document.getElementById('language-section').style.display = 'none';
        
        // Clear searches
        document.getElementById('home-search').value = '';
        document.getElementById('comparison-search').value = '';
        
        // Re-render
        this.renderHomeCountries();
        this.updateSelectedList();
        this.updateSaveButton();
        
        this.showStatus('Settings reset', 'info');
    }

    filterCountries(filter, type) {
        if (type === 'home') {
            this.renderHomeCountries(filter);
        } else {
            this.renderComparisonCountries(filter);
        }
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message status-${type}`;
        
        // Auto-hide after 3 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 3000);
        }
    }

    getAllCountries() {
        const allCountries = [];
        Object.values(this.countries.continents).forEach(continent => {
            continent.countries.forEach(country => {
                allCountries.push(country);
            });
        });
        return allCountries.sort((a, b) => a.name.localeCompare(b.name));
    }

    findCountryData(countryName) {
        for (const continent of Object.values(this.countries.continents)) {
            const country = continent.countries.find(c => c.name === countryName);
            if (country) return country;
        }
        return null;
    }

    findCountryByName(countryName) {
        return this.findCountryData(countryName);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IkeaPopup();
});