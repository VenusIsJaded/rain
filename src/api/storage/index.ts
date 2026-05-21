import { fileExists, readFile, writeFile } from "@api/native/fs";
import { FluxDispatcher } from "@metro/common";
import { create } from "zustand";
import { createJSONStorage, persist, StorageValue } from "zustand/middleware";

import { shallowEqual } from "../../lib/utils/shallowEqual";

export const createFileStorage = (filePath: string) => {
    return {
        // _name is the Zustand store key — unused here since we key by filePath
        getItem: async (_name: string): Promise<string | null> => {
            try {
                const exists = await fileExists(filePath);
                if (!exists) return null;
                return await readFile(filePath);
            } catch (e) {
                console.error(`Failed to read storage from '${filePath}'`, e);
                return null;
            }
        },
        setItem: async (_name: string, value: string): Promise<void> => {
            try {
                await writeFile(filePath, value);
            } catch (e) {
                console.error(`Failed to write storage to '${filePath}'`, e);
            }
        },
        removeItem: async (_name: string): Promise<void> => {
            // intentionally no-op
        },
    };
};

export const createFlattenedFileStorage = <T>(filePath: string) => {
    return {
        getItem: async (_name: string): Promise<string | null> => {
            try {
                const exists = await fileExists(filePath);
                if (!exists) return null;
                const content = await readFile(filePath);
                const data = JSON.parse(content);
                if (data.state) return content;
                const wrapped: StorageValue<T> = {
                    state: data,
                    version: 0,
                };
                return JSON.stringify(wrapped);
            } catch (e) {
                console.error(`Failed to read flattened storage from '${filePath}'`, e);
                return null;
            }
        },
        setItem: async (_name: string, value: string): Promise<void> => {
            try {
                const parsed = JSON.parse(value) as StorageValue<T>;
                const rawState = JSON.stringify(parsed.state);
                await writeFile(filePath, rawState);
            } catch (e) {
                console.error(`Failed to write flattened storage to '${filePath}'`, e);
            }
        },
        removeItem: async () => {},
    };
};

export async function waitForHydration(usePluginSettings: any): Promise<void> {
    return new Promise(resolve => {
        if (usePluginSettings.getState()._hasHydrated) {
            resolve();
            return;
        }

        const unsubscribe = usePluginSettings.subscribe((state: any) => {
            if (state._hasHydrated) {
                unsubscribe();
                resolve();
            }
        });

        setTimeout(() => {
            console.warn("[rain/storage] waitForHydration timed out after 5s — resolving anyway");
            unsubscribe();
            resolve();
        }, 5000);
    });
}

export type PluginStore<T> = T & {
    updateSettings: (settings: Partial<T>) => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
};

export function createPluginStore<T extends object>(
    pluginName: string,
    initialState: T
) {
    const useStore = create<PluginStore<T>>()(
        persist(
            set => ({
                ...initialState,
                _hasHydrated: false,
                updateSettings: newSettings =>
                    set((state: any) => ({ ...state, ...newSettings })),
                setHasHydrated: (state: boolean) =>
                    set({ _hasHydrated: state } as Partial<PluginStore<T>>),
            }),
            {
                name: `${pluginName}-settings`,
                storage: createJSONStorage(() => createFileStorage(`plugins/${pluginName}.json`)),
                onRehydrateStorage: () => state => {
                    state?.setHasHydrated(true);
                },
            }
        )
    );

    useStore.subscribe((state, prevState) => {
        if (state._hasHydrated && !shallowEqual(state, prevState)) {
            FluxDispatcher.dispatch({ type: "RAIN_SETTING_UPDATED" });
        }
    });

    const settingsProxy = new Proxy({} as T, {
        get(_, prop: string) {
            const state = useStore.getState();
            // Single indexOf scan instead of includes() then split() (two scans)
            const dotIdx = prop.indexOf(".");
            if (dotIdx !== -1) {
                const parent = prop.slice(0, dotIdx);
                const child = prop.slice(dotIdx + 1);
                return (state as any)[parent]?.[child];
            }
            return (state as any)[prop];
        },
        set(_, prop: string, value: any) {
            const state = useStore.getState();
            const dotIdx = prop.indexOf(".");
            if (dotIdx !== -1) {
                const parent = prop.slice(0, dotIdx);
                const child = prop.slice(dotIdx + 1);
                state.updateSettings({
                    [parent]: { ...(state as any)[parent], [child]: value }
                } as any);
            } else {
                state.updateSettings({ [prop]: value } as any);
            }
            return true;
        },
    });

    return { useStore, settings: settingsProxy };
}
