import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByNameLazy } from "@metro/wrappers";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

// Use the fallback name from the original code, as "UserProfile" likely doesn't exist anymore
const UserProfile = findByNameLazy("UserProfileContent", false);

export default () => {
    try {
        return after("type", UserProfile, (args, ret) => {
            const profileSections = findInReactTree(
                ret,
                r =>
                    r?.type?.displayName === "View" &&
                    r?.props?.children.findIndex(
                        (i: any) =>
                            i?.type?.name === "UserProfileBio" ||
                            i?.type?.name === "UserProfileAboutMeCard",
                    ) !== -1,
            )?.props?.children;

            let userId = args[0]?.userId;
            if (userId === undefined) userId = args[0]?.user?.id;

            profileSections?.push(React.createElement(ReviewSection, { userId }));
        });
    } catch (e) {
        logger.error("[ReviewDB] Failed to patch UserProfile (module might not exist in this Discord version):", e);
        return () => {};
    }
};
