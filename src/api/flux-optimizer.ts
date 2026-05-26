/**
 * FLUX EVENT OPTIMIZER
 * Drops high-frequency, useless events before React can process them.
 */
import { FluxDispatcher } from "@metro/common";

if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
    const originalDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
    
    // Events that cause useless React re-renders and bridge traffic
    const BLOCKED_EVENTS = new Set([
        "TRACK",
        "ANALYTICS_EVENT",
        "WINDOW_FOCUS",
        "WINDOW_BLUR",
        "CONNECTION_OPEN_SUPPLEMENTAL" // Massive payload, rarely needed by UI
    ]);

    FluxDispatcher.dispatch = function(event: any) {
        if (event && BLOCKED_EVENTS.has(event.type)) {
            return; // Silently drop the event
        }
        return originalDispatch(event);
    };
}
