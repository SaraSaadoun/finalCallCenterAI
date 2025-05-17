// src/components/TestCallModal.js
import React, { useState, useEffect, useRef } from "react";
import {
  startTestCall,
  processAudio,
  endCall,
  handleQuestions,
  getFeedback,
  textToSpeech,
} from "../services/api";
import "./TestCallModal.css";

const CALL_STATE = {
  IDLE: "idle",
  INITIATING: "initiating",
  GREETING_READY: "greeting_ready",
  PLAYING_GREETING: "playing_greeting",
  WAITING_INPUT: "waiting_input",
  RECORDING: "recording",
  PROCESSING_INPUT: "processing_input",
  PLAYING_RESPONSE: "playing_response",
  ENDED: "ended",
  ERROR: "error",
};

// Hardcoded continue logic (Arabic yes/no detection)
function continueCallLogic(userInput) {
  const text = (userInput || "").toLowerCase();
  const yesKeywords = [
    "كمل",
    "تمام",
    "نعم",
    "ايوه",
    "أيوه",
    "آه",
    "اه",
    "أه",
    "ايوة",
    "أيوة",
  ];
  const noKeywords = ["لا", "لأ", "معاد تاني", "لع"];
  if (yesKeywords.some((k) => text.includes(k))) {
    return {
      aiResponse: "تمام يلا نكمل يا فندم.",
      shouldContinue: true,
      nextStep: "handle_questions",
    };
  }
  if (noKeywords.some((k) => text.includes(k))) {
    return {
      aiResponse:
        "تمام يا فندم مفيش مشكلة, هكلم حضرتك في وقت تاني, اسف علي الازعاج.",
      shouldContinue: false,
      nextStep: "end_call",
    };
  }
  return {
    aiResponse:
      "معلش يا فندم اجابة حضرتك مش واضحة, ممكن الاجابة تكون ب اه او لا؟",
    shouldContinue: false,
    nextStep: "continue_prompt",
  };
}

