import { RNModules } from "./types";

// Globally wrap nativeModuleProxy to prevent direct write crashes anywhere in the app
if (window.nativeModuleProxy && !(window.nativeModuleProxy as any).__isRainProxied) {
    const originalNMP = window.nativeModuleProxy;
    const nmpShadow: Record<string | symbol, any> = {};
    
    window.nativeModuleProxy = new Proxy(originalNMP, {
        get(target, prop, receiver) {
            if (prop === "__isRainProxied") return true;
            if (prop in nmpShadow) return nmpShadow[prop];
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value) {
            nmpShadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            Object.defineProperty(nmpShadow, prop, descriptor);
            return true;
        },
        deleteProperty(target, prop) {
            delete nmpShadow[prop];
            return true;
        },
        has(target, prop) {
            return prop in nmpShadow || Reflect.has(target, prop);
        }
    });
}

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
            const shadow: Record<string | symbol, any> = {};
            return new Proxy(rawModule, {
                get(target, prop, receiver) {
                    if (prop in shadow) {
                        return shadow[prop];
                    }
                    const value = Reflect.get(target, prop, receiver);
                    if (typeof value === "function") {
                        return value.bind(target);
                    }
                    return value;
                },
                set(target, prop, value) {
                    shadow[prop] = value;
                    return true;
                },
                defineProperty(target, prop, descriptor) {
                    // Trap Object.defineProperty calls from sublimation/patchers
                    Object.defineProperty(shadow, prop, descriptor);
                    return true;
                },
                deleteProperty(target, prop) {
                    delete shadow[prop];
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
                        return { ...desc, configurable: true }; // Force configurable so sublimation can overwrite it
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
