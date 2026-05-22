import { after } from "@api/patcher";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// Circular-safe finder to locate elements without traversing heavy React internals
function findSafe(obj: any, filter: (o: any) => boolean, depth = 0): any {
    if (!obj || depth > 10) return;
    if (filter(obj)) return obj;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = findSafe(item, filter, depth + 1);
            if (res) return res;
        }
    } else if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            // Cut off heavy or circular properties
            if (["_owner", "_store", "theme", "style", "styles", "navigator"].includes(key)) continue;
            try {
                const res = findSafe(obj[key], filter, depth + 1);
                if (res) return res;
            } catch {}
        }
    }
}

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) return;

        const childrenArray = Array.isArray(children) ? children : [children];

        // Search through all of the tab page components
        for (const child of childrenArray) {
            const page = child?.props?.item?.page;
            if (!page) continue;

            // Search the page tree safely for the View containing the profile sections
            const profileSections = findSafe(
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

            if (profileSections) {
                // Extract the user ID directly from the children components
                const userId = 
                    profileSections.find((c: any) => c?.props?.userId)?.props?.userId ||
                    profileSections.find((c: any) => c?.props?.user?.id)?.props?.user?.id ||
                    profileSections[profileSections.length - 1]?.props?.userId;

                if (userId) {
                    if (profileSections.some((c: any) => c?.type === ReviewSection)) return;
                    
                    console.log(`[ReviewDB-Segmented] Successfully injected into page for user: ${userId}`);
                    profileSections.push(React.createElement(ReviewSection, { userId }));
                    break; // Successfully injected into the active tab page
                }
            }
        }
    });
};
