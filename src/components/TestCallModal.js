// src/components/TestCallModal.js
import React, { useState, useEffect, useRef } from 'react';
import { startTestCall, processAudio, endCall, getAudioUrl } from '../services/api';
import './TestCallModal.css'; // Import CSS for styling

const CALL_STATE = {
    IDLE: 'idle',
    INITIATING: 'initiating',
    GREETING_READY: 'greeting_ready', // New state after greeting URL is fetched
    PLAYING_GREETING: 'playing_greeting',
    WAITING_INPUT: 'waiting_input',
    RECORDING: 'recording', // New state for audio recording
    PROCESSING_INPUT: 'processing_input',
    PLAYING_RESPONSE: 'playing_response',
    ENDED: 'ended',
    ERROR: 'error',
};

function TestCallModal({ customer, onClose }) {
    const [callState, setCallState] = useState(CALL_STATE.IDLE);
    const [callSid, setCallSid] = useState(null);
    const [greetingText, setGreetingText] = useState('');
    const [greetingAudioUrl, setGreetingAudioUrl] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [responseAudioUrl, setResponseAudioUrl] = useState(null);
    const [transcribedText, setTranscribedText] = useState(''); // For displaying what user said
    const [isResolved, setIsResolved] = useState(false);
    const [error, setError] = useState(null);
    const [transcript, setTranscript] = useState([]); // Store conversation history

    // Audio recording related states
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);

    const audioRef = useRef(null); // Ref for the audio playback element
    const mediaRecorderRef = useRef(null); // Ref for MediaRecorder
    const audioChunksRef = useRef([]); // To store audio chunks during recording
    const audioObjectUrlsRef = useRef([]); // To track and clean up object URLs

    // --- Effects ---
    useEffect(() => {
        // No longer starting the call automatically on mount
    }, [customer.id]);

    useEffect(() => {
        // Auto-play greeting audio
        if (greetingAudioUrl && callState === CALL_STATE.GREETING_READY) {
            playAudio(greetingAudioUrl, () => setCallState(CALL_STATE.WAITING_INPUT));
            setCallState(CALL_STATE.PLAYING_GREETING);
        }
    }, [greetingAudioUrl, callState]);

    // Cleanup object URLs when unmounting
    useEffect(() => {
        return () => {
            // Clean up all created object URLs
            audioObjectUrlsRef.current.forEach(url => {
                if (url && url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, []);

    // --- Audio Handling ---
    const playAudio = async (url, onEndedCallback) => {
        try {
            console.log("Attempting to play audio from URL:", url);
            
            // Check if we're dealing with a blob URL already
            if (url.startsWith('blob:')) {
                if (audioRef.current) {
                    audioRef.current.src = url;
                    
                    const currentAudio = audioRef.current;
                    const handleEnded = () => {
                        if(onEndedCallback) onEndedCallback();
                        currentAudio.removeEventListener('ended', handleEnded);
                    };
                    
                    currentAudio.addEventListener('ended', handleEnded);
                    await currentAudio.play();
                }
                return;
            }
            
            // If it's not a blob URL, fetch it first to check content type
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log("Audio response content type:", contentType);
            
            // Create appropriate audio type - even if content type is wrong
            // We'll try to play it anyway since it might be mislabeled
            const validAudioType = contentType?.startsWith('audio/') 
                ? contentType 
                : 'audio/mpeg'; // Default to a common audio format
            
            const blob = await response.blob();
            const audioBlob = new Blob([blob], { type: validAudioType });
            const audioObjectUrl = URL.createObjectURL(audioBlob);
            
            // Track this URL for cleanup
            audioObjectUrlsRef.current.push(audioObjectUrl);
            
            if (audioRef.current) {
                audioRef.current.src = audioObjectUrl;
                
                // Set up event listeners
                const currentAudio = audioRef.current;
                const handleEnded = () => {
                    if(onEndedCallback) onEndedCallback();
                    currentAudio.removeEventListener('ended', handleEnded);
                };
                
                const handleError = (e) => {
                    console.error("Audio element error:", e);
                    setError(`Failed to play audio: The audio format is not supported or file is corrupted.`);
                    setCallState(CALL_STATE.ERROR);
                    currentAudio.removeEventListener('error', handleError);
                };
                
                currentAudio.addEventListener('ended', handleEnded);
                currentAudio.addEventListener('error', handleError);
                
                try {
                    await currentAudio.play();
                } catch (e) {
                    console.error("Audio play failed:", e);
                    throw new Error(`Browser couldn't play the audio: ${e.message}`);
                }
            }
        } catch (e) {
            console.error("Audio play failed:", e);
            setError(`Failed to play audio: ${e.message || "Unknown error"}`);
            setCallState(CALL_STATE.ERROR);
        }
    };

    const handlePlayGreeting = () => {
        if (greetingAudioUrl && callState === CALL_STATE.GREETING_READY) {
            playAudio(greetingAudioUrl, () => setCallState(CALL_STATE.WAITING_INPUT));
            setCallState(CALL_STATE.PLAYING_GREETING);
        }
    };

    // --- Audio Recording Functions ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(audioBlob);
                setIsRecording(false);
                handleSendAudioResponse(audioBlob);

                // Stop all audio tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setCallState(CALL_STATE.RECORDING);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Failed to access microphone. Please check permissions and try again.");
            setCallState(CALL_STATE.ERROR);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    // --- API Call Handlers ---
    const handleStartCall = async () => {
        setCallState(CALL_STATE.INITIATING);
        setError(null);
        setTranscript([]); // Reset transcript
        try {
            const result = await startTestCall(customer.id);
            console.log("Start test call result:", result);
            
            setCallSid(result.callSid);
            setGreetingText(result.greeting);
            
            // Use the audio URL from the API response if available, otherwise construct it
            const greetingUrl = result.greetingAudioUrl || getAudioUrl(result.callSid);
            console.log("Using greeting audio URL:", greetingUrl);
            setGreetingAudioUrl(greetingUrl);
            
            setTranscript(prev => [...prev, { speaker: 'AI', text: result.greeting }]);
            setCallState(CALL_STATE.GREETING_READY);
        } catch (err) {
            setError(err.message || 'Failed to start test call.');
            setCallState(CALL_STATE.ERROR);
            console.error(err);
        }
    };

    const handleSendAudioResponse = async (blob) => {
        if (!blob || !callSid) return;

        setCallState(CALL_STATE.PROCESSING_INPUT);
        setError(null);

        try {
            // Create FormData to send audio file
            const formData = new FormData();
            formData.append('audio', blob, 'audio.wav');
            formData.append('callSid', callSid);

            const result = await processAudio(formData);
            console.log("processAudio result:", result);

            setTranscribedText(result.transcript);
            setResponseText(result.response);
            setIsResolved(result.isResolved);

            // Ensure we have a valid URL - either directly from the API or construct it
            let audioUrl = `http://localhost:5001/${result.audioUrl}`;

            if (!audioUrl) {
                // Fallback to constructed URL if API doesn't provide one
                audioUrl = getAudioUrl(callSid, '_response'); // Adding suffix to differentiate
                console.log("Constructed response audio URL:", audioUrl);
            } else {
                console.log("Using API-provided audio URL:", audioUrl);
            }

            // Update transcript before playing audio
            setTranscript(prev => [
                ...prev,
                { speaker: 'User', text: result.transcript },
                { speaker: 'AI', text: result.response }
            ]);

            // Play the audio and handle state transition
            try {
                setCallState(CALL_STATE.PLAYING_RESPONSE);
                await playAudio(audioUrl, () => {
                    setCallState(CALL_STATE.WAITING_INPUT);
                });
            } catch (audioErr) {
                console.error("Failed to play response audio:", audioErr);
                // Even if audio fails, we've already updated the transcript, so go to waiting input
                setCallState(CALL_STATE.WAITING_INPUT);
            }

        } catch (err) {
            setError(err.message || 'Failed to process audio response.');
            setCallState(CALL_STATE.ERROR);
            console.error(err);
        }
    };

    const handleEndCall = async (resolvedStatus) => {
        if (!callSid) return;
        setError(null);
        try {
            await endCall(callSid, resolvedStatus);
            setCallState(CALL_STATE.ENDED);
            setTranscript(prev => [...prev, { speaker: 'System', text: `Call ended. Resolved: ${resolvedStatus}` }]);
            // Maybe call onClose() after a short delay?
            // setTimeout(onClose, 2000);
        } catch (err) {
            setError(err.message || 'Failed to end call.');
            setCallState(CALL_STATE.ERROR); // Keep modal open to show error
            console.error(err);
        }
    };

    // --- Render Logic ---
    const renderContent = () => {
        switch (callState) {
            case CALL_STATE.IDLE:
                return (
                    <button onClick={handleStartCall} className="start-call-button">
                        Start Test Call
                    </button>
                );
            case CALL_STATE.INITIATING:
                return <p className="loading-message">Initiating test call...</p>;
            case CALL_STATE.GREETING_READY:
                return (
                    <button onClick={handlePlayGreeting} className="play-greeting-button">
                        Play Greeting
                    </button>
                );
            case CALL_STATE.PLAYING_GREETING:
            case CALL_STATE.PLAYING_RESPONSE:
                return <p className="loading-message"><i>AI Speaking...</i></p>;
            case CALL_STATE.RECORDING:
                return (
                    <div className="recording-container">
                        <div className="recording-indicator">Recording...</div>
                        <button
                            onClick={stopRecording}
                            className="stop-recording-button"
                        >
                            Stop Recording
                        </button>
                    </div>
                );
            case CALL_STATE.WAITING_INPUT:
            case CALL_STATE.PROCESSING_INPUT: // Still show input while processing
                return (
                    <div>
                        <div className="audio-controls">
                            <button
                                onClick={startRecording}
                                disabled={callState === CALL_STATE.PROCESSING_INPUT}
                                className="record-button"
                            >
                                {callState === CALL_STATE.PROCESSING_INPUT ? 'Processing...' : 'Record Response'}
                            </button>

                            {transcribedText && (
                                <div className="transcribed-text">
                                    <p><strong>Last transcribed:</strong> {transcribedText}</p>
                                </div>
                            )}
                        </div>

                        {/* Show end call buttons only after at least one response */}
                        {transcript.length > 1 && (
                            <div className="end-call-buttons">
                                <button
                                    onClick={() => handleEndCall(true)}
                                    disabled={callState === CALL_STATE.PROCESSING_INPUT}
                                    className="end-resolved-button"
                                >
                                    إنهاء (تم الحل) (End - Resolved)
                                </button>
                                <button
                                    onClick={() => handleEndCall(false)}
                                    disabled={callState === CALL_STATE.PROCESSING_INPUT}
                                    className="end-unresolved-button"
                                >
                                    إنهاء (لم يتم الحل) (End - Not Resolved)
                                </button>
                            </div>
                        )}
                    </div>
                );
            case CALL_STATE.ENDED:
                return (
                    <div>
                        <p className="success-message">Call Ended.</p>
                        <p>Final Status: {isResolved ? "Resolved" : "Not Resolved / Escalated"}</p>
                        <button onClick={onClose}>Close</button>
                    </div>
                );
            case CALL_STATE.ERROR:
                return (
                    <div>
                        <p className="error-message">Error: {error}</p>
                        <p>Please ensure your browser allows autoplay for this site.</p>
                        <div className="error-action-buttons">
                            <button onClick={onClose} className="close-button">Close</button>
                            <button onClick={handleStartCall} className="retry-button">Retry Call</button>
                        </div>
                    </div>
                );
            default:
                return <p>Loading...</p>;
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close-button" onClick={onClose}>×</button>
                <h3>Test Call Simulation - {customer.name}</h3>
                <div className="transcript" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px', border: '1px solid #eee', padding: '10px', background: '#f9f9f9' }}>
                    <h4>Conversation:</h4>
                    {transcript.map((msg, index) => (
                        <p key={index} className={`transcript-message ${msg.speaker.toLowerCase()}`}>
                            <strong>{msg.speaker}:</strong> {msg.text}
                        </p>
                    ))}
                </div>

                {renderContent()}

                {/* Hidden audio player */}
                <audio ref={audioRef} style={{ display: 'none' }} controls />
            </div>
        </div>
    );
}

export default TestCallModal;