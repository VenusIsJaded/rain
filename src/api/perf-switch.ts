/**
 * ZERO-DEPENDENCY PERFORMANCE SWITCH
 * Safe to import at the very top of the bundle before React/Zustand load.
 */
export let isPerfMode = true; // Default to true (logs disabled) for max boot speed

export function setPerfMode(value: boolean) {
    isPerfMode = value;
}

// Override console IMMEDIATELY before Discord can save references
const origLog = console.log;
const origWarn = console.warn;
const origInfo = console.info;
const origDebug = console.debug;

console.log = (...args: any[]) => { if (!isPerfMode) origLog(...args); };
console.warn = (...args: any[]) => { if (!isPerfMode) origWarn(...args); };
console.info = (...args: any[]) => { if (!isPerfMode) origInfo(...args); };
console.debug = (...args: any[]) => { if (!isPerfMode) origDebug(...args); };
