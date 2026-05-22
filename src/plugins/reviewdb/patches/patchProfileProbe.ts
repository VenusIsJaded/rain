// TEMPORARY PROBE — combination of two hooks:
//
// 1) React.createElement hook (probe3): logs once per unique
//    (componentName, userId) pair where userId is NOT the viewer's id.
//    This catches whatever component eventually renders other users'
//    profiles, regardless of name.
//
// 2) before("showUserProfileActionSheet", ...): Discord mobile opens a
//    user's profile sheet via this internal function (confirmed in Bunny
//    source). Hooking it gives us the userId at the EXACT moment a
//    profile opens, even if the downstream component is some name we
//    didn't anticipate.

import { before } from "@api/patcher";
import { React } from "@metro/common";
import { findByName, findByStoreName } from "@metro";
import { logger } from "@lib/utils/logger";

const log = (...a: any[]) => { try { logger.log("[reviewdb/probe3]", ...a); } catch {} };

const seenKeys = new Set<string>();

export default () => {
    const unpatches: (() => boolean)[] = [];

    // ─── Resolve viewer's own id once ───
    let viewerId: string | undefined;
    try {
        const UserStore: any = findByStoreName("UserStore");
        viewerId = UserStore?.getCurrentUser?.()?.id;
    } catch {}
    log("probe3 installed; viewerId=", viewerId ?? "<unknown>");

    // ─── Hook 1: showUserProfileActionSheet ───
    try {
        const sUPAS = findByName("showUserProfileActionSheet", false);
        if (sUPAS) {
            log("found showUserProfileActionSheet — installing before-hook");
            unpatches.push(before("default", sUPAS, (args: any[]) => {
                const arg = args?.[0];
                const uid = arg?.userId ?? arg?.user?.id;
                log("showUserProfileActionSheet called; userId=", uid,
                    "argKeys=", arg ? Object.keys(arg).slice(0, 10) : null);
            }));
        } else {
            log("showUserProfileActionSheet NOT found in this build");
        }
    } catch (e) { log("showUserProfileActionSheet hook failed", String(e)); }

    // ─── Hook 2: React.createElement ───
    const origCreateElement = React.createElement;
    (React as any).createElement = function (type: any, props: any, ...children: any[]) {
        try {
            if (props && typeof props === "object") {
                const uid =
                    (typeof props.userId === "string" && props.userId) ||
                    (typeof props.user?.id === "string" && props.user.id) ||
                    null;
                if (uid && uid !== viewerId) {
                    const name =
                        typeof type === "string"
                            ? type
                            : (type?.name ?? type?.displayName ?? type?.type?.name ?? "?");
                    const key = name + ":" + uid;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        log("NON-VIEWER userId on:", name, "userId=", uid,
                            "propKeys=", Object.keys(props).slice(0, 10));
                    }
                }
            }
        } catch {}
        return origCreateElement.apply(this, [type, props, ...children]);
    };
    unpatches.push(() => {
        (React as any).createElement = origCreateElement;
        return true;
    });

    return () => {
        for (const u of unpatches) try { u(); } catch {}
        seenKeys.clear();
        log("probe3 uninstalled");
        return true;
    };
};
