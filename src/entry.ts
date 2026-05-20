import type { Metro } from "@metro/types";
import { patchTargets } from "@lib/utils/patchTargets";
const { instead } = require("sublimation");

// @ts-ignore - window is defined later in the bundle, so we assign it early
globalThis.window = globalThis;

async function initializeRain() {
    try {
        const originalFreeze = Object.freeze;
        const originalSeal = Object.seal;

        Object.freeze = function freeze<T>(obj: T): T {
            if (patchTargets.has(obj as any)) return obj;
            return originalFreeze(obj);
        } as any;

        Object.seal = function seal<T>(obj: T): T {
            if (patchTargets.has(obj as any)) return obj;
            return originalSeal(obj);
        } as any;

        await require("@metro/internals/caches").initMetroCache();
        await require(".").default();
    } catch (e) {
        alert(e);
    }
}

if (typeof window.__r === "undefined") {
    let _requireFunc: any;

    interface DeferredQueue {
        object: any;
        method: string;
        resume?: (queue: DeferredQueue) => void;
        args: any[];
    }

    const deferredCalls: Array<DeferredQueue> = [];
    const unpatches = new Set<() => void>();

    const deferMethodExecution = (
        object: any,
        method: string,
        condition?: (...args: any[]) => boolean,
        resume?: (queue: DeferredQueue) => void,
        returnWith?: (queue: DeferredQueue) => any
    ) => {
        const restore = instead(method, object, function (this: any, args: any[], original: any) {
            if (!condition || condition(...args)) {
                const queue: DeferredQueue = { object, method, args, resume };
                deferredCalls.push(queue);
                return returnWith ? returnWith(queue) : undefined;
            }
            return original.apply(this, args);
        });
        unpatches.add(restore);
    };

    const resumeDeferred = () => {
        for (const queue of deferredCalls) {
            const { object, method, args, resume } = queue;
            if (resume) resume(queue);
            else object[method](...args);
        }
        deferredCalls.length = 0;
    };

    const onceIndexRequired = (originalRequire: Metro.RequireFn) => {
        if (window.__fbBatchedBridge) {
            const batchedBridge = window.__fbBatchedBridge;
            deferMethodExecution(
                batchedBridge,
                "callFunctionReturnFlushedQueue",
                (...args) => args[0] === "AppRegistry" || !batchedBridge.getCallableModule(args[0]),
                ({ args }) => {
                    if (batchedBridge.getCallableModule(args[0])) {
                        batchedBridge.__callFunction(...args);
                    }
                },
                () => batchedBridge.flushedQueue()
            );
        }

        if (window.RN$AppRegistry) {
            deferMethodExecution(window.RN$AppRegistry, "runApplication");
        }

        const startDiscord = async () => {
            await initializeRain();
            unpatches.forEach(fn => fn());
            unpatches.clear();
            originalRequire(0);
            resumeDeferred();
            const { initPlugins } = require(".");
            setTimeout(() => initPlugins(), 0);
        };
        startDiscord();
    };

    Object.defineProperties(globalThis, {
        __r: {
            configurable: true,
            get: () => _requireFunc,
            set(v) {
                _requireFunc = function patchedRequire(a: number) {
                    if (a === 0) {
                        if (window.modules instanceof Map) window.modules = Object.fromEntries(window.modules);
                        onceIndexRequired(v);
                        _requireFunc = v;
                    } else return v(a);
                };
            }
        },
        __d: {
            configurable: true,
            get() {
                if (window.Object && !window.modules) {
                    window.modules = window.__c?.();
                    Object.defineProperty(globalThis, "__d", {
                        value: this.value,
                        writable: true,
                        configurable: true
                    });
                }
                return this.value;
            },
            set(v) { this.value = v; }
        }
    });
} else {
    initializeRain();
}
