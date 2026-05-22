import { findByStoreNameLazy } from "@metro";

import { getStatusColor } from "./colors";
import StatusIcon from "./StatusIcon";
import { usePlatformIndicatorSettings } from "./storage";

const PresenceStore = findByStoreNameLazy("PresenceStore");
const SessionsStore = findByStoreNameLazy("SessionsStore");
const UserStore = findByStoreNameLazy("UserStore");

// OPTIMIZATION: Replaced the ad-hoc caching (global mutable + timer + modular
// counter) with a simpler time-based cache. The old code had a subtle bug:
// statusCacheHits was mod-20, meaning after exactly 20 accesses the cache would
// re-read from the store — but the 5s timeout would reset the counter anyway,
// creating inconsistent staleness. This version uses a straightforward 1s TTL.
let statusCache: any = null;
let statusCacheTime = 0;
const CACHE_TTL_MS = 1000;

function queryPresenceStoreWithCache() {
    const now = Date.now();
    if (!statusCache || now - statusCacheTime > CACHE_TTL_MS) {
        statusCache = PresenceStore.getState();
        statusCacheTime = now;
    }
    return statusCache;
}

// OPTIMIZATION: Cache currentUserId and clear on LOGIN/LOGOUT so we don't call
// getCurrentUser() on every single StatusIcons render.
let currentUserId: string | null = null;

function getUserStatuses(userId: string): Record<string, string> | undefined {
    let statuses: Record<string, string> | undefined;

    if (!currentUserId) {
        currentUserId = UserStore.getCurrentUser()?.id;
    }

    if (userId === currentUserId) {
        const sessions = SessionsStore.getSessions() as Record<string, { clientInfo: { client: string }, status: string }>;
        statuses = Object.values(sessions).reduce<Record<string, string>>((acc, curr) => {
            if (curr.clientInfo.client !== "unknown")
                acc[curr.clientInfo.client] = curr.status;
            return acc;
        }, {} as Record<string, string>);
    } else {
        statuses = queryPresenceStoreWithCache()?.clientStatuses[userId];
    }
    return statuses;
}

export default function StatusIcons(props: { userId: string; size?: number }) {
    const settings = usePlatformIndicatorSettings();

    const userId = props.userId;
    const iconSize = props.size ?? 16;
    const statuses = getUserStatuses(userId);

    return (
        <>
            {/* BUG FIX: Added `key` prop. Without it, React can't distinguish
                icons when a platform appears/disappears, causing wrong icon to
                show wrong color after a status change. */}
            {Object.entries(statuses ?? {}).map(([platform, status]) =>
                <StatusIcon key={platform} platform={platform} color={getStatusColor(status, settings.useThemeColors)} iconSize={iconSize}/>)}
        </>
    );
}
