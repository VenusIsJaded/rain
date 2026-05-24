import { instead } from "@api/patcher";
import { logger } from "@lib/utils/logger";
import { findByNameLazy } from "@metro/wrappers";
import { React } from "@metro/common";

import ReviewCard from "../components/ReviewCard";

// "GuildActionSheetProgress" was likely renamed to "GuildActionSheet" in recent updates
const GuildActionSheet = findByNameLazy("GuildActionSheet", false);

export default () => {
    try {
        return instead("default", GuildActionSheet, (args, ret) => {
            const guildId = args[0]?.guild?.id;
            return React.createElement(ReviewCard, { userId: guildId });
        });
    } catch (e) {
        logger.error("[ReviewDB] Failed to patch GuildActionSheet (module might not exist):", e);
        return () => {};
    }
};
