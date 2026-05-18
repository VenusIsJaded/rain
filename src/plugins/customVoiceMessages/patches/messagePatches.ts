import { before } from "@api/patcher";
import { FluxDispatcher } from "@metro/common";
import { customVoiceMessagesSettings } from "../storage";

function getStoreHandler(actionType: string) {
    try {
        const handlers = FluxDispatcher._actionHandlers._computeOrderedActionHandlers(actionType);
        return handlers.find((h: any) => h.name === "MessageStore");
    } catch {
        return null;
    }
}

function processMessage(msg: any) {
    if (msg?.flags === 8192) return;
    if (!Array.isArray(msg?.attachments)) return;
    for (const att of msg.attachments) {
        if (att?.content_type?.startsWith?.("audio")) {
            att.waveform = "AEtWPyUaGA4OEAcA";
            att.duration_secs = 60;
        }
    }
    if (msg.attachments?.some((a: any) => a?.content_type?.startsWith?.("audio"))) {
        msg.flags |= 8192;
    }
}

export function patchMessageSuccess() {
    const handler = getStoreHandler("LOAD_MESSAGES_SUCCESS");
    if (!handler) return () => {};

    return before("actionHandler", handler, (args: any[]) => {
        if (!customVoiceMessagesSettings.allAsVM) return;
        const messages = args[0]?.messages;
        if (!Array.isArray(messages)) return;
        for (const msg of messages) processMessage(msg);
    });
}

export function patchMessageCreate() {
    const handler = getStoreHandler("MESSAGE_CREATE");
    if (!handler) return () => {};

    return before("actionHandler", handler, (args: any[]) => {
        if (!customVoiceMessagesSettings.allAsVM) return;
        processMessage(args[0]?.message);
    });
}

export function patchMessageUpdate() {
    const handler = getStoreHandler("MESSAGE_UPDATE");
    if (!handler) return () => {};

    return before("actionHandler", handler, (args: any[]) => {
        if (!customVoiceMessagesSettings.allAsVM) return;
        processMessage(args[0]?.message);
    });
}
