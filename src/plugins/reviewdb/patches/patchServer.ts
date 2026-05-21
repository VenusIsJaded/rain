import { instead } from "@api/patcher";
import { logger } from "@lib/utils/logger";
import { findByNameLazy } from "@metro";
import { React } from "@metro/common";

import ReviewCard from "../components/ReviewCard";

const GuildActionSheetProgress = findByNameLazy("GuildActionSheetProgress", false);

export default () =>
    instead("default", GuildActionSheetProgress, (args, ret) => {
        const guildId = args[0]?.guild?.id;
        return React.createElement(ReviewCard, { userId: guildId });
    });
