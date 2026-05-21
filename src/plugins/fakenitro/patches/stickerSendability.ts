import { instead } from "@api/patcher";
import { findByPropsLazy } from "@metro";

const stickerUtils = findByPropsLazy("getStickerSendability", "isSendableSticker");
const SENDABLE = stickerUtils.StickerSendability?.SENDABLE ?? 0;

export default function getPatches() {
    return [
        instead("getStickerSendability", stickerUtils, () => SENDABLE),

        instead("isSendableSticker", stickerUtils, () => true),
    ];
}
