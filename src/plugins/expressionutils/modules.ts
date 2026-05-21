import { findByPropsLazy, findByStoreNameLazy } from "@metro/wrappers";
import { React } from "@metro/common";

export const Surrogates = findByPropsLazy("convertSurrogateToName");
export const LazyActionSheet = findByPropsLazy("hideActionSheet");
export const MediaModalUtils = findByPropsLazy("openMediaModal");
export const Emojis = findByPropsLazy("uploadEmoji");

export const EmojiStore = findByStoreNameLazy("EmojiStore");
export const GuildStore = findByStoreNameLazy("GuildStore");
export const PermissionsStore = findByStoreNameLazy("PermissionStore");

export const _bs = findByPropsLazy("BottomSheetScrollView");
export const BottomSheetFlatList = (props: any) => { const Comp = _bs.BottomSheetFlatList; return Comp ? React.createElement(Comp, props) : null; };

export const _gi = findByPropsLazy("GuildIconSizes");
export const GuildIcon = (props: any) => { const Comp = _gi.default; return Comp ? React.createElement(Comp, props) : null; };
export const GuildIconSizes = new Proxy({}, { get: (_, p) => _gi.GuildIconSizes?.[p] });

export const downloadMediaModule = findByPropsLazy("downloadMediaAsset");
export const downloadMediaAsset = (url: any, id: any) => downloadMediaModule.downloadMediaAsset?.(url, id);
