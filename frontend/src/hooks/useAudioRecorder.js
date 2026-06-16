import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const stream = useRef(null);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDuration(0);
    chunks.current = [];

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream.current, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg",
      });

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: mediaRecorder.current.mimeType });
        setAudioBlob(blob);
      };

      mediaRecorder.current.start(250); 
      setIsRecording(true);

      
      const startTime = Date.now();
      timer.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.");
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timer.current);
      setIsRecording(false);
    }
  }, [isRecording]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, []);

  return { isRecording, duration, audioBlob, error, start, stop, reset };
}
