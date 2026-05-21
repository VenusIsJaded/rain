export function shallowEqual(objA: any, objB: any): boolean {
    if (Object.is(objA, objB)) return true;
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;

        const valA = objA[key];
        const valB = objB[key];

        if (typeof valA === "function" || typeof valB === "function") continue;

        if (typeof valA === "object" && valA !== null && typeof valB === "object" && valB !== null) {
            const subKeysA = Object.keys(valA);
            const subKeysB = Object.keys(valB);
            if (subKeysA.length !== subKeysB.length) return false;
            for (let j = 0; j < subKeysA.length; j++) {
                const subKey = subKeysA[j];
                if (!Object.prototype.hasOwnProperty.call(valB, subKey) || !Object.is(valA[subKey], valB[subKey])) {
                    return false;
                }
            }
        } else if (!Object.is(valA, valB)) {
            return false;
        }
    }

    return true;
}
