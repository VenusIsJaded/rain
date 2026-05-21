import { createFileStorage } from "@api/storage";
import { showToast } from "@api/ui/toasts";
import { logger } from "@lib/utils/logger";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as t from "./types";

export const pluginInstances = new Map<string, t.rainPlugin>();
export let pluginMetadata: Record<string, any> = {};
export let allPluginIds: string[] = [];

let _optionalPluginGetters: Record<string, (() => t.rainPlugin | null)> | null = null;
let _setupPromise: Promise<void> | null = null;

const BATCH_SIZE = 15;
interface PluginSettingsStore {
  settings: t.PluginSettingsStorage;
  _hasHydrated: boolean;
  updatePluginSetting: (id: string, enabled: boolean) => void;
  getPluginSetting: (id: string) => { enabled: boolean } | undefined;
  setHasHydrated: (state: boolean) => void;
}

export const usePluginSettings = create<PluginSettingsStore>()(
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

export function getPluginMetadata(id: string): any | undefined {
    return pluginMetadata[id];
}

function loadPlugin(id: string): t.rainPlugin | null {
    const existing = pluginInstances.get(id);
    if (existing !== undefined) return existing;
    if (!_optionalPluginGetters) return null;

    const getter = _optionalPluginGetters[id];
    if (!getter) return null;

    try {
        const instance = getter();
        if (instance) {
            instance.id = id;
            pluginInstances.set(id, instance);
        }
        return instance;
    } catch (err) {
        console.error(`[plugins] Failed to load plugin "${id}":`, err);
        return null;
    }
}

export function ensureAllPluginsLoaded(): void {
    if (!_optionalPluginGetters) return;
    for (const id of Object.keys(_optionalPluginGetters)) {
        if (!pluginInstances.has(id)) loadPlugin(id);
    }
}

async function runPluginLifecycle(id: string, method: "start" | "eagerStart"): Promise<void> {
    let instance = pluginInstances.get(id);
    if (!instance) {
        instance = loadPlugin(id);
    }
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
    if (!instance) {
        usePluginSettings.getState().updatePluginSetting(id, false);
        return;
    }

    try {
        await instance.stop?.();
    } catch (error) {
        console.error(`[${id}] Failed to stop:`, error);
    }

    usePluginSettings.getState().updatePluginSetting(id, false);
}

export const isPluginCore = (id: string): boolean => id.startsWith("core.");
export const isPluginEnabled = (id: string): boolean => {
    const setting = usePluginSettings.getState().settings[id];
    return setting?.enabled ?? isPluginCore(id);
};

async function ensureSetup(): Promise<void> {
    if (_setupPromise) return _setupPromise;

    _setupPromise = (async () => {
        const module = await import("#rain-plugins");
        const {
            default: rainPlugins,
            pluginMetadata: meta,
            pluginIds: ids,
            corePlugins,
            optionalPlugins,
        } = module as any;

        pluginMetadata = meta ?? {};
        allPluginIds = ids ?? Object.keys(rainPlugins);
        _optionalPluginGetters = optionalPlugins ?? {};

        // Load core plugins eagerly — they're always needed
        if (corePlugins) {
            for (const [id, instance] of Object.entries(corePlugins)) {
                if (!instance) continue;
                (instance as t.rainPlugin).id = id;
                pluginInstances.set(id, instance as t.rainPlugin);
            }
        }
    })();

    return _setupPromise;
}

async function startBatched(ids: string[], method: "start" | "eagerStart"): Promise<void> {
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        await Promise.allSettled(
            ids.slice(i, i + BATCH_SIZE).map(id => runPluginLifecycle(id, method))
        );
    }
}

export async function initPlugins(): Promise<void> {
    await ensureSetup();
    const ids = allPluginIds.filter(isPluginEnabled);
    await startBatched(ids, "start");
}

export async function initEagerPlugins(): Promise<void> {
    await ensureSetup();
    const ids = allPluginIds.filter(isPluginEnabled);
    await startBatched(ids, "eagerStart");
}

export function definePlugin(instance: t.rainPlugin): t.rainPlugin {
    // @ts-expect-error
    instance[Symbol.for("rain.plugin")] = true;
    return instance;
}

export function getPluginSettingsComponent(id: string): (() => any) | null {
    const instance = pluginInstances.get(id);
    if (!instance) {
        // Load on demand if not already loaded
        const loaded = loadPlugin(id);
        return loaded?.settings ?? null;
    }
    return instance.settings ?? null;
}
