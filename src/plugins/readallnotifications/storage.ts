import { createPluginStore } from "@api/storage";

export const { useStore: useReadAllSettings, settings: readAllSettings } =
    createPluginStore("readallnotifications", {
        showAsCommand: true,
        showInActionSheet: true,
    });
