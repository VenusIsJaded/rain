import { lazyDestructure } from "@lib/utils/lazy";
import { findAssetId } from "@api/assets";
import { showToast } from "@api/ui/toasts";
import { findByName, findByNameLazy, findByProps, findByPropsLazy } from "@metro";

import { loadAllEffectData } from "../patches/effects";
import { useAuthorizationStore } from "../stores/AuthorizationStore";
import { API_BASE, CLIENT_ID } from "./api";

const { pushModal, popModal } = lazyDestructure(() => findByProps("pushModal"));
const OAuth2AuthorizeModal = findByNameLazy("OAuth2AuthorizeModal");

export const showAuthModal = () =>
    pushModal({
        key: "oauth2-authorize",
        modal: {
            key: "oauth2-authorize",
            modal: OAuth2AuthorizeModal,
            animation: "slide-up",
            shouldPersistUnderModals: false,
            props: {
                clientId: `${CLIENT_ID}`,
                redirectUri: `${API_BASE}/callback`,
                scopes: ["identify"],
                responseType: "code",
                permissions: 0n,
                cancelCompletesFlow: false,
                callback: async ({ location }: any) => {
                    try {
                        const url = new URL(location);
                        const code = url.searchParams.get("code");
                        if (!code) throw new Error("No code found");

                        const res = await fetch(`${API_BASE}/callback?code=${code}`);
                        const json = await res.json();
                        if (!json.token) throw new Error("No token returned");

                        useAuthorizationStore.getState().setToken(json.token);
                        await loadAllEffectData();
                        showToast("Authorized!", findAssetId("CheckIcon"));
                        popModal("oauth2-authorize");
                    } catch (e) {
                        console.error("[CustomEffects] Auth failed", e);
                        showToast("Authorization failed", findAssetId("CircleXIcon"));
                        popModal("oauth2-authorize");
                    }
                },
                dismissOAuthModal: () => popModal("oauth2-authorize"),
            },
            closable: true,
        },
    });
