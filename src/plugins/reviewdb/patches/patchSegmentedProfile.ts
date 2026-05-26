import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const tryPatch = () => {
        const SegmentedControlPages = findByFilePath("design/components/SegmentedControl/native/SegmentedControlPages.native.tsx");
        
        if (SegmentedControlPages) {
            return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
                const profileSections = findInReactTree(
                    ret?.props?.children[0]?.props?.item?.page?.props?.children,
                    r =>
                        r?.type?.displayName === "View" &&
                        r?.props?.children.findIndex(
                            (i: any) =>
                                i?.type?.name === "UserProfileBio" ||
                                i?.type?.name === "UserProfileAboutMeCard"
                        ) !== -1,
                )?.props?.children;
                const userId = profileSections?.[profileSections?.length - 1]?.props?.userId;

                if (userId) {
                    profileSections?.push(React.createElement(ReviewSection, { userId }));
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
                if (!unpatch) logger.error("[ReviewDB] Failed to find SegmentedControlPages module after 10s!");
            }
        }, 500);
    }

    return () => {
        if (interval) clearInterval(interval);
        if (unpatch) unpatch();
    };
};
