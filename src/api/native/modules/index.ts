import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    if (rawModule.__isRainProxied) return rawModule;

    const shadow: Record<string | symbol, any> = {};

    return new Proxy({}, {
        get(target, prop) {
            if (prop === "__isRainProxied") return true;
            if (prop in shadow) return shadow[prop];

            const value = rawModule[prop];
            if (typeof value === "function") {
                return value.bind(rawModule);
            }
            return value;
        },
        set(target, prop, value) {
            shadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            Object.defineProperty(shadow, prop, descriptor);
            return true;
        },
        deleteProperty(target, prop) {
            delete shadow[prop];
            return true;
        },
        has(target, prop) {
            return prop in shadow || prop in rawModule;
        },
        ownKeys(target) {
            return Array.from(new Set([
                ...Reflect.ownKeys(rawModule),
                ...Reflect.ownKeys(shadow)
            ]));
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in shadow) {
                return Object.getOwnPropertyDescriptor(shadow, prop);
            }
            try {
                if (typeof rawModule[prop] === "function") {
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: rawModule[prop].bind(rawModule)
                    };
                }
                const desc = Object.getOwnPropertyDescriptor(rawModule, prop);
                if (desc) return { ...desc, configurable: true, writable: true };
            } catch {}
            return undefined;
        }
    }) as T;
}

export function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        let rawModule: any = undefined;

        if (globalThis.__turboModuleProxy) {
            try {
                rawModule = globalThis.__turboModuleProxy(name);
            } catch {}
        }

        if (!rawModule && nmp) {
            try {
                if (name in nmp) {
                    rawModule = nmp[name];
                }
            } catch (e) {
                console.warn(`[Raincord] Safeguarded crash on native lookup for: ${name}. Error: ${e}`);
            }
        }

        if (rawModule) {
            try {
                return wrapNativeModule<T>(rawModule);
            } catch (e) {
                console.error(`[Raincord] Failed to wrap module: ${name}`, e);
            }
        }
    }
    return undefined;
}

export const NativeCacheModule = getNativeModule<RNModules.MMKVManager>(
    "NativeCacheModule", "MMKVManager"
)!;
export const NativeFileModule = getNativeModule<RNModules.FileManager>(
    "NativeFileModule", "RTNFileManager", "DCDFileManager"
)!;
export const NativeClientInfoModule = getNativeModule<RNModules.ClientInfoModule>(
    "NativeClientInfoModule", "RTNClientInfoManager", "InfoDictionaryManager"
)!;
export const NativeDeviceModule = getNativeModule(
    "NativeDeviceModule", "RTNDeviceManager", "DCDDeviceManager"
)!;
export const NativeThemeModule = getNativeModule(
    "NativeThemeModule", "RTNThemeManager", "DCDTheme"
)!;
export const BundleUpdaterManager = getNativeModule(
    "BundleUpdaterManager"
)!;
export const ImageLoader = getNativeModule(
    "ImageLoader"
)!;
