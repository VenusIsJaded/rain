import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

// DIAGNOSTIC: throttle so we don't spam the log on every render.
let lastLogAt = 0;
const dlog = (...a: any[]) => {
    const now = Date.now();
    if (now - lastLogAt < 200) return;
    lastLogAt = now;
    try { logger.log("[reviewdb/segmented]", ...a); } catch {}
};

function findUserIdDeep(node: any, depth = 0): string | undefined {
    if (!node || depth > 12 || typeof node !== "object") return;
    const p = node.props;
    if (p) {
        if (typeof p.userId === "string") return p.userId;
        if (typeof p.user?.id === "string") return p.user.id;
        if (typeof p.userInfo?.id === "string") return p.userInfo.id;
    }
    const children = p?.children ?? node.children;
    if (children) {
        const arr = Array.isArray(children) ? children : [children];
        for (const c of arr) {
            const r = findUserIdDeep(c, depth + 1);
            if (r) return r;
        }
    }
}

const sectionFilter = (r: any) => {
    if (r?.type?.displayName !== "View") return false;
    const c = r?.props?.children;
    if (!Array.isArray(c)) return false;
    return c.some((i: any) => {
        const n = i?.type?.name;
        return n === "UserProfileBio"
            || n === "UserProfileAboutMeCard"
            || n === "SimplifiedUserProfileAboutMeCard"
            || (typeof n === "string" && (n.includes("AboutMe") || n.includes("Bio")));
    });
};

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) {
        logger.warn("[reviewdb/segmented] SegmentedControlPages not found — patch skipped.");
        return () => false;
    }

    logger.log("[reviewdb/segmented] patch installed");

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) { dlog("no ret.props.children"); return; }

        const outerUserId = findUserIdDeep(args?.[0]);
        const childrenArray = Array.isArray(children) ? children : [children];
        dlog("hook fired; pages=", childrenArray.length, "outerUserId=", outerUserId);

        let injected = false;

        for (let idx = 0; idx < childrenArray.length; idx++) {
            const child = childrenArray[idx];
            const page = child?.props?.item?.page;
            if (!page) { dlog("page missing on idx", idx); continue; }

            // Use findInReactTree on page.props.children — same root the official uses.
            const sectionView = findInReactTree(page?.props?.children ?? page, sectionFilter);
            const profileSections = sectionView?.props?.children;
            if (!Array.isArray(profileSections)) {
                dlog("idx", idx, "no section view (page keys:", Object.keys(page?.props ?? {}), ")");
                continue;
            }

            const userId =
                profileSections.find((c: any) => typeof c?.props?.userId === "string")?.props?.userId ||
                profileSections.find((c: any) => typeof c?.props?.user?.id === "string")?.props?.user?.id ||
                findUserIdDeep(page) ||
                outerUserId;

            if (!userId) {
                dlog("idx", idx, "found sections but no userId; section types=",
                    profileSections.map((c: any) => c?.type?.name ?? c?.type?.displayName));
                continue;
            }

            if (profileSections.some((c: any) => c?.type === ReviewSection)) {
                dlog("idx", idx, "already injected for", userId);
                injected = true;
                continue;
            }

            profileSections.push(React.createElement(ReviewSection, { userId }));
            dlog("idx", idx, "INJECTED for", userId);
            injected = true;
        }

        if (!injected) dlog("hook fired but no page matched");
    });
};
