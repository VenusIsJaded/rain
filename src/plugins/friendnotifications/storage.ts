import { createPluginStore } from "@api/storage";

export const { useStore: useFriendNotificationsSettings, settings: friendNotificationsSettings } =
    createPluginStore("friendnotifications", {
        notifyOnline: true,
        notifyOffline: true,
    });
