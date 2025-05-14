const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

 // Your Flask API URL

/**
 * Helper function for making API requests using fetch.
 * Handles JSON body serialization, error handling, and JSON response parsing.
 * For non-JSON responses (like audio), it returns the raw response object.
 *
 * @param {string} endpoint - The API endpoint to call (e.g., '/customers').
 * @param {object} [options={}] - Optional fetch API options (method, headers, body, etc.).
 * @returns {Promise<object|Response>} - A promise that resolves to the JSON response data or the raw Response object.
 * @throws {Error} - If the API request fails (network error or non-2xx status).
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (error) {
                console.error('Error processing audio:', error);
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            return await response.json();
        } else if (contentType?.startsWith('audio/')) {
            return { success: true, response }; // Return raw response for audio
        } else {
            return { success: true, status: response.status }; // Handle other non-JSON success responses
        }
    } catch (error) {
        console.error('API Request Error:', error);
        throw error; // Re-throw the error for the calling component to handle
    }
}

// --- API Functions ---

/**
 * Fetches dashboard statistics.
 * @returns {Promise<object>}
 */
export const getDashboardStats = () => request('/dashboard/stats');

/**
 * Fetches a list of customers.
 * @returns {Promise<object>}
 */
export const getCustomers = () => request('/customers');

/**
 * Fetches a list of calls.
 * @returns {Promise<object>}
 */
export const getCalls = () => request('/calls');

/**
 * Schedules a new call.
 * @param {object} data - The call scheduling data.
 * @returns {Promise<object>}
 */
export const scheduleCall = (data) => request('/schedule-call', {
    method: 'POST',
    body: data,
});

/**
 * Starts a test call for a specific customer.
 * @param {string|number} customerId - The ID of the customer.
 * @returns {Promise<object>}
 */
export const startTestCall = (customerId) => request('/start-test-call', {
    method: 'POST',
    body: { customerId },
});

/**
 * Constructs the URL for fetching audio content.
 * @param {string} callSid - The unique identifier of the call.
 * @param {string} [type=''] - Optional type parameter to append to the URL.
 * @returns {string} - The full URL for the audio.
 */
export const getAudioUrl = (callSid, type = '') => `${API_BASE_URL}/audio/${callSid}${type}`;

/**
 * Simulates a user response during a call.
 * @param {string} callSid - The unique identifier of the call.
 * @param {string} userInput - The user's input text.
 * @returns {Promise<object>}
 */
export const simulateUserResponse = (callSid, userInput) => request('/simulate-user-response', {
    method: 'POST',
    body: { callSid, userInput },
});

/**
 * Processes audio data sent as FormData.
 * Note: This function uses a direct fetch as it requires FormData which is handled differently.
 * @param {FormData} formData - The FormData object containing the audio file and callSid.
 * @returns {Promise<object>}
 * @throws {Error} - If the API request fails.
 */
export const processAudio = async (formData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/process-audio`, {
            method: 'POST',
            body: formData, // FormData automatically sets the correct Content-Type
        });

        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (error) { // Added 'error' binding
                console.error('Error processing audio:', error);
            }
            throw new Error(errorMessage || 'Failed to process audio');
        }

        return await response.json();
    } catch (error) {
        console.error('Error processing audio:', error);
        throw error;
    }
};

/**
 * Ends an ongoing call.
 * @param {string} callSid - The unique identifier of the call.
 * @param {boolean} isResolved - Indicates whether the call was resolved.
 * @returns {Promise<object>}
 */
export const endCall = (callSid, isResolved) => request('/end-call', {
    method: 'POST',
    body: { callSid, isResolved },
});

/**
 * Updates the Elevenlabs configuration.
 * @param {object} data - The Elevenlabs configuration data.
 * @returns {Promise<object>}
 */
export const updateElevenlabsConfig = (data) => request('/config/elevenlabs', {
    method: 'POST',
    body: data,
});

/**
 * Updates the Twilio configuration.
 * @param {object} data - The Twilio configuration data.
 * @returns {Promise<object>}
 */
export const updateTwilioConfig = (data) => request('/config/twilio', {
    method: 'POST',
    body: data,
});

/**
 * Updates the Gemini configuration.
 * @param {object} data - The Gemini configuration data.
 * @returns {Promise<object>}
 */
export const updateGeminiConfig = (data) => request('/config/gemini', {
    method: 'POST',
    body: data,
});

/**
 * Updates the call scripts configuration.
 * @param {object} data - The call scripts data.
 * @returns {Promise<object>}
 */
export const updateCallScripts = (data) => request('/config/scripts', {
    method: 'POST',
    body: data,
});