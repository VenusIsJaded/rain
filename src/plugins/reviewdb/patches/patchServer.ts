import { instead } from "@api/patcher";
import { findByName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewCard from "../components/ReviewCard";

export default () => {
    const tryPatch = () => {
        let GuildSheet = findByName("GuildActionSheetProgress", false);
        if (!GuildSheet) GuildSheet = findByName("GuildActionSheet", false);
        
        if (GuildSheet) {
            return instead("default", GuildSheet, (args, ret) => {
                const guildId = args[0]?.guild?.id;
                return React.createElement(ReviewCard, { userId: guildId });
            });
        }
        return null;
    };

    let unpatch = tryPatch();
    let interval: any = null;

    if (!unpatch) {
        let attempts = 0;
        interval = setInterval(() => {
            unpatch = tryPatch();
            attempts++;
            if (unpatch || attempts > 20) {
                clearInterval(interval);
                if (!unpatch) logger.error("[ReviewDB] Failed to find GuildActionSheet module after 10s!");
            }
        }, 500);
    }

    return () => {
        if (interval) clearInterval(interval);
        if (unpatch) unpatch();
    };
};
