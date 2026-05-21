import { createFileStorage, waitForHydration } from "@api/storage";
import { showToast } from "@api/ui/toasts";
import { logger } from "@lib/utils/logger";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as t from "./types";

export const pluginInstances = new Map<string, t.rainPlugin>();
export let pluginMetadataRegistry: Record<string, any> = {};
const lazyPluginIds = new Set<string>();
let _rainPluginsRegistry: Record<string, any> | null = null;
const _pluginResolvingPromises = new Map<string, Promise<t.rainPlugin | null>>();
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

async function resolvePlugin(id: string): Promise<t.rainPlugin | null> {
    const existing = pluginInstances.get(id);
    if (existing !== undefined && existing !== null) return existing;
    if (!lazyPluginIds.has(id) || !_rainPluginsRegistry) return existing ?? null;

    const inFlight = _pluginResolvingPromises.get(id);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<t.rainPlugin | null> => {
        try {
            const maybePromise = _rainPluginsRegistry![id];
            if (!maybePromise || typeof maybePromise.then !== "function") return null;

            const resolved = await maybePromise;
            if (resolved) {
                resolved.id = id;
                pluginInstances.set(id, resolved);
                return resolved;
            } else {
                pluginInstances.delete(id);
                return null;
            }
        } catch (err) {
            console.error(`[plugins] Failed to resolve plugin "${id}":`, err);
            pluginInstances.delete(id);
            return null;
        } finally {
            _pluginResolvingPromises.delete(id);
        }
    })();

    _pluginResolvingPromises.set(id, promise);
    return promise;
}

async function runPluginLifecycle(id: string, method: "start" | "eagerStart"): Promise<void> {
    const instance = await resolvePlugin(id);
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
    const raw = pluginInstances.get(id);
    if (raw === undefined && lazyPluginIds.has(id)) {
        // Lazy plugin never loaded — just update state
        usePluginSettings.getState().updatePluginSetting(id, false);
        return;
    }

    const instance = raw;
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
        const { default: rainPlugins, pluginMetadata } = module as any;
        pluginMetadataRegistry = pluginMetadata ?? {};
        _rainPluginsRegistry = rainPlugins;

        for (const id of Object.keys(rainPlugins)) {
            const descriptor = Object.getOwnPropertyDescriptor(rainPlugins, id);
            if (descriptor?.get) {
                // Lazy getter (import() Promise) — don't evaluate yet
                lazyPluginIds.add(id);
            } else {
                const instance = descriptor?.value as t.rainPlugin;
                if (!instance) continue;
                instance.id = id;
                pluginInstances.set(id, instance);
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
    const raw = pluginInstances.get(id);
    if (raw === undefined && lazyPluginIds.has(id)) return null;
    return raw?.settings ?? null;
}
