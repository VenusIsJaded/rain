import { definePlugin } from "@plugins";
import { Developers } from "@rain/Developers";

import { loadAllEffectData } from "./patches/effects";
import { patchGetAllProfileEffects, patchGetProfileEffect, patchGetUserProfile } from "./patches/profile";
import Settings from "./settings";

export default definePlugin({
    name: "CustomEffects",
    description: "Custom profile effects",
    author: [Developers.SerStars],
    id: "customeffects",
    version: "2.1.0",

    async start() {
        await loadAllEffectData();

        this.unpatches = [
            patchGetUserProfile(),
            patchGetAllProfileEffects(),
            patchGetProfileEffect()
        ];
    },

    stop() {
        this.unpatches?.forEach(u => u());
    },
    settings: Settings
});
