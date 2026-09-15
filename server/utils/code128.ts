/**
 * Standard Code 128 Barcode Generator
 * 
 * Implements ISO/IEC 15417 Code 128 Specification
 * Subsets B and C with automatic symbol encoding, modulo 103 checksum calculation,
 * and standard start/stop character patterns.
 */

// Code 128 patterns (107 patterns, index 0..106)
// Each pattern represents 6 element widths (3 bars, 3 spaces) summing to 11 modules,
// except pattern 106 (stop) which has 7 elements summing to 13 modules.
export const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0: ' ' (32)
  [2, 2, 2, 1, 2, 2], // 1: '!'
  [2, 2, 2, 2, 2, 1], // 2: '"'
  [1, 2, 1, 2, 2, 3], // 3: '#'
  [1, 2, 1, 3, 2, 2], // 4: '$'
  [1, 3, 1, 2, 2, 2], // 5: '%'
  [1, 2, 2, 2, 1, 3], // 6: '&'
  [1, 2, 2, 3, 1, 2], // 7: '\''
  [1, 3, 2, 2, 1, 2], // 8: '('
  [2, 2, 1, 2, 1, 3], // 9: ')'
  [2, 2, 1, 3, 1, 2], // 10: '*'
  [2, 3, 1, 2, 1, 2], // 11: '+'
  [1, 1, 2, 2, 3, 2], // 12: ','
  [1, 2, 2, 1, 3, 2], // 13: '-'
  [1, 2, 2, 2, 3, 1], // 14: '.'
  [1, 1, 3, 2, 2, 2], // 15: '/'
  [1, 2, 3, 1, 2, 2], // 16: '0'
  [1, 2, 3, 2, 2, 1], // 17: '1'
  [2, 2, 3, 2, 1, 1], // 18: '2'
  [2, 2, 1, 1, 3, 2], // 19: '3'
  [2, 2, 1, 2, 3, 1], // 20: '4'
  [2, 1, 3, 2, 1, 2], // 21: '5'
  [2, 2, 3, 1, 1, 2], // 22: '6'
  [3, 1, 2, 1, 3, 1], // 23: '7'
  [3, 1, 1, 2, 2, 2], // 24: '8'
  [3, 2, 1, 1, 2, 2], // 25: '9'
  [3, 2, 1, 2, 2, 1], // 26: ':'
  [3, 1, 2, 2, 1, 2], // 27: ';'
  [3, 2, 2, 1, 1, 2], // 28: '<'
  [3, 2, 2, 2, 1, 1], // 29: '='
  [2, 1, 2, 1, 2, 3], // 30: '>'
  [2, 1, 2, 3, 2, 1], // 31: '?'
  [2, 3, 2, 1, 2, 1], // 32: '@'
  [1, 1, 1, 3, 2, 3], // 33: 'A'
  [1, 3, 1, 1, 2, 3], // 34: 'B'
  [1, 3, 1, 3, 2, 1], // 35: 'C'
  [1, 1, 2, 3, 1, 3], // 36: 'D'
  [1, 3, 2, 1, 1, 3], // 37: 'E'
  [1, 3, 2, 3, 1, 1], // 38: 'F'
  [2, 1, 1, 3, 1, 3], // 39: 'G'
  [2, 3, 1, 1, 1, 3], // 40: 'H'
  [2, 3, 1, 3, 1, 1], // 41: 'I'
  [1, 1, 2, 1, 3, 3], // 42: 'J'
  [1, 1, 2, 3, 3, 1], // 43: 'K'
  [1, 3, 2, 1, 3, 1], // 44: 'L'
  [1, 1, 3, 1, 2, 3], // 45: 'M'
  [1, 1, 3, 3, 2, 1], // 46: 'N'
  [1, 3, 3, 1, 2, 1], // 47: 'O'
  [3, 1, 3, 1, 2, 1], // 48: 'P'
  [2, 1, 1, 3, 3, 1], // 49: 'Q'
  [2, 3, 1, 1, 3, 1], // 50: 'R'
  [2, 1, 3, 1, 1, 3], // 51: 'S'
  [2, 1, 3, 3, 1, 1], // 52: 'T'
  [2, 1, 3, 1, 3, 1], // 53: 'U'
  [3, 1, 1, 1, 2, 3], // 54: 'V'
  [3, 1, 1, 3, 2, 1], // 55: 'W'
  [3, 3, 1, 1, 2, 1], // 56: 'X'
  [3, 1, 2, 1, 1, 3], // 57: 'Y'
  [3, 1, 2, 3, 1, 1], // 58: 'Z'
  [3, 3, 2, 1, 1, 1], // 59: '['
  [3, 1, 4, 1, 1, 1], // 60: '\\'
  [2, 2, 1, 4, 1, 1], // 61: ']'
  [4, 3, 1, 1, 1, 1], // 62: '^'
  [1, 1, 1, 2, 2, 4], // 63: '_'
  [1, 1, 1, 4, 2, 2], // 64: '`'
  [1, 2, 1, 1, 2, 4], // 65: 'a'
  [1, 2, 1, 4, 2, 1], // 66: 'b'
  [1, 4, 1, 1, 2, 2], // 67: 'c'
  [1, 4, 1, 2, 2, 1], // 68: 'd'
  [1, 1, 2, 2, 1, 4], // 69: 'e'
  [1, 1, 2, 4, 1, 2], // 70: 'f'
  [1, 2, 2, 1, 1, 4], // 71: 'g'
  [1, 2, 2, 4, 1, 1], // 72: 'h'
  [1, 4, 2, 1, 1, 2], // 73: 'i'
  [1, 4, 2, 2, 1, 1], // 74: 'j'
  [2, 4, 1, 2, 1, 1], // 75: 'k'
  [2, 2, 1, 1, 1, 4], // 76: 'l'
  [4, 1, 3, 1, 1, 1], // 77: 'm'
  [2, 4, 1, 1, 1, 2], // 78: 'n'
  [1, 3, 4, 1, 1, 1], // 79: 'o'
  [1, 1, 1, 2, 4, 2], // 80: 'p'
  [1, 2, 1, 1, 4, 2], // 81: 'q'
  [1, 2, 1, 2, 4, 1], // 82: 'r'
  [1, 1, 4, 2, 1, 2], // 83: 's'
  [1, 2, 4, 1, 1, 2], // 84: 't'
  [1, 2, 4, 2, 1, 1], // 85: 'u'
  [4, 1, 1, 2, 1, 2], // 86: 'v'
  [4, 2, 1, 1, 1, 2], // 87: 'w'
  [4, 2, 1, 2, 1, 1], // 88: 'x'
  [2, 1, 2, 1, 4, 1], // 89: 'y'
  [2, 1, 4, 1, 2, 1], // 90: 'z'
  [4, 1, 2, 1, 2, 1], // 91: '{'
  [1, 1, 1, 1, 4, 3], // 92: '|'
  [1, 1, 1, 3, 4, 1], // 93: '}'
  [1, 3, 1, 1, 4, 1], // 94: '~'
  [1, 1, 4, 1, 1, 3], // 95: DEL
  [1, 1, 4, 3, 1, 1], // 96: FNC3
  [4, 1, 1, 1, 1, 3], // 97: FNC2
  [4, 1, 1, 3, 1, 1], // 98: SHIFT
  [1, 1, 3, 1, 4, 1], // 99: CODE C
  [1, 1, 4, 1, 3, 1], // 100: CODE B
  [3, 1, 1, 1, 4, 1], // 101: FNC4
  [4, 1, 1, 1, 3, 1], // 102: FNC1
  [2, 1, 1, 4, 1, 2], // 103: START A
  [2, 1, 1, 2, 1, 4], // 104: START B
  [2, 1, 1, 2, 3, 2], // 105: START C
  [2, 3, 3, 1, 1, 1, 2], // 106: STOP (7 elements)
];

