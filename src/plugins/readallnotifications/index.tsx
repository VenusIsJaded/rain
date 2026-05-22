import { definePlugin } from "@plugins";
import { findByPropsLazy, findByStoreNameLazy, findByNameLazy } from "@metro/wrappers";
import { showToast } from "@api/ui/toasts";
import { findAssetId } from "@api/assets";
import { registerCommand } from "@api/commands";
import { RainApplicationCommand } from "@api/commands/types";
import { readAllSettings } from "./storage";
import Settings from "./settings";
import { before, after } from "@api/patcher";
import { React } from "@metro/common";
import { lazyDestructure } from "@lib/utils/lazy";
import { findInReactTree } from "@lib/utils";

const GuildStore = findByStoreNameLazy("GuildStore");
const UnreadStore = findByStoreNameLazy("UnreadStore");
const AckActionCreators = findByPropsLazy("ackGuild");
const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
const { FormIcon } = lazyDestructure(() => findByPropsLazy("FormRow"));
const { hideActionSheet } = lazyDestructure(() => findByPropsLazy("openLazy", "hideActionSheet"));

const patches: (() => void)[] = [];
let unregister: (() => void) | undefined;

function markAllRead() {
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
}

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
        markAllRead();
    },
});

export default definePlugin({
    name: "ReadAllNotifications",
    description: "Adds a /readall command and UI buttons to mark all servers and mentions as read.",
    author: [{ name: "DevilBro", id: "278543574059057154" }, { name: "Arena Bot", id: "0" }],
    id: "readallnotifications",
    version: "1.0.0",
    start() {
        if (readAllSettings.showAsCommand) {
            unregister = registerCommand(readAllCommand());
        }

        patches.push(before("openLazy", LazyActionSheet, ([component, key, msg]) => {
            if (!readAllSettings.showInActionSheet) return;
            
            if (typeof key === "string" && (key.includes("Guild") || key.includes("Channel"))) {
                component.then((instance: any) => {
                    const unpatch = after("default", instance, (_, comp) => {
                        React.useEffect(() => () => unpatch(), []);
                        
                        const actionSheetContainer = findInReactTree(
                            comp,
                            x => Array.isArray(x) && x[0]?.type?.name === "ActionSheetRowGroup",
                        );

                        if (actionSheetContainer && actionSheetContainer[1]) {
                            const middleGroup = actionSheetContainer[1];
                            const ActionSheetRow = middleGroup.props.children?.[0]?.type;
                            if (!ActionSheetRow) return;
                            
                            // Don't add duplicate buttons
                            if (middleGroup.props.children.some((c: any) => c?.props?.label === "Read All Notifications")) return;

                            const readAllBtn = (
                                <ActionSheetRow
                                    label="Read All Notifications"
                                    icon={{
                                        $$typeof: middleGroup.props.children[0].props.icon.$$typeof,
                                        type: middleGroup.props.children[0].props.icon.type,
                                        key: null,
                                        ref: null,
                                        props: {
                                            IconComponent: () => (
                                                <FormIcon
                                                    style={{ opacity: 1 }}
                                                    source={findAssetId("CheckmarkIcon") || findAssetId("CheckIcon")}
                                                />
                                            ),
                                        },
                                    }}
                                    onPress={() => {
                                        hideActionSheet();
                                        markAllRead();
                                    }}
                                    key="read-all-notifications"
                                />
                            );
                            
                            middleGroup.props.children = middleGroup.props.children ? [...middleGroup.props.children, readAllBtn] : [readAllBtn];
                        }
                    });
                });
            }
        }));
    },
    stop() {
        unregister?.();
        for (const u of patches) u();
        patches.length = 0;
    },
    settings: Settings
});
