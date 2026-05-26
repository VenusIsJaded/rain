import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const tryPatch = () => {
        const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");
        
        if (SimplifiedUserProfileContent && typeof SimplifiedUserProfileContent.type === "function") {
            return after("type", SimplifiedUserProfileContent, (args, ret) => {
                const profileSections = findInReactTree(
                    ret,
                    r =>
                        r?.type?.displayName === "View" &&
                        r?.props?.children.findIndex(
                            (i: any) =>
                                i?.type?.name === "SimplifiedUserProfileAboutMeCard",
                        ) !== -1,
                )?.props?.children;

                const userId = args[0]?.user?.id;
                if (userId) {
                    profileSections?.push(
                        React.createElement(ReviewSection, { userId }),
                    );
                }
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
                if (!unpatch) logger.error("[ReviewDB] Failed to find SimplifiedUserProfileContent module after 10s!");
            }
        }, 500);
    }

    return () => {
        if (interval) clearInterval(interval);
        if (unpatch) unpatch();
    };
};
