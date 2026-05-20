import { useSettings } from "@api/settings";
import { createFileStorage, waitForHydration } from "@api/storage";
import { showToast } from "@api/ui/toasts";
import { logger } from "@lib/utils/logger";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as t from "./types";

export const pluginInstances = new Map();
let _setupPromise: Promise<void> | null = null;

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 0;

interface PluginSettingsStore {
    settings: t.PluginSettingsStorage;
    _hasHydrated: boolean;
    updatePluginSetting: (id: string, enabled: boolean) => void;
    getPluginSetting: (id: string) => { enabled: boolean } | undefined;
    setHasHydrated: (state: boolean) => void;
}

export const usePluginSettings = create()(
    persist(
        (set, get) => ({
            settings: {},
            _hasHydrated: false,
            updatePluginSetting: (id: string, enabled: boolean) => {
                set(state => ({
                    settings: { ...state.settings, [id]: { enabled } },
                }));
            },
            getPluginSetting: (id: string) => get().settings[id],
            setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
        }),
        {
            name: "plugin-settings",
            storage: createJSONStorage(() => createFileStorage("plugins/settings.json")),
            onRehydrateStorage: () => state => state?.setHasHydrated(true),
        }
    )
);

export const pluginSettings = new Proxy({} as t.PluginSettingsStorage, {
    get: (_, prop: string) => usePluginSettings.getState().settings[prop],
    set: (_, prop: string, value: { enabled: boolean }) => {
        usePluginSettings.getState().updatePluginSetting(prop, value.enabled);
        return true;
    },
});

function assert(condition: any, id: string, attempt: string): asserts condition {
    if (!condition) throw new Error(`[${id}] Attempted to ${attempt}`);
}

async function runPluginLifecycle(id: string, method: "start" | "eagerStart"): Promise<void> {
    const instance = pluginInstances.get(id);
    if (!instance) {
        logger.warn(`[plugins] Skipped loading null/empty plugin matching ID: "${id}"`);
        return;
    }

    try {
        await instance[method]?.();
        usePluginSettings.getState().updatePluginSetting(id, true);
    } catch (error) {
        const errorMsg = `[${id}] Failed to ${method}: ${error}`;
        console.error(errorMsg, error);
        if (method === "start") showToast(errorMsg);
    }
}

export const startPlugin = (id: string) => runPluginLifecycle(id, "start");
export const startEagerPlugin = (id: string) => runPluginLifecycle(id, "eagerStart");

export async function stopPlugin(id: string): Promise<void> {
    const instance = pluginInstances.get(id);
    if (instance) await instance.stop?.();
}

export const isPluginCore = (id: string): boolean => id.startsWith("core.");
export const isPluginEnabled = (id: string): boolean => {
    const setting = usePluginSettings.getState().settings[id];
    return setting?.enabled ?? isPluginCore(id);
};

async function ensureSetup(): Promise<void> {
    if (_setupPromise) return _setupPromise;

    _setupPromise = (async () => {
        const [{ default: rainPlugins }] = await Promise.all([
            import("#rain-plugins"),
            waitForHydration(usePluginSettings),
        ]);

        for (const [id, plugin] of Object.entries(rainPlugins)) {
            const instance = plugin as t.rainPlugin;
            if (!instance) continue;
            instance.id = id;
            pluginInstances.set(id, instance);
        }
    })();

    return _setupPromise;
}

async function startBatched(ids: string[], method: "start" | "eagerStart"): Promise<void> {

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
            batch.map(id => runPluginLifecycle(id, method))
        );
        if (BATCH_DELAY_MS > 0 && i + BATCH_SIZE < ids.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
    }
}

export async function initPlugins(): Promise<void> {
    await ensureSetup();
    const ids = Array.from(pluginInstances.keys()).filter(isPluginEnabled);
    await startBatched(ids, "start");
}

export async function initEagerPlugins(): Promise<void> {
    await ensureSetup();
    const ids = Array.from(pluginInstances.keys()).filter(isPluginEnabled);
    await startBatched(ids, "eagerStart");
}

export function definePlugin(instance: t.rainPlugin): t.rainPlugin {
    // @ts-expect-error
    instance[Symbol.for("rain.plugin")] = true;
    return instance;
}

export function getPluginSettingsComponent(id: string): (() => any) | null {
    return pluginInstances.get(id)?.settings ?? null;
}
