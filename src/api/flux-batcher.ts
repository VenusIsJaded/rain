/**
 * EXPERIMENTAL: MICROTASK FLUX BATCHER
 * Intercepts high-frequency Flux dispatches and groups them into a single 
 * microtask tick. This forces React to batch renders, drastically reducing 
 * Garbage Collection and UI thread blocking during heavy syncs.
 * 
 * RISK: May cause stale store reads if Discord expects synchronous dispatch resolution.
 */
import { FluxDispatcher } from "@metro/common";

if (FluxDispatcher && typeof FluxDispatcher.dispatch === "function") {
    const originalDispatch = FluxDispatcher.dispatch.bind(FluxDispatcher);
    
    // Events that cause massive render spam but are safe to delay by ~1ms
    const BATCHABLE_EVENTS = new Set([
        "MESSAGE_UPDATE", 
        "MESSAGE_CREATE", 
        "MESSAGE_DELETE",
        "CHANNEL_UPDATE", 
        "GUILD_UPDATE", 
        "PRESENCE_UPDATE"
    ]);

    let queue: any[] = [];
    let scheduled = false;

    FluxDispatcher.dispatch = function(event: any) {
        if (!event || !BATCHABLE_EVENTS.has(event.type)) {
            // Non-batchable events (like UI interactions) fire instantly
            return originalDispatch(event);
        }

        queue.push(event);

        if (!scheduled) {
            scheduled = true;
            // Promise.resolve().then() pushes execution to the microtask queue
            Promise.resolve().then(() => {
                const currentQueue = queue;
                queue = [];
                scheduled = false;
                
                // Fire all queued events in a single synchronous block
                for (let i = 0; i < currentQueue.length; i++) {
                    originalDispatch(currentQueue[i]);
                }
            });
        }
    };
}
