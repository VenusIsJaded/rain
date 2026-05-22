import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const UserProfile =
        findByTypeName("UserProfile") ??
        findByTypeName("UserProfileContent");

    if (!UserProfile) {
        console.log("[ReviewDB-Profile] UserProfile module not found.");
        return () => false;
    }

    console.log("[ReviewDB-Profile] UserProfile module successfully hooked!");

    return after("type", UserProfile, (args, ret) => {
        let userId = args[0]?.userId;
        if (userId === undefined) userId = args[0]?.user?.id;
        
        console.log(`[ReviewDB-Profile] Rendering profile for user: ${userId}`);

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

        console.log(`[ReviewDB-Profile] profileSections found: ${!!profileSections}`);

        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
