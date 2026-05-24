import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const tryPatch = () => {
        let UserProfile = findByTypeName("UserProfile");
        if (UserProfile === undefined) UserProfile = findByTypeName("UserProfileContent");
        
        // Ensure we found it AND it actually has a .type function to patch
        if (UserProfile && typeof UserProfile.type === "function") {
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
                if (!unpatch) logger.error("[ReviewDB] Failed to find UserProfile module after 10s!");
            }
        }, 500);
    }

    return () => {
        if (interval) clearInterval(interval);
        if (unpatch) unpatch();
    };
};
