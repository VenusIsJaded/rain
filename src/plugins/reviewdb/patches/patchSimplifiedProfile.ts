import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");

    if (!SimplifiedUserProfileContent) {
        console.log("[ReviewDB-Simplified] SimplifiedUserProfileContent module not found.");
        return () => false;
    }

    console.log("[ReviewDB-Simplified] SimplifiedUserProfileContent module successfully hooked!");

    return after("type", SimplifiedUserProfileContent, (args, ret) => {
        const userId = args[0]?.user?.id;
        console.log(`[ReviewDB-Simplified] Rendering simplified profile for user: ${userId}`);

        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children.findIndex(
                    (i: any) =>
                        i?.type?.name ===
                        "SimplifiedUserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        console.log(`[ReviewDB-Simplified] profileSections found: ${!!profileSections}`);

        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(
            React.createElement(ReviewSection, { userId }),
        );
    });
};
