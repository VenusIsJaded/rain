// TEMPORARY PROBE — hooks React.createElement and logs every element
// whose props carry a userId / user.id that ISN'T the viewer's id.
// That instantly tells us which component renders other users' profiles
// on this Discord build.

import { React } from "@metro/common";
import { findByStoreName } from "@metro";
import { logger } from "@lib/utils/logger";

const log = (...a: any[]) => { try { logger.log("[reviewdb/probe3]", ...a); } catch {} };

const seenKeys = new Set<string>();

export default () => {
    const origCreateElement = React.createElement;
    let viewerId: string | undefined;

    try {
        const UserStore: any = findByStoreName("UserStore");
        viewerId = UserStore?.getCurrentUser?.()?.id;
    } catch {}
    log("probe3 installed; viewerId=", viewerId ?? "<unknown>");

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

    return () => {
        (React as any).createElement = origCreateElement;
        seenKeys.clear();
        log("probe3 uninstalled");
        return true;
    };
};
