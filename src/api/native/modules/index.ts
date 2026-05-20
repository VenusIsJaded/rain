import { RNModules } from "./types";

const nmp = window.nativeModuleProxy;

export function wrapNativeModule<T = any>(rawModule: any): T | undefined {
    if (!rawModule) return undefined;
    if (rawModule.__isRainProxied) return rawModule;

    // Local safe storage for patches and modifications
    const shadow: Record<string | symbol, any> = {};

    return new Proxy(rawModule, {
        get(target, prop, receiver) {
            if (prop === "__isRainProxied") return true;
            if (prop in shadow) return shadow[prop];
            
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === "function") {
                // Ensure native functions run bound to the correct raw native context
                return value.bind(target);
            }
            return value;
        },
        set(target, prop, value) {
            shadow[prop] = value;
            return true;
        },
        defineProperty(target, prop, descriptor) {
            // Divert write operations away from JSI C++ HostObjects to safe JS shadow memory
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
            return Array.from(new Set([
                ...Reflect.ownKeys(target),
                ...Reflect.ownKeys(shadow)
            ]));
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in shadow) {
                return Object.getOwnPropertyDescriptor(shadow, prop);
            }
            try {
                const desc = Reflect.getOwnPropertyDescriptor(target, prop);
                if (desc) {
                    return {
                        ...desc,
                        configurable: true,
                        writable: true
                    };
                }
                // Synthesize a writable descriptor for dynamic JSI C++ methods
                if (typeof target[prop] === "function") {
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: target[prop].bind(target)
                    };
                }
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

        if (!rawModule && nmp && nmp[name]) {
            rawModule = nmp[name];
        }

        if (rawModule) {
            return wrapNativeModule<T>(rawModule);
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
