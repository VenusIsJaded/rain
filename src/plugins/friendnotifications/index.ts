import { definePlugin } from "@plugins";
import { findByStoreNameLazy, findByNameLazy } from "@metro/wrappers";
import { FluxDispatcher, React } from "@metro/common";
import { showToast } from "@api/ui/toasts";
import { friendNotificationsSettings } from "./storage";
import Settings from "./settings";
import { logger } from "@lib/utils/logger";
import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";

const PresenceStore = findByStoreNameLazy("PresenceStore");
const RelationshipStore = findByStoreNameLazy("RelationshipStore");
const UserStore = findByStoreNameLazy("UserStore");
const ToastComponent = findByNameLazy("Toast", false);

let previousStatuses = new Map<string, string>();
let isFirstRun = true;
const patches: (() => void)[] = [];

function onPresenceUpdate(event: any) {
    try {
        if (!event || !Array.isArray(event.updates)) return;
        
        // Ignore the massive initial PRESENCE_UPDATES burst to prevent toast spam on launch
        if (isFirstRun) {
            if (event.updates.length > 50) return;
            isFirstRun = false;
        }
        
        for (const update of event.updates) {
            const userId = update.user?.id;
            if (!userId) continue;

            // Check if friend
            if (typeof RelationshipStore.isFriend !== "function" || !RelationshipStore.isFriend(userId)) continue;

            const newStatus = update.status;
            if (!newStatus) continue;

            const oldStatus = previousStatuses.get(userId) || "offline";

            if (oldStatus !== newStatus) {
                previousStatuses.set(userId, newStatus);
                
                const wasOffline = oldStatus === "offline" || oldStatus === "invisible";
                const isOffline = newStatus === "offline" || newStatus === "invisible";
                
                if (wasOffline && !isOffline && friendNotificationsSettings.notifyOnline) {
                    const user = UserStore.getUser?.(userId);
                    if (user) {
                        const avatar = { uri: typeof user.getAvatarURL === "function" ? user.getAvatarURL(false, 128, true) : undefined };
                        // Pass a special flag inside the source object so our patch knows to round it!
                        const sourceObj = { ...avatar, __friendAvatar: true };
                        showToast(`${user.globalName || user.username} is now online`, sourceObj as any);
                        setTimeout(() => showToast(`${user.globalName || user.username} is now online`, sourceObj as any), 3000);
                    }
                } else if (!wasOffline && isOffline && friendNotificationsSettings.notifyOffline) {
                    const user = UserStore.getUser?.(userId);
                    if (user) {
                        const avatar = { uri: typeof user.getAvatarURL === "function" ? user.getAvatarURL(false, 128, true) : undefined };
                        const sourceObj = { ...avatar, __friendAvatar: true };
                        showToast(`${user.globalName || user.username} went offline`, sourceObj as any);
                        setTimeout(() => showToast(`${user.globalName || user.username} went offline`, sourceObj as any), 3000);
                    }
                }
            }
        }
    } catch (e) {
        logger.error("[FriendNotifications] Crash prevented during presence update:", e);
    }
}

export default definePlugin({
    name: "FriendNotifications",
    description: "Shows a toast notification when a friend goes online or offline",
    author: [{ name: "DevilBro", id: "278543574059057154" }, { name: "Arena Bot", id: "0" }],
    id: "friendnotifications",
    version: "1.0.0",
    start() {
        previousStatuses.clear();
        isFirstRun = true;
        FluxDispatcher.subscribe("PRESENCE_UPDATES", onPresenceUpdate);

        // Patch the Toast component directly in React space so we can force border radius.
        patches.push(after("default", ToastComponent, (args, res) => {
            const props = args[0];
            // The toast's icon or source object might contain our __friendAvatar flag
            if (props?.toast?.icon?.__friendAvatar || props?.toast?.source?.__friendAvatar) {
                // Find the internal image component
                const img = findInReactTree(res, n => n?.type?.name === "Image" || n?.type?.displayName === "Image" || !!n?.props?.source?.uri);
                if (img?.props) {
                    if (Array.isArray(img.props.style)) {
                        img.props.style = [...img.props.style, { borderRadius: 100 }];
                    } else if (img.props.style) {
                        img.props.style = [img.props.style, { borderRadius: 100 }];
                    } else {
                        img.props.style = { borderRadius: 100 };
                    }
                }
            }
        }));
    },
    stop() {
        FluxDispatcher.unsubscribe("PRESENCE_UPDATES", onPresenceUpdate);
        previousStatuses.clear();
        for (const u of patches) u();
        patches.length = 0;
    },
    settings: Settings
});
