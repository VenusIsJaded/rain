import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function getNativeModule<T = any>(...names: string[]): T | undefined {
    for (const name of names) {
        let rawModule: any = undefined;

        if (globalThis.__turboModuleProxy) {
            try {
                rawModule = globalThis.__turboModuleProxy(name);
            } catch {}
        }

        if (!rawModule && nmp[name]) {
            rawModule = nmp[name];
        }

        if (rawModule) {
            // Return a writable proxy wrapper around the read-only C++ native module
            const shadow: Record<string | symbol, any> = {};
            return new Proxy(rawModule, {
                get(target, prop, receiver) {
                    if (prop in shadow) {
                        return shadow[prop];
                    }
                    const value = Reflect.get(target, prop, receiver);
                    if (typeof value === "function") {
                        // Ensure native functions run with correct native context
                        return value.bind(target);
                    }
                    return value;
                },
                set(target, prop, value) {
                    shadow[prop] = value;
                    return true;
                },
                has(target, prop) {
                    return prop in shadow || Reflect.has(target, prop);
                },
                ownKeys(target) {
                    return Array.from(new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(shadow)]));
                },
                getOwnPropertyDescriptor(target, prop) {
                    if (prop in shadow) {
                        return { configurable: true, enumerable: true, writable: true, value: shadow[prop] };
                    }
                    const desc = Reflect.getOwnPropertyDescriptor(target, prop);
                    if (desc) {
                        desc.configurable = true; // Make it configurable for sublimation/patcher
                        return desc;
                    }
                    return undefined;
                }
            }) as T;
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
