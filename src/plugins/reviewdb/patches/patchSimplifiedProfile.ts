import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByTypeName } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const SimplifiedUserProfileContent = findByTypeName("SimplifiedUserProfileContent");

    if (!SimplifiedUserProfileContent) return () => false;

    return after("type", SimplifiedUserProfileContent, (args, ret) => {
        const profileSections = findInReactTree(
            ret,
            r =>
                r?.type?.displayName === "View" &&
                r?.props?.children?.findIndex(
                    (i: any) =>
                        i?.type?.name === "SimplifiedUserProfileAboutMeCard",
                ) !== -1,
        )?.props?.children;

        if (!Array.isArray(profileSections)) return;

        const userId = args[0]?.user?.id;
        if (!userId) return;

        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
