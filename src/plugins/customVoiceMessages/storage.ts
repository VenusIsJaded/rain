import { createPluginStore } from "@api/storage";

interface CustomVoiceMessagesSettings {
    sendAsVM: boolean;
    allAsVM: boolean;
}

export const {
    useStore: useCustomVoiceMessagesSettings,
    settings: customVoiceMessagesSettings,
} = createPluginStore<CustomVoiceMessagesSettings>("customVoiceMessages", {
    sendAsVM: true,
    allAsVM: false,
});
