import { after, before } from "@api/patcher";
import { findInTree } from "@lib/utils";
import { proxyLazy } from "@lib/utils/lazy";
import { findByProps } from "@metro";

import { _colorRef } from "../updater";

const mmkvStorage = proxyLazy(() => {
    const newModule = findByProps("impl");
    if (typeof newModule?.impl === "object") {
        return newModule.impl;
    }
    return findByProps("storage");
});

// Pre-build a Set for O(1) key lookup instead of Set construction inline
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
            } catch {
                // ignore — malformed value
            }

            return [key, value];
        })
    ];

    return () => patches.forEach(p => p());
}
