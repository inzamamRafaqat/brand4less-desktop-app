import { useEffect, useRef } from 'react';

interface UseSpeedXScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enableBeep?: boolean;
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
  maxIntervalMs = 60,
  enableBeep = true,
}: UseSpeedXScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Enter (Scanner Terminator)
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= minChars) {
          e.preventDefault();
          e.stopPropagation();

          if (enableBeep) {
            playScannerBeep();
          }

          onScan(barcode);
        }
        return;
      }

      // If time interval between characters is greater than threshold, reset buffer (manual typing)
      if (timeDiff > maxIntervalMs) {
        bufferRef.current = '';
      }

      // Accumulate standard printable single characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, minChars, maxIntervalMs, enableBeep]);
};
