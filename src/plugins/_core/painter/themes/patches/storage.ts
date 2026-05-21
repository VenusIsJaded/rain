import { after, before } from "@api/patcher";
import { findInTree } from "@lib/utils";
import { proxyLazy } from "@lib/utils/lazy";
import { findByProps } from "@metro";

import { _colorRef } from "../updater";

const mmkvStorage = proxyLazy(() => {
    const newModule = findByProps("impl");
    if (typeof newModule?.impl === "object") {
        // Safe-wrap the C++ MMKV module and return it directly without mutating newModule
        return newModule.impl;
    }
    return findByProps("storage");
});

// Hoisted — avoids re-creating the Set on every patchStorage() call
const PATCHED_KEYS = new Set(["ThemeStore", "SelectivelySyncedUserSettingsStore"]);
const RAIN_THEME_PREFIX = "rain-theme-";

export default function patchStorage() {

    const patches = [
        after("get", mmkvStorage, ([key], ret) => {
            if (!_colorRef.current || !PATCHED_KEYS.has(key)) return;

            const state = findInTree(ret._state, s => typeof s.theme === "string");
            if (state) state.theme = _colorRef.key;
        }),
        before("set", mmkvStorage, ([key, value]) => {
            if (!PATCHED_KEYS.has(key) || !value) return;

            try {
                if (value._state?.theme?.startsWith(RAIN_THEME_PREFIX)) {
                    value._state.theme = _colorRef.lastSetDiscordTheme || "darker";
                }
            } catch {}

            return [key, value];
        })
    ];

    return () => { for (const p of patches) p(); };
        patches.length = 0;
}
