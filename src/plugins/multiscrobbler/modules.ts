import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps, findByPropsLazy, findByStoreName, findByStoreNameLazy } from "@metro";

// We don't really *need* this module, BUT this module has to be initialized before we can dispatch LOCAL_ACTIVITY_UPDATE

const { SET_ACTIVITY } = lazyDestructure(() => findByProps("SET_ACTIVITY"));

export const AssetManager = findByPropsLazy("getAssetIds") as {
    getAssetIds: (appId: string, ids: string[]) => string[];
    fetchAssetIds: (appId: string, ids: string[]) => Promise<string[]>;
    [key: PropertyKey]: any;
};

export const SelfPresenceStore = findByStoreNameLazy("SelfPresenceStore") as {
    getActivities: () => any[];
    findActivity: (filter: (activity: any) => boolean) => any;
};

export const UserStore = findByStoreNameLazy("UserStore");
