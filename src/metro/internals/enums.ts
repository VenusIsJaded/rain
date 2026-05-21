export enum ModuleFlags {
    // EXISTS (0x1) was removed — it was only ever returned by the deleted
    // extractExportsFlags and filtered out immediately, so it was a no-op.
    // Bit values for BLACKLISTED and ASSET are kept unchanged for cache
    // backward-compatibility with existing users' stored metro_modules.json.
    BLACKLISTED = 1 << 1,
    ASSET       = 1 << 2,
}

export enum ModulesMapInternal {
    FULL_LOOKUP,
    NOT_FOUND
}
