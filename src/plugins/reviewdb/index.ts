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
export const admins: string[] = []; // BUG FIX: typed as string[] instead of any[]

export default definePlugin({
    name: "ReviewDB",
    description: "Display and post reviews on user profiles.",
    author: [
        Developers.John,
        Contributors.maisy
    ],
    id: "reviewdb",
    version: "1.0.0",
    async start() {
        // BUG FIX: await hydration instead of fire-and-forget so patches
        // that read settings don't race against storage loading.
        await waitForHydration(useReviewDBSettings);

        patches.push(patchProfile());
        patches.push(patchSimplifiedProfile());
        patches.push(patchServer());
        patches.push(patchContextMenu());
        patches.push(patchSegmentedProfile());

        // BUG FIX: Added catch so a network failure doesn't leave an
        // unhandled promise rejection.
        getAdmins()
            .then(i => admins.push(...i))
            .catch(() => {});
    },
    stop() {
        for (const unpatch of patches) unpatch();
        patches.length = 0;
        // BUG FIX: Clear admins on stop so a re-start doesn't duplicate entries.
        admins.length = 0;
    },
    settings: Settings,
});