function TestCallModal({ customer, onClose }) {
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [callSid, setCallSid] = useState(null);
  const [conversationState, setConversationState] = useState({
    step: "continue_prompt",
  });
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [transcribedText, setTranscribedText] = useState("");
  const [isResolved, setIsResolved] = useState(null);

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioUrlsRef = useRef([]);

  useEffect(() => {
    return () =>
      audioUrlsRef.current.forEach(
        (u) => u.startsWith("blob:") && URL.revokeObjectURL(u)
      );
  }, []);

  // Play audio helper
  const playAudio = async (url, onEnded) => {
    try {
      let src = url;
      if (!src.startsWith("blob:")) {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Fetch error ${res.status}`);
        const blob = await res.blob();
        src = URL.createObjectURL(blob);
        audioUrlsRef.current.push(src);
      }
      audioRef.current.src = src;
      audioRef.current.onended = onEnded;
      await audioRef.current.play();
    } catch (e) {
      console.error(e);
      setError(e.message);
      setCallState(CALL_STATE.ERROR);
    }
  };

  // Start call
  const handleStartCall = async () => {
    try {
      setCallState(CALL_STATE.INITIATING);
      const { callSid, greeting } = await startTestCall(customer.id);
      setCallSid(callSid);
      setTranscript([{ speaker: "AI", text: greeting }]);
      const audioData = await textToSpeech(greeting);
      const blob = new Blob([audioData], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      audioUrlsRef.current.push(url);
      setCallState(CALL_STATE.PLAYING_GREETING);
      playAudio(url, () => setCallState(CALL_STATE.WAITING_INPUT));
    } catch (e) {
      console.error(e);
      setError(e.message);
      setCallState(CALL_STATE.ERROR);
    }
  };

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        handleSendAudioResponse(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setCallState(CALL_STATE.RECORDING);
    } catch (e) {
      console.error(e);
      setError("Microphone access denied");
      setCallState(CALL_STATE.ERROR);
    }
  };
  const stopRecording = () => mediaRecorderRef.current?.stop();

  // Simulate client-side logic
  const simulateUserResponseClient = async (userInput) => {
    setTranscript((t) => [...t, { speaker: "User", text: userInput }]);
    let aiResp, shouldContinue, nextStep, nextQuestion;
    let cs = { ...conversationState };
    const step = cs.step;

    if (step === "continue_prompt") {
      ({
        aiResponse: aiResp,
        shouldContinue,
        nextStep,
      } = continueCallLogic(userInput));
      cs.step = nextStep;
      if (shouldContinue && nextStep === "handle_questions") {
        nextQuestion = "اول سؤال , هل المشكلة اتحلت يا فندم؟";
        aiResp += nextQuestion;
        cs.step = "initial_question";
        nextQuestion = null;
      }
    } else if (step === "handle_questions") {
      aiResp = "اول سؤال , هل المشكلة اتحلت يا فندم؟";
      cs.step = "initial_question";
    } else if (["initial_question", "check_steps"].includes(step)) {
      const response = await handleQuestions(callSid, userInput, false, cs); //call_sid, user_input, is_audio, conversation_state
      aiResp = response.ai_response;
      setIsResolved(response.resolved);
      // {
      //     "ai_response": "طب حضرتك خلصت الخطوات المطلوبة يا فندم؟",
      //     "conversation_state": {
      //         "step": "check_steps"
      //     },
      //     "feedback": null,
      //     "resolved": false
      // }
      cs = response.conversation_state;
    } else if (["get_feedback", "feedback_prompt"].includes(step)) {
      //             return jsonify({"ai_response": "معلش, ممكن تقيم من واحد لخمسة؟", "feedback": None, "next_step": "feedback_prompt"})

      const { ai_response: resp, next_step } = await getFeedback(
        callSid,
        userInput,
        false
      ); //call_sid, user_input, is_audio
      aiResp = resp;
      cs.step = next_step;
    } else if (step === "end_call") {
      aiResp = "المكالمة انتهت. شكرا لوقتك.";
      cs.step = "completed";
    } else {
      aiResp = "عذرا، حدث خطأ.";
      cs.step = "error";
    }

    // TTS
    const audioData = await textToSpeech(aiResp);
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    audioUrlsRef.current.push(url);
    console.log(aiResp); // Is it an object with speaker and text?

    setTranscript((t) => [...t, { speaker: "AI", text: aiResp }]);
    setConversationState(cs);
    return { audioUrl: url, nextQuestion };
  };

  const handleSendAudioResponse = async (blob) => {
    try {
      setCallState(CALL_STATE.PROCESSING_INPUT);
      const form = new FormData();
      form.append("audio", blob, "audio.wav");
      form.append("callSid", callSid);
      const { transcript: userT } = await processAudio(form);
      setTranscribedText(userT);
      // print logs
      console.log("Entered simulate user response", userT);
      const { audioUrl, nextQuestion } = await simulateUserResponseClient(
        userT
      );
      console.log("Audio URL:", audioUrl);
      setCallState(CALL_STATE.PLAYING_RESPONSE);
      await playAudio(audioUrl, () => {
        if (nextQuestion) {
          setTimeout(() => {
            setTranscript((t) => [...t, { speaker: "AI", text: nextQuestion }]);
            setCallState(CALL_STATE.WAITING_INPUT);
          }, 1000);
        } else setCallState(CALL_STATE.WAITING_INPUT);
      });
    } catch (e) {
      console.error(e);
      setError(e.message);
      setCallState(CALL_STATE.ERROR);
    }
  };

  const handleEndCall = async (resolved) => {
    try {
      await endCall(callSid, resolved);
      setTranscript((t) => [
        ...t,
        { speaker: "System", text: `Call ended. Resolved: ${resolved}` },
      ]);
      setCallState(CALL_STATE.ENDED);
      setIsResolved(resolved);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setCallState(CALL_STATE.ERROR);
    }
  };

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
        return <p className="loading-message">Preparing greeting...</p>;
      case CALL_STATE.PLAYING_GREETING:
      case CALL_STATE.PLAYING_RESPONSE:
        return (
          <p className="loading-message">
            <i>AI Speaking...</i>
          </p>
        );
      case CALL_STATE.RECORDING:
        return (
          <div className="recording-container">
            <div className="recording-indicator">Recording...</div>
            <button onClick={stopRecording} className="stop-recording-button">
              Stop Recording
            </button>
          </div>
        );
      case CALL_STATE.WAITING_INPUT:
      case CALL_STATE.PROCESSING_INPUT:
        return (
          <div>
            <div className="audio-controls">
              <button
                onClick={startRecording}
                disabled={callState === CALL_STATE.PROCESSING_INPUT}
                className="record-button"
              >
                {callState === CALL_STATE.PROCESSING_INPUT
                  ? "Processing…"
                  : "Record Response"}
              </button>
              {transcribedText && (
                <div className="transcribed-text">
                  <strong>Last transcribed:</strong> {transcribedText}
                </div>
              )}
            </div>
            {transcript.length > 1 && (
              <div className="end-call-buttons">
                <button
                  onClick={() => handleEndCall(true)}
                  className="end-resolved-button"
                >
                  إنهاء (تم الحل)
                </button>
                <button
                  onClick={() => handleEndCall(false)}
                  className="end-unresolved-button"
                >
                  إنهاء (لم يتم الحل)
                </button>
              </div>
            )}
          </div>
        );
      case CALL_STATE.ENDED:
        return (
          <div>
            <p className="success-message">Call Ended.</p>
            <p>Final Status: {isResolved ? "Resolved" : "Not Resolved"}</p>
            <button onClick={onClose}>Close</button>
          </div>
        );
      case CALL_STATE.ERROR:
        return (
          <div>
            <p className="error-message">Error: {error}</p>
            <button onClick={onClose} className="close-button">
              Close
            </button>
          </div>
        );
      default:
        return <p>Loading…</p>;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          ×
        </button>
        <h3>Test Call Simulation – {customer.name}</h3>
        <div
          className="transcript"
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "10px",
            background: "#f9f9f9",
            border: "1px solid #eee",
          }}
        >
          <h4>Conversation:</h4>
          {transcript.map((msg, i) => (
            <p
              key={i}
              className={`transcript-message ${msg.speaker.toLowerCase()}`}
            >
              <strong>{msg.speaker}:</strong> {msg.text}
            </p>
          ))}
        </div>
        {renderContent()}
        <audio ref={audioRef} style={{ display: "none" }} controls />
      </div>
    </div>
  );
}

export default TestCallModal;
