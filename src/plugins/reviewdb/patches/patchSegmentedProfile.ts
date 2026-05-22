import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

import ReviewSection from "../components/ReviewSection";

const log = (...a: any[]) => { try { logger.log("[reviewdb/segmented]", ...a); } catch {} };

// Collect every plausible userId we can find anywhere in a subtree.
function findUserIdDeep(node: any, depth = 0, seen = new Set()): string | undefined {
    if (!node || depth > 14 || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);

    const p = node.props;
    if (p) {
        if (typeof p.userId === "string") return p.userId;
        if (typeof p.user?.id === "string") return p.user.id;
        if (typeof p.userInfo?.id === "string") return p.userInfo.id;
        if (typeof p.userId?.toString === "function" && typeof p.userId === "number") return String(p.userId);
    }
    // Direct (non-React) userId on the node itself
    if (typeof (node as any).userId === "string") return (node as any).userId;
    if (typeof (node as any).user?.id === "string") return (node as any).user.id;

    const children = p?.children ?? (node as any).children;
    if (children) {
        const arr = Array.isArray(children) ? children : [children];
        for (const c of arr) {
            const r = findUserIdDeep(c, depth + 1, seen);
            if (r) return r;
        }
    }
}

// Dump up to N component type names found under a node — helps figure out
// what Discord is actually rendering on the broken profile.
function dumpTypeNames(node: any, out: string[] = [], depth = 0, seen = new Set()): string[] {
    if (!node || depth > 8 || typeof node !== "object" || seen.has(node) || out.length > 40) return out;
    seen.add(node);
    const n = node?.type?.name ?? node?.type?.displayName;
    if (typeof n === "string") out.push(n);
    const children = node?.props?.children ?? node?.children;
    if (children) {
        const arr = Array.isArray(children) ? children : [children];
        for (const c of arr) dumpTypeNames(c, out, depth + 1, seen);
    }
    return out;
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

    log("patch installed");

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) { log("FIRE: no ret.props.children"); return; }

        const outerArg = args?.[0];
        const outerUserId = findUserIdDeep(outerArg);
        const childrenArray = Array.isArray(children) ? children : [children];

        log("FIRE pages=", childrenArray.length,
            "outerUserId=", outerUserId,
            "args[0] keys=", outerArg ? Object.keys(outerArg).slice(0, 20) : null);

        let injected = false;

        for (let idx = 0; idx < childrenArray.length; idx++) {
            const child = childrenArray[idx];
            const page = child?.props?.item?.page;
            if (!page) {
                log("idx", idx, "no page; child.props keys=", Object.keys(child?.props ?? {}).slice(0, 10));
                continue;
            }

            const sectionView = findInReactTree(page?.props?.children ?? page, sectionFilter);
            const profileSections = sectionView?.props?.children;

            if (!Array.isArray(profileSections)) {
                // No section view on this page (likely Mutual Servers, etc.) — dump what's here.
                log("idx", idx, "no section view; types=", dumpTypeNames(page).slice(0, 20));
                continue;
            }

            const sectionTypeNames = profileSections.map(
                (c: any) => c?.type?.name ?? c?.type?.displayName ?? "?",
            );

            const userId =
                profileSections.find((c: any) => typeof c?.props?.userId === "string")?.props?.userId ||
                profileSections.find((c: any) => typeof c?.props?.user?.id === "string")?.props?.user?.id ||
                findUserIdDeep(page) ||
                outerUserId;

            if (!userId) {
                log("idx", idx, "found sections but NO userId; section types=", sectionTypeNames,
                    "page args/props sample=", Object.keys(page?.props ?? {}).slice(0, 10));
                continue;
            }

            if (profileSections.some((c: any) => c?.type === ReviewSection)) {
                log("idx", idx, "already injected for", userId);
                injected = true;
                continue;
            }

            profileSections.push(React.createElement(ReviewSection, { userId }));
            log("idx", idx, "INJECTED for", userId, "section types=", sectionTypeNames);
            injected = true;
        }

        if (!injected) log("hook finished — NOTHING injected");
    });
};
