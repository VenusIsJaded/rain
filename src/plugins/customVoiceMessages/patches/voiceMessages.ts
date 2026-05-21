import { before } from "@api/patcher";
import { findByProps } from "@metro";

import { customVoiceMessagesSettings } from "../storage";

function transformAttachment(item: any) {
    if (!item?.mimeType?.startsWith("audio")) return;
    item.mimeType = "audio/ogg";
    item.waveform = "AEtWPyUaGA4OEAcA";
    item.durationSecs = 60;
}

const unpatches: (() => void)[] = [];

function patchUploadMethod(methodName: string) {
    try {
        const mod = findByProps(methodName);
        if (!mod || typeof mod[methodName] !== "function") {
            console.warn(`[CVM] Module "${methodName}" not found, skipping`);
            return;
        }
        const unpatch = before(methodName, mod, (args: any[]) => {
            if (!customVoiceMessagesSettings.sendAsVM) return;

            const upload = args[0];
            if (!upload || upload.flags === 8192) return;

            const item = upload.items?.[0] ?? upload;
            if (item?.mimeType?.startsWith("audio")) {
                transformAttachment(item);
                upload.flags = 8192;
            }
        });
        unpatches.push(unpatch);
    } catch (e) {
        console.warn(`[CVM] Failed to patch "${methodName}":`, e);
    }
}

export default function patchVoiceMessages() {
    patchUploadMethod("uploadLocalFiles");
    patchUploadMethod("CloudUpload");

    return () => {
        for (const u of unpatches) {
            try { u(); } catch {}
        }
        unpatches.length = 0;
    };
}
