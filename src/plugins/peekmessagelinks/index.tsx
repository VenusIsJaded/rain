import { definePlugin } from "@plugins";
import { instead } from "@api/patcher";
import { findByPropsLazy, findByStoreNameLazy } from "@metro/wrappers";
import { showToast } from "@api/ui/toasts";
import safeFetch from "@lib/utils/safeFetch";
import { React, ReactNative } from "@metro/common";
import { ActionSheet, BottomSheetTitleHeader, Button } from "@metro/common/components";
import { findAssetId } from "@api/assets";
import { lazyDestructure } from "@lib/utils/lazy";
import { showSheet, hideSheet } from "@api/ui/sheets";

const jumpModule = findByPropsLazy("jumpToMessage");
const MessageStore = findByStoreNameLazy("MessageStore");
const tokenModule = findByPropsLazy("getToken");
const { TextStyleSheet, Text } = lazyDestructure(() => findByPropsLazy("TextStyleSheet"));
const { View, ScrollView } = ReactNative;

const patches: (() => void)[] = [];

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
    description: "Intercepts message jumps (links, replies, pins) to show a preview bottom sheet first.",
    author: [{ name: "Arena Bot", id: "0" }],
    id: "peekmessagelinks",
    version: "1.0.0",
    start() {
        patches.push(instead("jumpToMessage", jumpModule, (args, orig) => {
            const opts = args[0];
            if (opts && opts.channelId && opts.messageId) {
                if (opts.__peek_bypass) {
                    delete opts.__peek_bypass;
                    return orig(...args);
                }
                
                fetchMessage(opts.channelId, opts.messageId).then(message => {
                    if (!message) {
                        showToast("Message could not be fetched", findAssetId("CircleXIcon-primary"));
                        orig(...args);
                        return;
                    }
                    showSheet("PeekMessageSheet", () => <PeekSheet message={message} onJump={() => orig({ ...opts, __peek_bypass: true })} />);
                });
                return;
            }
            return orig(...args);
        }));
    },
    stop() {
        for (const u of patches) u();
        patches.length = 0;
    }
});
