import { definePlugin } from "@plugins";
import { findByPropsLazy, findByStoreNameLazy } from "@metro/wrappers";
import { showToast } from "@api/ui/toasts";
import { findAssetId } from "@api/assets";
import { registerCommand } from "@api/commands";
import { RainApplicationCommand } from "@api/commands/types";

const GuildStore = findByStoreNameLazy("GuildStore");
const UnreadStore = findByStoreNameLazy("UnreadStore");
const AckActionCreators = findByPropsLazy("ackGuild");

let unregister: (() => void) | undefined;

const readAllCommand = (): RainApplicationCommand => ({
    name: "readall",
    displayName: "readall",
    description: "Marks all servers as read.",
    displayDescription: "Marks all servers as read.",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    shouldHide: () => false,
    execute: async (args, ctx) => {
        try {
            if (!GuildStore.getGuilds || !AckActionCreators.ackGuild) {
                showToast("Failed to mark servers as read.", findAssetId("CircleXIcon-primary"));
                return;
            }

            const guilds = GuildStore.getGuilds();
            let count = 0;

            for (const guildId in guilds) {
                if (UnreadStore.hasUnread(guildId) || UnreadStore.getMentionCount(guildId) > 0) {
                    AckActionCreators.ackGuild(guildId);
                    count++;
                }
            }

            showToast(`Marked ${count} server(s) as read!`, findAssetId("CheckIcon"));
        } catch (error) {
            console.error("[ReadAllNotifications] Error:", error);
            showToast("Failed to mark all as read.", findAssetId("CircleXIcon-primary"));
        }
    },
});

export default definePlugin({
    name: "ReadAllNotifications",
    description: "Adds a /readall command to mark all servers and mentions as read.",
    author: [{ name: "DevilBro", id: "278543574059057154" }, { name: "Arena Bot", id: "0" }],
    id: "readallnotifications",
    version: "1.0.0",
    start() {
        unregister = registerCommand(readAllCommand());
    },
    stop() {
        unregister?.();
    }
});
