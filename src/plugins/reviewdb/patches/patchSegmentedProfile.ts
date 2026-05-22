import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const profileSections = findInReactTree(
            ret?.props?.children[0]?.props?.item?.page?.props?.children,
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

        const userId = profileSections?.[profileSections.length - 1]?.props?.userId;

        if (!profileSections) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;
        if (!userId) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
