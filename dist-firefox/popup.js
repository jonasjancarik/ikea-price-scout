document.addEventListener('DOMContentLoaded', function () {
    const countryOptions = [
        { id: 'de', name: 'Německo' },
        { id: 'pl', name: 'Polsko' },
        { id: 'at', name: 'Rakousko' },
        { id: 'sk', name: 'Slovensko' }
    ];

    const countryOptionsContainer = document.getElementById('countryOptions');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');

    // Create checkboxes for each country
    countryOptions.forEach(country => {
        const checkbox = document.createElement('div');
        checkbox.className = 'country-option';
        checkbox.innerHTML = `
            <label>
                <input type="checkbox" id="${country.id}" value="${country.id}">
                ${country.name}
            </label>
        `;
        countryOptionsContainer.appendChild(checkbox);
    });

    // Load saved settings or set defaults
    chrome.storage.sync.get(['selectedCountries'], function (result) {
        let selectedCountries = result.selectedCountries;
        if (!selectedCountries || selectedCountries.length === 0) {
            // Set all countries as default if none are selected
            selectedCountries = countryOptions.map(country => country.id);
            chrome.storage.sync.set({ selectedCountries: selectedCountries });
        }
        selectedCountries.forEach(countryId => {
            const checkbox = document.getElementById(countryId);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        updateStatus(selectedCountries);
    });

    // Add event listeners to checkboxes
    countryOptions.forEach(country => {
        const checkbox = document.getElementById(country.id);
        checkbox.addEventListener('change', function () {
            updateStatus(getSelectedCountries());
        });
    });

    // Save settings
    saveButton.addEventListener('click', function () {
        const selectedCountries = getSelectedCountries();
        chrome.storage.sync.set({ selectedCountries: selectedCountries }, function () {
            console.log('Nastavení uloženo');
            updateStatus(selectedCountries);
            statusMessage.textContent = 'Nastavení uloženo!';
            statusMessage.style.color = 'green';
            setTimeout(() => {
                updateStatus(selectedCountries);
            }, 2000);
        });
    });

    function getSelectedCountries() {
        return Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
    }

    function updateStatus(selectedCountries) {
        if (selectedCountries.length === 0) {
            // statusMessage.textContent = 'No countries selected. The extension is disabled.';
            statusMessage.textContent = 'Není vybrána žádná země pro porovnání. Rozšíření nebude nic dělat.';
            statusMessage.style.color = 'red';
        } else {
            // statusMessage.textContent = `${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'} selected for comparison.`;
            statusMessage.textContent = `${selectedCountries.length} země ${selectedCountries.length === 1 ? 'vybrána' : 'vybrány'} pro porovnání.`;
            statusMessage.style.color = 'green';
        }
    }
});