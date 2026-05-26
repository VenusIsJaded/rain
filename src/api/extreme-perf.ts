/**
 * EXTREME PERFORMANCE OPTIMIZATIONS
 */
let _perfMode = false; 

const initPerfListener = () => {
    try {
        const { useSettings } = require("@api/settings");
        _perfMode = !useSettings.getState().enableLogs;
        useSettings.subscribe((state) => {
            _perfMode = !state.enableLogs;
        });
    } catch (e) {
        setTimeout(initPerfListener, 500);
    }
};
setTimeout(initPerfListener, 100);

if (!__DEV__) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    console.log = (...args: any[]) => { if (!_perfMode) originalLog(...args); };
    console.warn = (...args: any[]) => { if (!_perfMode) originalWarn(...args); };
    console.info = (...args: any[]) => { if (!_perfMode) originalInfo(...args); };
    console.debug = (...args: any[]) => { if (!_perfMode) originalDebug(...args); };
}

try {
    const LogBox = require("react-native").LogBox;
    if (LogBox?.ignoreAllLogs) LogBox.ignoreAllLogs(true);
} catch {}
