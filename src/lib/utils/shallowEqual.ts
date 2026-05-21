// Hoist to module level — avoids prototype chain lookup on every call (Hermes).
const _hasOwn = Object.prototype.hasOwnProperty;

export function shallowEqual(objA: any, objB: any): boolean {
    if (Object.is(objA, objB)) return true;
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);

    // Count objB keys with for-in instead of Object.keys() to skip the
    // intermediate array allocation — we only need the count, not the array.
    let keysBCount = 0;
    for (const k in objB) {
        if (_hasOwn.call(objB, k)) keysBCount++;
    }

    if (keysA.length !== keysBCount) return false;

    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if (!_hasOwn.call(objB, key)) return false;

        const valA = objA[key];
        const valB = objB[key];

        if (typeof valA === "function" || typeof valB === "function") continue;

        if (typeof valA === "object" && valA !== null && typeof valB === "object" && valB !== null) {
            const subKeysA = Object.keys(valA);
            let subKeysBCount = 0;
            for (const k in valB) if (_hasOwn.call(valB, k)) subKeysBCount++;
            if (subKeysA.length !== subKeysBCount) return false;
            for (let j = 0; j < subKeysA.length; j++) {
                const subKey = subKeysA[j];
                if (!_hasOwn.call(valB, subKey) || !Object.is(valA[subKey], valB[subKey])) {
                    return false;
                }
            }
        } else if (!Object.is(valA, valB)) {
            return false;
        }
    }

    return true;
}
