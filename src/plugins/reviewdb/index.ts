import { waitForHydration } from "@api/storage";
import { definePlugin } from "@plugins";
import { Contributors, Developers } from "@rain/Developers";

import { getAdmins } from "./lib/api";
import patchContextMenu from "./patches/patchContextMenu";
import patchProfile from "./patches/patchProfile";
import patchSegmentedProfile from "./patches/patchSegmentedProfile";
import patchServer from "./patches/patchServer";
import patchSimplifiedProfile from "./patches/patchSimplifiedProfile";
import Settings from "./Settings";
import { useReviewDBSettings } from "./storage";

const patches: (() => boolean)[] = [];
export const admins: string[] = [];

export default definePlugin({
    name: "ReviewDB",
    description: "Display and post reviews on user profiles.",
    author: [
        Developers.John,
        Contributors.maisy,
    ],
    id: "reviewdb",
    version: "1.0.0",
    async start() {
        // Hydration must complete before any settings read.
        await waitForHydration(useReviewDBSettings);

        // All find* calls inside these patch modules are lazy now,
        // so applying them at start is safe — the underlying modules
        // resolve when first touched, not when we install the hook.
        patches.push(patchContextMenu());
        patches.push(patchProfile());
        patches.push(patchSimplifiedProfile());
        patches.push(patchServer());
        patches.push(patchSegmentedProfile());

        getAdmins()
            .then(i => admins.push(...i))
            .catch(() => {});
    },
    stop() {
        for (const unpatch of patches) {
            try { unpatch(); } catch {}
        }
        patches.length = 0;
        admins.length = 0;
    },
    settings: Settings,
});
