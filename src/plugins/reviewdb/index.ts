import { before } from "@api/patcher";
import { findByPropsLazy } from "@metro";
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
        Contributors.maisy
    ],
    id: "reviewdb",
    version: "1.0.0",
    async start() {
        await waitForHydration(useReviewDBSettings);

        // Always patch the context menu since its target is ready at startup
        patches.push(patchContextMenu());

        // Defer profile and server patches until the lazy UserProfile action sheet is triggered
        const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
        let profilePatchesApplied = false;

        const unpatchLazy = before("openLazy", LazyActionSheet, (args) => {
            const [componentPromise, key] = args;
            if (typeof key === "string" && key.startsWith("UserProfile")) {
                if (profilePatchesApplied) return;
                profilePatchesApplied = true;

                if (componentPromise && typeof componentPromise.then === "function") {
                    componentPromise.then(() => {
                        // Defer slightly to ensure Metro registry is fully populated
                        setTimeout(() => {
                            patches.push(patchProfile());
                            patches.push(patchSimplifiedProfile());
                            patches.push(patchServer());
                            patches.push(patchSegmentedProfile());
                        }, 0);
                    });
                }
            }
        });
        patches.push(unpatchLazy);

        getAdmins()
            .then(i => admins.push(...i))
            .catch(() => {});
    },
    stop() {
        for (const unpatch of patches) unpatch();
        patches.length = 0;
        admins.length = 0;
    },
    settings: Settings,
});
