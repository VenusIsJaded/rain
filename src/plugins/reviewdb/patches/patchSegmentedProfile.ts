import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

const log = (...a: any[]) => { try { logger.log("[reviewdb/seg]", ...a); } catch {} };

const sectionFilter = (r: any) =>
    r?.type?.displayName === "View" &&
    Array.isArray(r?.props?.children) &&
    r.props.children.findIndex(
        (i: any) =>
            i?.type?.name === "UserProfileBio" ||
            i?.type?.name === "UserProfileAboutMeCard",
    ) !== -1;

// Walk a subtree and collect every userId-looking value we can find,
// tagged with where it came from.
function collectUserIds(node: any, out: Array<{ path: string; id: string }> = [], path = "$", depth = 0, seen = new Set()): typeof out {
    if (!node || depth > 14 || typeof node !== "object" || seen.has(node)) return out;
    seen.add(node);

    const p = node.props;
    if (p) {
        if (typeof p.userId === "string") out.push({ path: path + ".props.userId", id: p.userId });
        if (typeof p.user?.id === "string") out.push({ path: path + ".props.user.id", id: p.user.id });
        if (typeof p.userInfo?.id === "string") out.push({ path: path + ".props.userInfo.id", id: p.userInfo.id });
    }
    const name = node?.type?.name ?? node?.type?.displayName;
    const children = p?.children ?? node.children;
    if (children) {
        const arr = Array.isArray(children) ? children : [children];
        for (let i = 0; i < arr.length && out.length < 30; i++) {
            collectUserIds(arr[i], out, `${path}>${name ?? "?"}[${i}]`, depth + 1, seen);
        }
    }
    return out;
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

        for (let idx = 0; idx < childrenArray.length; idx++) {
            const page = childrenArray[idx]?.props?.item?.page;
            if (!page) continue;

            const sectionView = findInReactTree(page?.props?.children ?? page, sectionFilter);
            const profileSections = sectionView?.props?.children;
            if (!Array.isArray(profileSections)) continue;

            // ─── DIAGNOSTIC ───
            // Dump every userId found anywhere in this page's subtree, tagged
            // with the path. The OTHER user's id should appear somewhere.
            const allIds = collectUserIds(page);
            const uniqueIds = Array.from(new Set(allIds.map(x => x.id)));
            log("idx", idx, "uniqueIds=", JSON.stringify(uniqueIds));
            log("idx", idx, "id sources sample=", JSON.stringify(allIds.slice(0, 12)));
            // ──────────────────

            const userId = profileSections[profileSections.length - 1]?.props?.userId;
            if (!userId) continue;
            if (profileSections.some((c: any) => c?.type === ReviewSection)) continue;

            profileSections.push(React.createElement(ReviewSection, { userId }));
            log("idx", idx, "INJECTED userId=", userId);
        }
    });
};
