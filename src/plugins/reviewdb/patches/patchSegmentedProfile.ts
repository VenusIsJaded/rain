import { after } from "@api/patcher";
import { findByFilePath } from "@metro";
import { React } from "@metro/common";

import ReviewSection from "../components/ReviewSection";

// Circular-safe finder. Returns the first node matching `filter`.
function findSafe(obj: any, filter: (o: any) => boolean, depth = 0): any {
    if (!obj || depth > 12) return;
    if (filter(obj)) return obj;

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = findSafe(item, filter, depth + 1);
            if (res) return res;
        }
    } else if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            if (["_owner", "_store", "theme", "style", "styles", "navigator", "stateNode", "return", "child", "sibling", "alternate"].includes(key)) continue;
            try {
                const res = findSafe(obj[key], filter, depth + 1);
                if (res) return res;
            } catch {}
        }
    }
}

// Walk a subtree and return the first userId-looking value we find on
// component props. Used as a fallback when no sibling section component
// exposes userId on its own props.
function findUserIdDeep(node: any, depth = 0): string | undefined {
    if (!node || depth > 12) return;
    if (typeof node !== "object") return;

    const p = node.props;
    if (p) {
        if (typeof p.userId === "string") return p.userId;
        if (typeof p.user?.id === "string") return p.user.id;
        if (typeof p.userInfo?.id === "string") return p.userInfo.id;
    }
    const children = node.props?.children ?? node.children;
    if (children) {
        const arr = Array.isArray(children) ? children : [children];
        for (const c of arr) {
            const r = findUserIdDeep(c, depth + 1);
            if (r) return r;
        }
    }
}

const isProfileSectionView = (r: any) =>
    r?.type?.displayName === "View" &&
    Array.isArray(r?.props?.children) &&
    r.props.children.some((i: any) => {
        const n = i?.type?.name;
        return typeof n === "string" && (
            n === "UserProfileBio" ||
            n === "UserProfileAboutMeCard" ||
            n === "SimplifiedUserProfileAboutMeCard" ||
            n.includes("AboutMe") ||
            n.includes("Bio") ||
            n.includes("Connections")
        );
    });

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) return;

        // Try to lift userId off the outer args first — frequently passed in
        // via the page items themselves.
        const outerUserId = findUserIdDeep(args?.[0]);

        const childrenArray = Array.isArray(children) ? children : [children];

        // Inject into EVERY matching page so position doesn't depend on
        // which tab Discord happens to put first.
        for (const child of childrenArray) {
            const page = child?.props?.item?.page;
            if (!page) continue;

            const sectionView = findSafe(page.props || page, isProfileSectionView);
            const profileSections = sectionView?.props?.children;
            if (!Array.isArray(profileSections)) continue;

            // Resolve userId: sibling props → deep walk of this page → outer args.
            const userId =
                profileSections.find((c: any) => typeof c?.props?.userId === "string")?.props?.userId ||
                profileSections.find((c: any) => typeof c?.props?.user?.id === "string")?.props?.user?.id ||
                findUserIdDeep(page) ||
                outerUserId;

            if (!userId) continue;
            if (profileSections.some((c: any) => c?.type === ReviewSection)) continue;

            profileSections.push(React.createElement(ReviewSection, { userId }));
        }
    });
};
