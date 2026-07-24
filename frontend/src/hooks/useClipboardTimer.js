import { useState, useRef, useEffect, useCallback } from 'react';

export function useClipboardTimer() {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeDuration, setActiveDuration] = useState(30);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const currentTextRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancelAutoClear = useCallback(() => {
    clearTimer();
    setCopied(false);
    setTimeLeft(0);
    currentTextRef.current = null;
  }, [clearTimer]);

  const copyToClipboard = useCallback(async (text, durationSeconds = 30) => {
    if (!text) return false;

    // Supersede logic: clear any pending timer before starting new countdown
    clearTimer();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.warn("Clipboard write failed or permission denied:", err);
    }

    currentTextRef.current = text;
    setCopied(true);
    setActiveDuration(durationSeconds);
    setTimeLeft(durationSeconds);

    // Decrement countdown state every 1 second
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set timer expiry action for best-effort clipboard clear
    timerRef.current = setTimeout(async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText('');
        }
      } catch (err) {
        // Best-effort clear failure ignored gracefully
      } finally {
        setCopied(false);
        setTimeLeft(0);
        timerRef.current = null;
        currentTextRef.current = null;
      }
    }, durationSeconds * 1000);

    return true;
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    copied,
    timeLeft,
    activeDuration,
    copyToClipboard,
    cancelAutoClear
  };
}
