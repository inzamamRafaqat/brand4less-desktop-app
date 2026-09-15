import { useEffect, useRef } from 'react';

export interface UseSpeedXScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enableBeep?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * Web Audio API synthesized POS scanner acknowledgment beep
 */
export const playScannerBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime); // High-pitched crisp POS scan beep
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // ignore audio block
  }
};

/**
 * Global Hardware Barcode Scanner Hook for SpeedX and Standard HID Keyboard Wedge Scanners
 */
export const useSpeedXScanner = ({
  onScan,
  minChars = 3,
  maxIntervalMs = 120, // 100-150ms recommended for reliable USB HID wedge scanners
  enableBeep = true,
  prefix = '',
  suffix = 'Enter',
}: UseSpeedXScannerOptions) => {
  const bufferRef = useRef<string>('');
  const charTimesRef = useRef<number[]>([]);
  const timeoutIdRef = useRef<any>(null);
  const onScanRef = useRef(onScan);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const resetBuffer = () => {
      bufferRef.current = '';
      charTimesRef.current = [];
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Check for scan completion trigger (Enter or Tab or configured suffix)
      const isTerminator = e.key === 'Enter' || (suffix && e.key === suffix);

      if (isTerminator) {
        const rawCode = bufferRef.current.trim();
        const timestamps = charTimesRef.current;

        // Verify if characters arrived with high-speed burst typical of a barcode scanner
        let isScannerBurst = false;
        if (timestamps.length >= minChars) {
          let maxGap = 0;
          for (let i = 1; i < timestamps.length; i++) {
            const gap = timestamps[i] - timestamps[i - 1];
            if (gap > maxGap) maxGap = gap;
          }
          // If the maximum gap between any two characters was within maxIntervalMs, it's a hardware scanner
          if (maxGap <= maxIntervalMs) {
            isScannerBurst = true;
          }
        }

        if (rawCode.length >= minChars && (isScannerBurst || !isFormField || target?.hasAttribute('data-scanner-input'))) {
          e.preventDefault();
          e.stopPropagation();

          let finalCode = rawCode;
          if (prefix && finalCode.startsWith(prefix)) {
            finalCode = finalCode.substring(prefix.length);
          }

          // Duplicate scan protection: suppress exact same barcode scanned within 400ms
          const scanTime = Date.now();
          if (finalCode === lastScannedCodeRef.current && scanTime - lastScannedTimeRef.current < 400) {
            resetBuffer();
            return;
          }
          lastScannedCodeRef.current = finalCode;
          lastScannedTimeRef.current = scanTime;

          if (enableBeep) {
            playScannerBeep();
          }

          resetBuffer();

          // If scanned while focused in an input field, clean that input so scanner text doesn't contaminate it
          if (isFormField && target instanceof HTMLInputElement && !target.hasAttribute('data-keep-scanner-input')) {
            target.value = '';
          }

          onScanRef.current(finalCode);
          return;
        }

        resetBuffer();
        return;
      }

      // If key is a printable character (length 1)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Check timing between consecutive characters
        const lastTime = charTimesRef.current.length > 0 ? charTimesRef.current[charTimesRef.current.length - 1] : 0;
        const timeDiff = lastTime > 0 ? now - lastTime : 0;

        if (lastTime > 0 && timeDiff > maxIntervalMs) {
          // Time gap too long -> reset buffer for fresh input
          bufferRef.current = e.key;
          charTimesRef.current = [now];
        } else {
          bufferRef.current += e.key;
          charTimesRef.current.push(now);
        }

        // Set safety cleanup timer (resets buffer if scanner sent partial characters without terminator)
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = setTimeout(resetBuffer, maxIntervalMs * 3);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [minChars, maxIntervalMs, enableBeep, prefix, suffix]);
};

/**
 * Simulates rapid USB HID hardware keyboard-wedge scanner events for developer testing
 */
export const simulateSpeedXScan = (barcode: string) => {
  const code = (barcode || '').trim();
  if (!code) return;
  
  // Dispatch characters rapidly in succession
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const charEvent = new KeyboardEvent('keydown', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(charEvent);
  }

  // Dispatch scanner terminator Enter key
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(enterEvent);
};
