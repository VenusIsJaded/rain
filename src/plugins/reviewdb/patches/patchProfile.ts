import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByNameLazy } from "@metro/wrappers";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// Use lazy finder to preserve startup speed optimizations
const UserProfile = findByNameLazy("UserProfile", false);

export default () => {
    if (!UserProfile) {
        console.error("[ReviewDB] Failed to find UserProfile module! The plugin will not inject.");
        return () => {};
    }

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
};
