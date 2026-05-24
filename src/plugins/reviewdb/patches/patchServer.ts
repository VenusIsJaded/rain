import { instead } from "@api/patcher";
import { logger } from "@lib/utils/logger";
import { findByNameLazy } from "@metro/wrappers";
import { React } from "@metro/common";

import ReviewCard from "../components/ReviewCard";

// Use lazy finder to preserve startup speed optimizations
const GuildActionSheetProgress = findByNameLazy("GuildActionSheetProgress", false);

export default () => {
    if (!GuildActionSheetProgress) {
        console.error("[ReviewDB] Failed to find GuildActionSheetProgress module! The server-profile patch will not inject.");
        return () => {};
    }

    return instead("default", GuildActionSheetProgress, (args, ret) => {
        const guildId = args[0]?.guild?.id;
        return React.createElement(ReviewCard, { userId: guildId });
    });
};