const START_B = 104;
const START_C = 105;
const STOP = 106;

export interface Code128BarWidths {
  widths: number[]; // Alternating bar and space widths
  totalModules: number;
}

/**
 * Encodes an ASCII string into Code 128 symbol sequence including Start, Checksum, and Stop.
 */
export function encodeCode128Symbols(text: string): number[] {
  const cleanText = (text || '000000').trim();
  const symbols: number[] = [];

  // Check if string is purely numeric and even length -> can use Code C for optimal compaction
  const isPureNumeric = /^\d+$/.test(cleanText);

  if (isPureNumeric && cleanText.length % 2 === 0 && cleanText.length >= 4) {
    // Mode C
    symbols.push(START_C);
    for (let i = 0; i < cleanText.length; i += 2) {
      const pair = parseInt(cleanText.substring(i, i + 2), 10);
      symbols.push(pair);
    }
  } else {
    // Mode B (Standard ASCII 32..126)
    symbols.push(START_B);
    for (let i = 0; i < cleanText.length; i++) {
      const code = cleanText.charCodeAt(i);
      const symbolVal = code >= 32 && code <= 126 ? code - 32 : 0;
      symbols.push(symbolVal);
    }
  }

  // Calculate Checksum: (StartValue + Sum(Index * Value)) % 103
  let checksum = symbols[0];
  for (let i = 1; i < symbols.length; i++) {
    checksum += i * symbols[i];
  }
  checksum = checksum % 103;
  symbols.push(checksum);
  symbols.push(STOP);

  return symbols;
}

/**
 * Returns the exact sequence of bar and space widths (in modules) for rendering.
 */
export function getCode128BarWidths(text: string): Code128BarWidths {
  const symbols = encodeCode128Symbols(text);
  const widths: number[] = [];
  let totalModules = 0;

  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym];
    if (pattern) {
      for (const w of pattern) {
        widths.push(w);
        totalModules += w;
      }
    }
  }

  return { widths, totalModules };
}

/**
 * Generates an SVG string representation of a standard Code 128 barcode.
 */
export function generateCode128Svg(
  text: string,
  options: {
    height?: number;
    svgWidth?: number;
    barColor?: string;
  } = {}
): string {
  const height = options.height || 40;
  const svgWidth = options.svgWidth || 240;
  const barColor = options.barColor || '#000000';

  const { widths, totalModules } = getCode128BarWidths(text);
  const quietZoneModules = 10; // Standard 10-module quiet zone on each side
  const totalGrid = totalModules + quietZoneModules * 2;
  const unitWidth = svgWidth / totalGrid;

  let currentX = quietZoneModules * unitWidth;
  let rects = '';
  let isBar = true;

  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    const barWidth = w * unitWidth;
    if (isBar) {
      rects += `<rect x="${currentX.toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${height}" fill="${barColor}" />`;
    }
    currentX += barWidth;
    isBar = !isBar;
  }

  return `<svg viewBox="0 0 ${svgWidth} ${height}" class="w-full h-full" preserveAspectRatio="none">${rects}</svg>`;
}
