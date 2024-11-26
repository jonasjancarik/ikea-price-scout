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
    }
});