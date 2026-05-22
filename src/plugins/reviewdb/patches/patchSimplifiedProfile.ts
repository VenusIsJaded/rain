import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");

    if (!SimplifiedUserProfileContent) return () => false;

    return after("type", SimplifiedUserProfileContent, (args, ret) => {
        const userId = args[0]?.user?.id;

        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children?.findIndex(
                    (i: any) =>
                        typeof i?.type?.name === "string" &&
                        (i.type.name.startsWith("UserProfile") ||
                         i.type.name.startsWith("SimplifiedUserProfile") ||
                         i.type.name.includes("Bio") ||
                         i.type.name.includes("AboutMe") ||
                         i.type.name.includes("Connections"))
                ) !== -1,
        )?.props?.children;

        if (!userId || !profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(
            React.createElement(ReviewSection, { userId }),
        );
    });
};
