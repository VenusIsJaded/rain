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

// --- PATCH DISCORD'S INTERNAL LOGGER ---
// Discord's internal code saves a reference to console.log before we can override it.
// To catch [app], [FAST CONNECT], [gateway], etc., we must patch their Logger prototype.
const patchDiscordLogger = () => {
    try {
        const metro = require("@metro");
        const Logger = metro.findByName("Logger", false);
        
        if (Logger && Logger.prototype) {
            const methods = ["log", "info", "warn", "debug", "verbose", "trace"];
            methods.forEach(method => {
                if (typeof Logger.prototype[method] === "function") {
                    const orig = Logger.prototype[method];
                    Logger.prototype[method] = function(...args: any[]) {
                        if (!isPerfMode) orig.apply(this, args);
                    };
                }
            });
            if (!isPerfMode) origLog("[PerfSwitch] Successfully patched Discord Logger prototype");
            return true;
        }
    } catch (e) {}
    return false;
};

let loggerAttempts = 0;
const loggerInterval = setInterval(() => {
    loggerAttempts++;
    if (patchDiscordLogger() || loggerAttempts > 20) {
        clearInterval(loggerInterval);
    }
}, 500);
