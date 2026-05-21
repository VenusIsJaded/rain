import { fileExists, readFile, writeFile } from "@api/native/fs";
import { NativeClientInfoModule } from "@api/native/modules";
import { debounce } from "es-toolkit";

import { ModuleFlags, ModulesMapInternal } from "./enums";

const CACHE_VERSION = 2;
const RAIN_METRO_CACHE_PATH = "caches/metro_modules.json";

type ModulesMap = {
    [flag in number | `_${ModulesMapInternal}`]?: ModuleFlags;
};

let _metroCache = null as unknown as ReturnType<typeof buildInitCache>;

export const getMetroCache = () => _metroCache;

function buildInitCache() {
    const cache = {
        _v: CACHE_VERSION,
        _buildNumber: NativeClientInfoModule.getConstants().Build,
        _modulesCount: Object.keys(window.modules).length,
        flagsIndex: {} as Record<string, number>,
        findIndex: {} as Record<string, ModulesMap | undefined>,
        polyfillIndex: {} as Record<string, ModulesMap | undefined>
    } as const;

    setTimeout(() => {
        for (const id in window.modules) {
            require("./modules").requireModule(id);
        }
    }, 20);

    _metroCache = cache;
    return cache;
}

/** @internal */
export async function initMetroCache() {
    if (!await fileExists(RAIN_METRO_CACHE_PATH)) return void buildInitCache();
    const rawCache = await readFile(RAIN_METRO_CACHE_PATH);
    try {
        _metroCache = JSON.parse(rawCache);
        if (_metroCache._v !== CACHE_VERSION) {
            _metroCache = null!;
            throw "cache invalidated; cache version outdated";
        }
        if (_metroCache._buildNumber !== NativeClientInfoModule.getConstants().Build) {
            _metroCache = null!;
            throw "cache invalidated; version mismatch";
        }
        const _currentModuleCount = Object.keys(window.modules).length;
        if (_metroCache._modulesCount !== _currentModuleCount) {
            _metroCache = null!;
            throw "cache invalidated; modules count mismatch";
        }
    } catch {
        buildInitCache();
    }
}

const saveCache = debounce(() => {
    writeFile(RAIN_METRO_CACHE_PATH, JSON.stringify(_metroCache));
}, 1000);

// extractExportsFlags and indexExportsFlags removed — extractExportsFlags always
// returned ModuleFlags.EXISTS which was immediately filtered out by the caller,
// making both functions effective no-ops. Removing them saves bundle parse and
// JIT compile time.

/** @internal */
export function indexBlacklistFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.BLACKLISTED;
}

/** @internal */
export function indexAssetModuleFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.ASSET;
}

/** @internal */
const _cacherResult = {
    _indexObject: null as any,
    _allFind: false,
    cacheId(moduleId: number, exports: any) {
        _cacherResult._indexObject[moduleId] ??= 1;
        saveCache();
    },
    finish(notFound: boolean) {
        if (_cacherResult._allFind) _cacherResult._indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
        if (notFound) _cacherResult._indexObject[`_${ModulesMapInternal.NOT_FOUND}`] = 1;
        saveCache();
    }
};

/** @internal */
export function getCacherForUniq(uniq: string, allFind: boolean) {
    _cacherResult._indexObject = _metroCache.findIndex[uniq] ??= {};
    _cacherResult._allFind = allFind;
    return _cacherResult;
}

/** @internal */
export function getPolyfillModuleCacher(name: string) {
    const indexObject = _metroCache.polyfillIndex[name] ??= {};

    return {
        getModules() {
            return require("@metro/internals/modules").getCachedPolyfillModules(name);
        },
        cacheId(moduleId: number) {
            indexObject[moduleId] = 1;
            saveCache();
        },
        finish() {
            indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            saveCache();
        }
    };
}

export function invalidateCache() {
    _metroCache = buildInitCache();
    saveCache.flush?.();
}
