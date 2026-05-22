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
        // 1. Safely extract the page node to bypass circular navigation fibers
        const page = 
            ret?.props?.children?.[0]?.props?.item?.page || 
            ret?.props?.item?.page;

        if (!page) return;

        // 2. Walk only the page props (clean tree, no circular fiber loops)
        const profileSections = findInReactTree(
            page.props || page,
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

        if (!profileSections) return;

        // 3. Extract userId robustly from the children elements
        const userId = 
            profileSections.find((c: any) => c?.props?.userId)?.props?.userId ||
            profileSections.find((c: any) => c?.props?.user?.id)?.props?.user?.id ||
            profileSections[profileSections.length - 1]?.props?.userId;

        if (!userId) return;
        if (profileSections.some((c: any) => c?.type === ReviewSection)) return;

        profileSections.push(React.createElement(ReviewSection, { userId }));
    });
};
