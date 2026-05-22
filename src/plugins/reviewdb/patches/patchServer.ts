import { instead } from "@api/patcher";
import { logger } from "@lib/utils/logger";
import { findByName } from "@metro";
import { React } from "@metro/common";

import ReviewCard from "../components/ReviewCard";

// BUG FIX — same class of failure as patchProfile.ts / patchSimplifiedProfile.ts:
// findByNameLazy's internal forceLoad() throws when the module isn't in the
// bundle, crashing the plugin startup. Use the synchronous (non-throwing)
// findByName and return a no-op unpatcher when the module is absent.
export default () => {
    const GuildActionSheetProgress = findByName("GuildActionSheetProgress", false);

    if (!GuildActionSheetProgress) {
        if (__DEV__) {
            console.warn(
                "[reviewdb/patchServer] GuildActionSheetProgress not found " +
                "in Metro — skipping server profile patch.",
            );
        }
        return () => false;
    }

    return instead("default", GuildActionSheetProgress, (args, ret) => {
        const guildId = args[0]?.guild?.id;
        return React.createElement(ReviewCard, { userId: guildId });
    });
};
