import { after } from "@api/patcher";
import { findInReactTree } from "@lib/utils";
import { findByNameLazy, findByPropsLazy, findByStoreNameLazy } from "@metro";

import getTag, { BUILT_IN_TAGS } from "../lib/getTag";

const DisplayName = findByNameLazy("DisplayName", false);
const HeaderName = findByNameLazy("HeaderName", false);

const TagModule = findByPropsLazy("getBotLabel");
const getBotLabel = TagModule?.getBotLabel;

const GuildStore = findByStoreNameLazy("GuildStore");
const ChannelStore = findByStoreNameLazy("ChannelStore");

export default () => {
    const patches: any[] = [];

    if (HeaderName) {
        patches.push(after("default", HeaderName, ([{ channelId }]: any, ret: any) => {
            ret.props.channelId = channelId;
        }));
    }

    if (DisplayName) {
        patches.push(after("default", DisplayName, ([{ guildId, channelId, user }]: any, ret: any) => {
            const tagComponent = findInReactTree(ret, (c: any) => c?.type?.Types);
            const labelText = getBotLabel?.(tagComponent?.props?.type);
            if (!tagComponent || (labelText && !BUILT_IN_TAGS.includes(labelText))) {
                const guild = GuildStore?.getGuild?.(guildId);
                const channel = ChannelStore?.getChannel?.(channelId);
                const tag = getTag(guild, channel, user);

                if (tag) {
                    if (tagComponent) {
                        tagComponent.props = {
                            type: 0,
                            ...tag
                        };
                    } else {
                        const row = findInReactTree(ret, (c: any) => c?.props?.style?.flexDirection === "row");
                        if (row?.props?.children) {
                            row.props.children = [...row.props.children, 
                                <TagModule.default
                                    style={{ marginLeft: 0 }}
                                    type={0}
                                    text={tag.text}
                                    textColor={tag.textColor}
                                    backgroundColor={tag.backgroundColor}
                                    verified={tag.verified}
                                />
                            ];
                        }
                    }
                }
            }
        }));
    }

    return () => { for (const unpatch of patches) unpatch(); };
        patches.length = 0;
};
