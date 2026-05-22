import { definePlugin } from "@plugins";
import { instead } from "@api/patcher";
import { findByFilePathLazy, findByStoreNameLazy, findByPropsLazy } from "@metro/wrappers";
import { showToast } from "@api/ui/toasts";
import safeFetch from "@lib/utils/safeFetch";
import { React, ReactNative } from "@metro/common";
import { ActionSheet, BottomSheetTitleHeader, Button } from "@metro/common/components";
import { findAssetId } from "@api/assets";
import { lazyDestructure } from "@lib/utils/lazy";
import { showSheet, hideSheet } from "@api/ui/sheets";

// This is the ACTUAL internal module Discord uses to route message links.
const handleContentLinkingModule = findByFilePathLazy("modules/links/native/handleContentLinking.tsx");
const MessageStore = findByStoreNameLazy("MessageStore");
const tokenModule = findByPropsLazy("getToken");
const { TextStyleSheet, Text } = lazyDestructure(() => findByPropsLazy("TextStyleSheet"));
const { View, ScrollView } = ReactNative;

const patches: (() => void)[] = [];
const MESSAGE_LINK_REGEX = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+|@me)\/(\d+)\/(\d+)$/;

function PeekSheet({ message, onJump }: { message: any, onJump: () => void }) {
    const author = message.author;
    
    return (
        <ActionSheet>
            <BottomSheetTitleHeader title="Peek Message" onClose={() => hideSheet("PeekMessageSheet")} />
            <ScrollView style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Text style={[TextStyleSheet["text-md/bold"], { color: "white" }]}>
                        {author?.globalName || author?.username || "Unknown User"}
                    </Text>
                    <Text style={[TextStyleSheet["text-sm/normal"], { color: "gray", marginLeft: 8 }]}>
                        {new Date(message.timestamp).toLocaleString()}
                    </Text>
                </View>
                <View style={{ backgroundColor: "rgba(255, 255, 255, 0.1)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <Text style={[TextStyleSheet["text-md/normal"], { color: "white" }]}>
                        {message.content || "*No text content*"}
                    </Text>
                </View>
                <Button 
                    text="Jump to Message" 
                    icon={findAssetId("ArrowRightIcon")}
                    onPress={() => {
                        hideSheet("PeekMessageSheet");
                        onJump();
                    }} 
                />
            </ScrollView>
        </ActionSheet>
    );
}

async function fetchMessage(channelId: string, messageId: string) {
    const cached = MessageStore.getMessage?.(channelId, messageId);
    if (cached) return cached;

    try {
        const token = tokenModule.getToken?.();
        if (!token) return null;

        const res = await safeFetch(`https://discord.com/api/v9/channels/${channelId}/messages?around=${messageId}&limit=1`, {
            headers: {
                "Authorization": token
            }
        });
        
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.length > 0) return data[0];
    } catch (e) {
        console.error(e);
    }
    return null;
}

export default definePlugin({
    name: "PeekMessageLinks",
    description: "Intercepts message links to show a preview instead of jumping immediately.",
    author: [{ name: "Arena Bot", id: "0" }],
    id: "peekmessagelinks",
    version: "1.0.0",
    start() {
        patches.push(instead("default", handleContentLinkingModule, (args, orig) => {
            const urlOpts = args[0];
            const urlStr = typeof urlOpts === "string" ? urlOpts : urlOpts?.path || urlOpts?.url || urlOpts?.link;
            
            if (typeof urlStr === "string") {
                const match = urlStr.match(MESSAGE_LINK_REGEX);
                if (match) {
                    const [_, guildId, channelId, messageId] = match;
                    
                    fetchMessage(channelId, messageId).then(message => {
                        if (!message) {
                            showToast("Message could not be fetched", findAssetId("CircleXIcon-primary"));
                            orig(...args);
                            return;
                        }
                        showSheet("PeekMessageSheet", () => <PeekSheet message={message} onJump={() => orig(...args)} />);
                    });
                    return; // Prevent normal execution until jump is clicked
                }
            }
            return orig(...args);
        }));
    },
    stop() {
        for (const u of patches) u();
        patches.length = 0;
    }
});
