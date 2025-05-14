// src/components/Settings.js
import React, { useState } from 'react';
import {
    updateElevenlabsConfig,
    updateTwilioConfig,
    updateGeminiConfig,
    updateCallScripts
} from '../services/api';

function Settings() {
    // State for forms
    const [elevenLabsData, setElevenLabsData] = useState({ apiKey: '', voiceId: '' });
    // Add state for Twilio, Gemini, Scripts if you implement actual saving
    // const [twilioData, setTwilioData] = useState({ accountSid: '', authToken: '', phoneNumber: '' });
    // const [geminiData, setGeminiData] = useState({ apiKey: '' });
    // const [scriptsData, setScriptsData] = useState({ greeting: '', resolutionCheck: '' });

    // State for feedback messages
    const [messages, setMessages] = useState({}); // e.g., { elevenlabs: { type: 'success', text: '...' } }

    const handleInputChange = (setter) => (e) => {
        setter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (apiFunc, data, key) => {
         setMessages(prev => ({ ...prev, [key]: { type: 'loading', text: 'Saving...' } }));
         try {
             const result = await apiFunc(data);
             if (result.success) {
                 setMessages(prev => ({ ...prev, [key]: { type: 'success', text: result.message || 'Settings updated successfully.' } }));
             } else {
                 throw new Error(result.message || `Failed to update ${key} settings.`);
             }
         } catch (err) {
             setMessages(prev => ({ ...prev, [key]: { type: 'error', text: err.message || `Failed to update ${key} settings.` } }));
             console.error(`Error updating ${key}:`, err);
         }
    };

    const renderMessage = (key) => {
        const msg = messages[key];
        if (!msg) return null;
        return <p className={`${msg.type}-message`}>{msg.text}</p>;
    }

    return (
        <div>
            <h2>Settings</h2>

            {/* --- ElevenLabs Settings --- */}
            <div className="settings-section">
                <h3>ElevenLabs Configuration</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(updateElevenlabsConfig, elevenLabsData, 'elevenlabs'); }}>
                    <label htmlFor="elevenApiKey">API Key:</label>
                    <input
                        type="password" // Use password type for keys
                        id="elevenApiKey"
                        name="apiKey"
                        placeholder="Enter ElevenLabs API Key"
                        value={elevenLabsData.apiKey}
                        onChange={handleInputChange(setElevenLabsData)}
                    />
                     <label htmlFor="elevenVoiceId">Voice ID:</label>
                    <input
                        type="text"
                        id="elevenVoiceId"
                        name="voiceId"
                        placeholder="Enter ElevenLabs Voice ID (e.g., 21m00Tcm4TlvDq8ikWAM)"
                        value={elevenLabsData.voiceId}
                        onChange={handleInputChange(setElevenLabsData)}
                    />
                    <button type="submit" disabled={messages.elevenlabs?.type === 'loading'}>
                        {messages.elevenlabs?.type === 'loading' ? 'Saving...' : 'Save ElevenLabs Config'}
                    </button>
                    {renderMessage('elevenlabs')}
                </form>
            </div>

             {/* --- Twilio Settings (Placeholder) --- */}
             <div className="settings-section">
                <h3>Twilio Configuration (Placeholder)</h3>
                 <p><i>Backend endpoint exists but doesn't store data in this example.</i></p>
                {/* <form onSubmit={(e) => { e.preventDefault(); handleSubmit(updateTwilioConfig, {}, 'twilio'); }}> */}
                    {/* Add inputs for SID, Token, Phone Number */}
                    {/* <button type="submit">Save Twilio Config</button> */}
                {/* </form> */}
                {/* {renderMessage('twilio')} */}
            </div>

             {/* --- Gemini Settings (Placeholder) --- */}
             <div className="settings-section">
                <h3>Gemini Configuration (Placeholder)</h3>
                 <p><i>Backend endpoint exists but doesn't store data in this example.</i></p>
                {/* <form onSubmit={(e) => { e.preventDefault(); handleSubmit(updateGeminiConfig, {}, 'gemini'); }}> */}
                    {/* Add input for API Key */}
                    {/* <button type="submit">Save Gemini Config</button> */}
                 {/* </form> */}
                 {/* {renderMessage('gemini')} */}
            </div>

             {/* --- Call Scripts (Placeholder) --- */}
             <div className="settings-section">
                <h3>Call Scripts (Placeholder)</h3>
                 <p><i>Backend endpoint exists but doesn't store data in this example.</i></p>
                {/* <form onSubmit={(e) => { e.preventDefault(); handleSubmit(updateCallScripts, {}, 'scripts'); }}> */}
                     {/* Add textareas for different script parts */}
                    {/* <button type="submit">Save Scripts</button> */}
                 {/* </form> */}
                 {/* {renderMessage('scripts')} */}
            </div>
        </div>
    );
}

export default Settings;