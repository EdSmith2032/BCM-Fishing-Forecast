// --- ELEMENT SELECTORS ---
// This function ensures we have all necessary elements and provides clear errors if not.
function getElements() {
    const elements = {
        form: document.getElementById('forecast-form'),
        resultsOverlay: document.getElementById('results-overlay'),
        forecastContent: document.getElementById('forecast-content'),
        loadingSpinner: document.getElementById('loading-spinner'),
        closeButton: document.getElementById('close-button'),
        submitButton: document.querySelector('#forecast-form button[type="submit"]')
    };

    // Check if any element is missing
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Initialization Error: Element with ID '${key}' not found.`);
            // In a real app, you might want to disable the form or show a user-friendly error
            return null;
        }
    }
    return elements;
}


// --- API CALL ---
async function fetchForecast(data) {
    const response = await fetch('http://localhost:4567/api/forecast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    // Get the response as raw text first to handle potential markdown fences
    const responseText = await response.text();

    // Clean the text by removing markdown fences and trimming whitespace
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        // Try to parse the cleaned text to get a more specific error from the server
        try {
            const errorData = JSON.parse(cleanedText);
            if (errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (e) {
            // Ignore parsing error if the non-ok response was not valid JSON
        }
        throw new Error(errorMsg);
    }

    try {
        // Manually parse the cleaned text into a JSON object
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse cleaned JSON:", cleanedText);
        // This error will be caught by the handleFormSubmit function's catch block
        throw new Error("Received malformed JSON data from the server.");
    }
}


// --- UI RENDERING ---
function renderForecast(elements, data) {
    const { forecastContent, loadingSpinner } = elements;

    // Sanitize and format the forecast text to break it into sections
    // The AI is asked to separate sections with a double newline (\n\n)
    const formattedText = data.forecastText
        .replace(/\*\*(.*?)\*\*/g, '<h6>$1</h6>') // Turn bolded headings into sub-headers
        .replace(/\\n\\n/g, '</p><p>')           // Turn double newlines into paragraph breaks
        .replace(/\\n/g, '<br>');                 // Turn single newlines into line breaks

    forecastContent.innerHTML = `
        <div class="conditions-grid">
            <div class="condition-item">
                <div class="icon"><i class="fas fa-sun"></i></div>
                <div class="label">Weather</div>
                <div class="value">${data.weather.condition}</div>
            </div>
            <div class="condition-item">
                <div class="icon"><i class="fas fa-temperature-half"></i></div>
                <div class="label">Temp</div>
                <div class="value">${data.weather.temp}</div>
            </div>
            <div class="condition-item">
                <div class="icon"><i class="fas fa-wind"></i></div>
                <div class="label">Wind</div>
                <div class="value">${data.weather.wind}</div>
            </div>
            <div class="condition-item">
                <div class="icon"><i class="fas fa-water"></i></div>
                <div class="label">Tides</div>
                <div class="value">${data.tides.high} (High)<br>${data.tides.low} (Low)</div>
            </div>
                <div class="condition-item">
                <div class="icon"><i class="fas fa-wave-square"></i></div>
                <div class="label">Waves</div>
                <div class="value">${data.waves}</div>
            </div>
        </div>
        <div class="forecast-text">
            <h5>Your Detailed Forecast</h5>
            <p>${formattedText}</p>
        </div>
    `;

    loadingSpinner.classList.add('d-none');
    forecastContent.classList.remove('d-none');
}

function renderError(elements, error) {
    const { forecastContent, loadingSpinner } = elements;
    forecastContent.innerHTML = `
        <div class="text-center">
            <h5 class="text-danger">Failed to Retrieve Forecast</h5>
            <p>Please check the Java server console for errors.</p>
            <p class="text-muted small"><strong>Error:</strong> ${error.message}</p>
        </div>
    `;
    loadingSpinner.classList.add('d-none');
    forecastContent.classList.remove('d-none');
}

function toggleLoadingState(elements, isLoading) {
    const { resultsOverlay, loadingSpinner, forecastContent, submitButton } = elements;

    if (isLoading) {
        resultsOverlay.classList.remove('d-none');
        setTimeout(() => resultsOverlay.classList.add('visible'), 10); // For transition
        loadingSpinner.classList.remove('d-none');
        forecastContent.classList.add('d-none');
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Generating...
        `;
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Get Forecast';
    }
}

function hideModal(elements) {
    elements.resultsOverlay.classList.remove('visible');
    setTimeout(() => elements.resultsOverlay.classList.add('d-none'), 300); // Match transition time
}


// --- EVENT HANDLER ---
async function handleFormSubmit(event, elements) {
    event.preventDefault();
    console.log("Form submission detected. Running forecast logic...");

    toggleLoadingState(elements, true);

    const formData = {
        location: document.getElementById('location').value,
        fishingDate: document.getElementById('fishing-date').value,
        comments: document.getElementById('comments').value,
    };

    try {
        const result = await fetchForecast(formData);

        // Check if the result from the server is an error object
        if (result.error) {
            throw new Error(result.error);
        }

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
        elements.form.addEventListener('submit', (event) => handleFormSubmit(event, elements));
        elements.closeButton.addEventListener('click', () => hideModal(elements));
        elements.resultsOverlay.addEventListener('click', (event) => {
            // Close modal if the overlay (background) is clicked, but not the modal content
            if (event.target === elements.resultsOverlay) {
                hideModal(elements);
            }
        });
        console.log("Event listeners attached successfully.");
    } else {
        console.error("Could not attach event listeners because one or more elements are missing.");
    }
});

