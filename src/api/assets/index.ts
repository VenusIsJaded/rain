import { getMetroCache } from "@metro/internals/caches";
import { ModuleFlags } from "@metro/internals/enums";
import { requireModule } from "@metro/internals/modules";

import { assetsModule } from "./patches";

export interface Asset {
    id: number;
    name: string;
    moduleId: number;
    type: string;
}

// Null-prototype objects are the fastest possible dictionaries in Hermes
// because they skip the prototype chain lookup entirely.
const _nameToAssetCache = Object.create(null) as Record<string, Asset>;
const _nameToIdCache = Object.create(null) as Record<string, number>;

export function* iterateAssets() {
    const { flagsIndex } = getMetroCache();
    const yielded = new Set<number>();
    
    // Object.keys is significantly faster than for...in in Hermes
    const keys = Object.keys(flagsIndex);
    for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        if (flagsIndex[id] & ModuleFlags.ASSET) {
            const assetId = requireModule(Number(id));
            if (typeof assetId !== "number" || yielded.has(assetId)) continue;
            yield getAssetById(assetId);
            yielded.add(assetId);
        }
    }
}

function getAssetById(id: number): Asset {
    const asset = assetsModule.getAssetByID(id);
    if (!asset) return asset;
    return Object.assign(asset, { id });
}

export function findAsset(id: number): Asset | undefined;
export function findAsset(name: string): Asset | undefined;
export function findAsset(filter: (a: Asset) => boolean): Asset | undefined;

export function findAsset(param: number | string | ((a: Asset) => boolean)) {
    if (typeof param === "number") return getAssetById(param);

    if (typeof param === "string") {
        const cached = _nameToAssetCache[param];
        if (cached) return cached;
        
        for (const asset of iterateAssets()) {
            if (asset.name === param) {
                _nameToAssetCache[param] = asset;
                return asset;
            }
        }
        return undefined;
    }

    for (const asset of iterateAssets()) {
        if (param(asset)) return asset;
    }
}

export function filterAssets(param: string | ((a: Asset) => boolean)) {
    const filteredAssets: Array<Asset> = [];
    for (const asset of iterateAssets()) {
        if (typeof param === "string" ? asset.name === param : param(asset)) {
            filteredAssets.push(asset);
        }
    }
    return filteredAssets;
}

export function findAssetId(name: string): number | undefined {
    // O(1) direct ID cache hit (Fastest possible path)
    const cachedId = _nameToIdCache[name];
    if (cachedId !== undefined) return cachedId;

    // Fallback to full asset cache
    const cachedAsset = _nameToAssetCache[name];
    if (cachedAsset) return (_nameToIdCache[name] = cachedAsset.id);

    // Slow path
    for (const asset of iterateAssets()) {
        if (asset.name === name) {
            _nameToAssetCache[name] = asset;
            return (_nameToIdCache[name] = asset.id);
        }
    }
    return undefined;
}
