import { after } from "@api/patcher";
import { findByPropsLazy } from "@metro";

type Callback = (Component: any, ret: any) => any;
const callbacks = new Map<string, Callback[]>();

const jsxRuntime = findByPropsLazy("jsx", "jsxs");

export function onJsxCreate(Component: string, callback: Callback) {
    let cbs = callbacks.get(Component);
    if (!cbs) callbacks.set(Component, (cbs = []));
    cbs.push(callback);
}

export function deleteJsxCreate(Component: string, callback: Callback) {
    const cbs = callbacks.get(Component);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
    if (cbs.length === 0) callbacks.delete(Component);
}

/** @internal */
export function patchJsx() {
    const callback = ([Component]: unknown[], ret: any) => {
        if (!ret || callbacks.size === 0) return ret;

        if (typeof ret.type === "undefined") {
            ret.type = "RCTView";
            return ret;
        }

        let name: string | undefined;
        if (typeof Component === "function") {
            name = (Component as Function).name;
        } else if (typeof Component === "string") {
            name = Component;
        }

        if (name) {
            const cbs = callbacks.get(name);
            if (cbs) {
                const len = cbs.length;
                for (let i = 0; i < len; i++) {
                    const _ret = cbs[i](Component, ret);
                    if (_ret !== undefined) ret = _ret;
                }
                return ret;
            }
        }
    };

    const patches = [
        after("jsx", jsxRuntime, callback),
        after("jsxs", jsxRuntime, callback),
    ];

    return () => patches.forEach(unpatch => unpatch());
}
