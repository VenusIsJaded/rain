import { definePlugin } from "@plugins";
import { Contributors } from "@rain/Developers";

import patchDownload from "./patches/download";
import { patchMessageCreate, patchMessageSuccess, patchMessageUpdate } from "./patches/messagePatches";
import patchVoiceMessages from "./patches/voiceMessages";
import Settings from "./settings";

const unpatches: Array<(() => void) | void> = [];

export default definePlugin({
    name: "Custom Voice Messages",
    description: "Allows sending any audio file as a voice message",
    author: [Contributors.Dziurwa, Contributors.siguma],
    id: "customVoiceMessages",
    version: "1.0.1",
    start() {
        unpatches.push(patchVoiceMessages());
        unpatches.push(patchMessageSuccess());
        unpatches.push(patchMessageCreate());
        unpatches.push(patchMessageUpdate());
        unpatches.push(patchDownload());
    },
    stop() {
        for (const unpatch of unpatches) {
            if (typeof unpatch === "function") {
                try { unpatch(); } catch {}
            }
        }
        unpatches.length = 0;
    },
    settings: Settings,
});
