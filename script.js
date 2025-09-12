
let map; // To hold the Leaflet map instance

// --- ELEMENT SELECTORS ---
function getElements() {
    const elements = {
        form: document.getElementById('forecast-form'),
        locationInput: document.getElementById('location'),
        submitButton: document.querySelector('#forecast-form button[type="submit"]'),
        // Map Modal Elements
        openMapBtn: document.getElementById('open-map-btn'),
        mapModalOverlay: document.getElementById('map-modal-overlay'),
        closeMapBtn: document.getElementById('close-map-btn'),
        // Results Modal Elements
        resultsOverlay: document.getElementById('results-overlay'),
        forecastContent: document.getElementById('forecast-content'),
        loadingSpinner: document.getElementById('loading-spinner'),
        closeResultsBtn: document.getElementById('close-results-btn')
    };

    for (const key in elements) {
        if (!elements[key]) {
            const elementId = key.replace(/([A-Z])/g, "-$1").toLowerCase();
            console.error(`Initialization Error: Element with ID '${elementId}' not found.`);
            return null;
        }
    }
    return elements;
}


// --- API CALL ---
async function fetchForecast(data) {
    const response = await fetch('https://seahorse-app-r9yjv.ondigitalocean.app/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const responseText = await response.text();
    const cleanedText = responseText.replace(/^```json\s*|```\s*$/g, '');
    return JSON.parse(cleanedText);
}


// --- UI RENDERING ---
function renderForecast(elements, data) {
    const { forecastContent, loadingSpinner } = elements;
    
    const conditionsGrid = forecastContent.querySelector('.conditions-grid');
    const forecastTextContainer = forecastContent.querySelector('.forecast-text');

    conditionsGrid.innerHTML = `
        <div class="condition-item"><div class="icon"><i class="fas fa-sun"></i></div><div class="label">Weather</div><div class="value">${data.weather.condition}</div></div>
        <div class="condition-item"><div class="icon"><i class="fas fa-temperature-half"></i></div><div class="label">Temp</div><div class="value">${data.weather.temp}</div></div>
        <div class="condition-item"><div class="icon"><i class="fas fa-wind"></i></div><div class="label">Wind</div><div class="value">${data.weather.wind}</div></div>
        <div class="condition-item"><div class="icon"><i class="fas fa-water"></i></div><div class="label">Tides</div><div class="value">${data.tides.high} (High)<br>${data.tides.low} (Low)</div></div>
        <div class="condition-item"><div class="icon"><i class="fas fa-wave-square"></i></div><div class="label">Waves</div><div class="value">${data.waves}</div></div>
    `;

    const formattedText = data.forecastText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/(\r\n|\n|\r)/gm, '<br>');
    const sections = formattedText.split(/(<strong>.*?<\/strong>)/).filter(Boolean);
    let forecastHtml = '';
    for (let i = 0; i < sections.length; i += 2) {
        forecastHtml += `<p>${sections[i]}${ (sections[i + 1] || '').replace(/^<br>/, '')}</p>`;
    }
    
    forecastTextContainer.innerHTML = `<h5>Your Detailed Forecast</h5>${forecastHtml}`;

    loadingSpinner.classList.add('d-none');
    forecastContent.classList.remove('d-none');
}

function renderError(elements, error) {
    const { forecastContent, loadingSpinner } = elements;
    forecastContent.innerHTML = `<div class="text-center"><h5 class="text-danger">Failed to Retrieve Forecast</h5><p>Please check the Java server console for errors.</p><p class="text-muted small"><strong>Error:</strong> ${error.message}</p></div>`;
    loadingSpinner.classList.add('d-none');
    forecastContent.classList.remove('d-none');
}

function toggleLoadingState(elements, isLoading) {
    const { resultsOverlay, loadingSpinner, forecastContent, submitButton } = elements;
    
    if (isLoading) {
        resultsOverlay.classList.remove('d-none');
        setTimeout(() => resultsOverlay.classList.add('visible'), 10);
        loadingSpinner.classList.remove('d-none');
        forecastContent.classList.add('d-none');
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...`;
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Get Forecast';
    }
}

// --- MODAL & MAP FUNCTIONS ---
function showModal(overlayElement) {
    overlayElement.classList.remove('d-none');
    setTimeout(() => overlayElement.classList.add('visible'), 10);
}

function hideModal(overlayElement) {
    overlayElement.classList.remove('visible');
    setTimeout(() => overlayElement.classList.add('d-none'), 300);
}

function initializeMap(elements) {
    if (!document.getElementById('map')) return;
    map = L.map('map').setView([30.1, -90.2], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    let clickMarker;
    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(5);
        const lng = e.latlng.lng.toFixed(5);
        elements.locationInput.value = `${lat}, ${lng}`;
        if (clickMarker) {
            map.removeLayer(clickMarker);
        }
        clickMarker = L.marker([lat, lng]).addTo(map);
        map.panTo([lat, lng]);
        setTimeout(() => hideModal(elements.mapModalOverlay), 300); // Close modal after selection
    });
}

// --- EVENT HANDLER ---
async function handleFormSubmit(event, elements) {
    event.preventDefault();
    console.log("Form submission detected. Running forecast logic...");
    toggleLoadingState(elements, true);

    const formData = {
        location: elements.locationInput.value,
        fishingDate: document.getElementById('fishing-date').value,
        comments: document.getElementById('comments').value,
    };

    try {
        const result = await fetchForecast(formData);
        if (result.error) { throw new Error(result.error); }
        renderForecast(elements, result);
    } catch (error) {
        console.error('Error fetching forecast:', error);
        renderError(elements, error);
    } finally {
        toggleLoadingState(elements, false);
    }
}


// --- MAIN EXECUTION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and DOM is ready.");
    
    const elements = getElements();

    if (elements) {
        initializeMap(elements);
        // Form submission
        elements.form.addEventListener('submit', (event) => handleFormSubmit(event, elements));
        // Modal toggles
        elements.openMapBtn.addEventListener('click', () => {
            showModal(elements.mapModalOverlay);
            // Invalidate map size to fix rendering issue when modal appears
            setTimeout(() => map.invalidateSize(), 10); 
        });
        elements.closeMapBtn.addEventListener('click', () => hideModal(elements.mapModalOverlay));
        elements.closeResultsBtn.addEventListener('click', () => hideModal(elements.resultsOverlay));
        // Close modal if overlay is clicked
        elements.mapModalOverlay.addEventListener('click', (event) => {
            if (event.target === elements.mapModalOverlay) hideModal(elements.mapModalOverlay);
        });
        elements.resultsOverlay.addEventListener('click', (event) => {
            if (event.target === elements.resultsOverlay) hideModal(elements.resultsOverlay);
        });

        console.log("Event listeners attached successfully.");
    } else {
        console.error("Could not attach event listeners because one or more elements are missing.");
    }
});

