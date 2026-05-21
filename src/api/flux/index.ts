// shelter-mod inspired
import { FluxDispatcher } from "@metro/common";

const blockedSym = Symbol.for("rain.flux.blocked");
const modifiedSym = Symbol.for("rain.flux.modified");

export const dispatcher = FluxDispatcher;

type Intercept = (payload: Record<string, any> & { type: string; }) => any;
const intercepts: Intercept[] = [];

/**
 * @internal
 */
export function injectFluxInterceptor() {
    const cb = (payload: any) => {
        const _len = intercepts.length;
        for (let _i = 0; _i < _len; _i++) {
            const res = intercepts[_i](payload);

            // nullish -> nothing, falsy -> block, object -> modify
            if (res == null) {
                continue;
            } else if (!res) {
                payload[blockedSym] = true;
            } else if (typeof res === "object") {
                Object.assign(payload, res);
                payload[modifiedSym] = true;
            }
        }

        return blockedSym in payload;
    };

    (dispatcher._interceptors ??= []).unshift(cb);

    return () => dispatcher._interceptors &&= dispatcher._interceptors.filter(v => v !== cb);
}

/**
 * Intercept Flux dispatches. Return type affects the end result, where
 * nullish -> nothing, falsy -> block, object -> modify
 */
export function intercept(cb: Intercept) {
    intercepts.push(cb);

    return () => {
        const idx = intercepts.indexOf(cb);
        if (idx !== -1) intercepts.splice(idx, 1);
    };
}
