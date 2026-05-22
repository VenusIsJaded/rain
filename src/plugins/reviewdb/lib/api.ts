import { Review } from "../def";
import { reviewdbSettings } from "../storage";
import { API_URL, BASE_URL } from "./constants";
import { jsonFetch } from "./utils";

// Simple in-memory cache for reviews to reduce repeated network calls
// when navigating profiles multiple times. Cache is cleared on add/delete.
const reviewsCache = new Map<string, Review[]>();

export const getReviews = async (userId: string): Promise<Review[]> => {
    if (!userId) return [];
    if (reviewsCache.has(userId)) {
        return reviewsCache.get(userId)!;
    }
    const data = (await jsonFetch(API_URL + `/users/${userId}/reviews`)).reviews ?? [];
    reviewsCache.set(userId, data);
    return data;
};

export const getAdmins = async () =>
    await jsonFetch<string[]>(BASE_URL + "/admins");

export const addReview = async (userId: string, comment: string) => {
    reviewsCache.delete(userId); // invalidate cache
    return await jsonFetch(API_URL + `/users/${userId}/reviews`, {
        method: "PUT",
        body: JSON.stringify({
            comment: comment,
            token: reviewdbSettings.authToken,
        }),
    });
};

export const deleteReview = async (userId: string, id: number) => {
    reviewsCache.delete(userId);
    return await jsonFetch(API_URL + `/users/${userId}/reviews`, {
        method: "DELETE",
        body: JSON.stringify({
            reviewid: id,
            token: reviewdbSettings.authToken,
        }),
    });
};

export const reportReview = async (id: number) =>
    await jsonFetch(API_URL + "/reports", {
        method: "PUT",
        body: JSON.stringify({
            reviewid: id,
            token: reviewdbSettings.authToken,
        }),
    });

export const getCurrentUser = async () =>
    await jsonFetch(API_URL + "/users", {
        method: "POST",
        body: JSON.stringify({
            token: reviewdbSettings.authToken,
        }),
    });
