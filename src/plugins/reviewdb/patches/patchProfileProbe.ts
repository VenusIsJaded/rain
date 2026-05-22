// TEMPORARY PROBE — hooks React.createElement and logs any element
// whose component name suggests it's part of a profile rendering path.
// Once we see what component renders OTHER users' profiles on this
// Discord build, we can target it with a real patch.

import { React } from "@metro/common";
import { logger } from "@lib/utils/logger";

const log = (...a: any[]) => { try { logger.log("[reviewdb/probe2]", ...a); } catch {} };

const INTERESTING = /Profile|Simplified|Popout|Popover|UserSheet|ProfileSheet|ProfileModal|UserModal/;

// Throttle so we don't drown Debug Logs.
const seen = new Set<string>();
const seenIds = new Set<string>();
let lastFlush = 0;

export default () => {
    const origCreateElement = React.createElement;
    let installed = true;

    (React as any).createElement = function (type: any, props: any, ...children: any[]) {
        try {
            const name = typeof type === "string"
                ? null
                : (type?.name ?? type?.displayName ?? type?.type?.name);

            if (name && INTERESTING.test(name)) {
                // Log unique component names once
                if (!seen.has(name)) {
                    seen.add(name);
                    log("first-seen component:", name);
                }

                // Log unique (name, userId) pairs so we can correlate names with
                // who's profile is being viewed.
                const uid = props?.userId ?? props?.user?.id;
                if (uid) {
                    const key = name + ":" + uid;
                    if (!seenIds.has(key)) {
                        seenIds.add(key);
                        log("component+userId:", name, "userId=", uid);
                    }
                }
            }
        } catch {}
        return origCreateElement.apply(this, [type, props, ...children]);
    };

    log("probe2 installed (createElement hook)");

    return () => {
        if (!installed) return false;
        installed = false;
        (React as any).createElement = origCreateElement;
        seen.clear();
        seenIds.clear();
        log("probe2 uninstalled");
        return true;
    };
};
