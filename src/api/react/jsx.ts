import { after } from "@api/patcher";
import { findByPropsLazy } from "@metro";

type Callback = (Component: any, ret: any) => any;
const callbacks = new Map<string, Callback[]>();

const jsxRuntime = findByPropsLazy("jsx", "jsxs");

export function onJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) callbacks.set(Component, []);
    callbacks.get(Component)!.push(callback);
}

export function deleteJsxCreate(Component: string, callback: Callback) {
    if (!callbacks.has(Component)) return;
    const cbs = callbacks.get(Component)!;
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
    if (cbs.length === 0) callbacks.delete(Component);
}

/**
 * @internal
 */
export function patchJsx() {
    const callback = ([Component]: unknown[], ret: any) => {
        if (!ret || callbacks.size === 0) return ret;

        // Band-aid fix for iOS invalid element type crashes
        if (typeof ret.type === "undefined") {
            ret.type = "RCTView";
            return ret;
        }

        // Resolve the name to look up in the callbacks map
        let name: string | undefined;
        if (typeof Component === "function") {
            name = Component.name;
        } else if (typeof Component === "string") {
            name = Component;
        }

        if (name && callbacks.has(name)) {
            const cbs = callbacks.get(name)!;
            for (const cb of cbs) {
                const _ret = cb(Component, ret);
                if (_ret !== undefined) ret = _ret;
            }
            return ret;
        }
    };

    const patches = [
        after("jsx", jsxRuntime, callback),
        after("jsxs", jsxRuntime, callback)
    ];

    return () => patches.forEach(unpatch => unpatch());
}
