import { before, instead } from "@api/patcher";
import { logger } from "@lib/utils/logger";
import { findByPropsLazy, findByStoreNameLazy } from "@metro";

import { fakenitroSettings } from "../storage";
import { buildStickerURL, modifyIfNeeded } from "../utils";

const messageModule = findByPropsLazy("sendMessage", "receiveMessage");
const uploadModule = findByPropsLazy("uploadLocalFiles");
const { getCurrentUser } = findByStoreNameLazy("UserStore");
const { getStickerById } = findByStoreNameLazy("StickersStore");
const ChannelStore = findByStoreNameLazy("ChannelStore");

export default function getPatches() {
    const patches = [
        before("sendMessage", messageModule, args => {
            const userPremiumType = getCurrentUser?.()?.premiumType;
            if (userPremiumType !== 2) modifyIfNeeded(args[1]);
        }),

        // inspired by https://github.com/aliernfrog/vd-plugins/blob/3ee3eac528cd2ef7222d444516d4b4c3e80b6c6f/plugins/FreeStickers/src/patches/message.ts
        instead("sendStickers", messageModule, (args, origFunc) => {
            // dont care if we got nitro (premiumType 2 is full Nitro)
            if (getCurrentUser?.()?.premiumType === 2) return origFunc(...args);
            const sticker = getStickerById(args[1]);
            logger.log(sticker);
            // dont care if its a discord sticker
            if (!sticker || sticker.format_type === 3 || sticker.pack_id !== undefined) return origFunc(...args);
            const channel = ChannelStore.getChannel(args[0])?.guild_id;
            // dont care if its a server sticker
            if (channel === sticker.guild_id) return origFunc(...args);
            const stickerName = sticker.name ?? "FakeNitroSticker";
            let stickerURL = buildStickerURL(sticker);
            if (stickerName) stickerURL = fakenitroSettings.stickerHyperLink ? `[${stickerName}](${stickerURL})` : stickerURL;
            messageModule.sendMessage(args[0], { content: stickerURL }, null, args[3]);
        }),
    ];

    let hasUploadModule = false;
    try {
        hasUploadModule = uploadModule?.uploadLocalFiles !== undefined;
    } catch (e) {}

    if (hasUploadModule) {
        patches.push(
            before("uploadLocalFiles", uploadModule, args => {
                if (getCurrentUser?.()?.premiumType !== 2)
                    modifyIfNeeded(args[0].parsedMessage);
            }),
        );
    }
    return patches;
}
