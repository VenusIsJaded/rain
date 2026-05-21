import { definePlugin } from "@plugins";
import { findByStoreNameLazy } from "@metro/wrappers";
import { FluxDispatcher } from "@metro/common";
import { showToast } from "@api/ui/toasts";
import { findAssetId } from "@api/assets";
import { friendNotificationsSettings } from "./storage";
import Settings from "./settings";

const PresenceStore = findByStoreNameLazy("PresenceStore");
const RelationshipStore = findByStoreNameLazy("RelationshipStore");
const UserStore = findByStoreNameLazy("UserStore");

let previousStatuses = new Map<string, string>();
let isFirstRun = true;

function onPresenceUpdate(event: any) {
    if (!event || !event.updates) return;
    
    // Ignore the massive initial PRESENCE_UPDATES burst to prevent toast spam on launch
    if (isFirstRun) {
        if (event.updates.length > 50) return;
        isFirstRun = false;
    }
    
    for (const update of event.updates) {
        const userId = update.user?.id;
        if (!userId) continue;

        // Check if friend
        if (!RelationshipStore.isFriend(userId)) continue;

        const newStatus = update.status;
        const oldStatus = previousStatuses.get(userId) || "offline";

        if (oldStatus !== newStatus) {
            previousStatuses.set(userId, newStatus);
            
            const wasOffline = oldStatus === "offline" || oldStatus === "invisible";
            const isOffline = newStatus === "offline" || newStatus === "invisible";
            
            if (wasOffline && !isOffline && friendNotificationsSettings.notifyOnline) {
                const user = UserStore.getUser(userId);
                if (user) {
                    showToast(`${user.globalName || user.username} is now online`, findAssetId("CheckIcon"));
                }
            } else if (!wasOffline && isOffline && friendNotificationsSettings.notifyOffline) {
                const user = UserStore.getUser(userId);
                if (user) {
                    showToast(`${user.globalName || user.username} went offline`, findAssetId("EyeSlashIcon"));
                }
            }
        }
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
    },
    stop() {
        FluxDispatcher.unsubscribe("PRESENCE_UPDATES", onPresenceUpdate);
        previousStatuses.clear();
    },
    settings: Settings
});
