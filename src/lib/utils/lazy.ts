type ExemptedEntries = Record<symbol | string, unknown>;

interface LazyOptions<E extends ExemptedEntries> {
    hint?: "function" | "object";
    exemptedEntries?: E
}

interface ContextHolder {
    options: LazyOptions<any>;
    factory: () => any;
}

const unconfigurable = new Set(["arguments", "caller", "prototype"]);
const isUnconfigurable = (key: PropertyKey) => typeof key === "string" && unconfigurable.has(key);

const factories = new WeakMap<any,() => any>();
const proxyContextHolder = new WeakMap<any, ContextHolder>();

const lazyHandler: ProxyHandler<any> = {
    apply(target, thisArg, args) {
        const contextHolder = proxyContextHolder.get(target);
        if (!contextHolder) throw new Error("Missing context");
        const resolved = contextHolder.factory();
        if (typeof resolved === "function") return resolved.apply(thisArg, args);
        if (window.React) return window.React.createElement(resolved, args[0]);
        throw new Error(`Cannot call ${typeof resolved} as a function`);
    },
    construct(target, args, newTarget) {
        const contextHolder = proxyContextHolder.get(target);
        if (!contextHolder) throw new Error("Missing context");
        const resolved = contextHolder.factory();
        if (typeof resolved !== "function") throw new Error(`Cannot construct ${typeof resolved}`);
        return Reflect.construct(resolved, args, newTarget);
    },

    has(target, p) {
        const contextHolder = proxyContextHolder.get(target);
        if (!contextHolder) return false;
        const isolatedEntries = contextHolder.options?.exemptedEntries;
        if (isolatedEntries && p in isolatedEntries) return true;
        const resolved = contextHolder.factory();
        return resolved ? p in resolved : false;
    },
    get(target, p, receiver) {
        if (__DEV__ && p === "__IS_RAIN_LAZY_PROXY__") return true;
        const contextHolder = proxyContextHolder.get(target);
        if (!contextHolder) return undefined;
        const isolatedEntries = contextHolder.options?.exemptedEntries;
        if (isolatedEntries && p in isolatedEntries) return isolatedEntries[p];
        const resolved = contextHolder.factory();
        if (!resolved) throw new Error(`Trying to get property ${String(p)} of unresolved lazy proxy`);
        return resolved[p];
    },
    set(target, p, value) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (resolved) { resolved[p] = value; return true; }
        return false;
    },
    ownKeys(target) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (!resolved) return [];
        const cacheKeys = Object.keys(resolved);
        const symbols = Object.getOwnPropertySymbols(resolved);
        for (let i = 0; i < symbols.length; i++) cacheKeys.push(symbols[i] as any);
        unconfigurable.forEach(key => { if (!cacheKeys.includes(key)) cacheKeys.push(key); });
        return cacheKeys;
    },
    getOwnPropertyDescriptor(target, p) {
        if (isUnconfigurable(p)) return Object.getOwnPropertyDescriptor(target, p);
        const resolved = proxyContextHolder.get(target)?.factory();
        if (!resolved) return undefined;
        const descriptor = Object.getOwnPropertyDescriptor(resolved, p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    },
    getPrototypeOf(target) {
        const resolved = proxyContextHolder.get(target)?.factory();
        return resolved ? Object.getPrototypeOf(resolved) : null;
    },
    setPrototypeOf(target, v) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (resolved) { Object.setPrototypeOf(resolved, v); return true; }
        return false;
    },
    isExtensible(target) {
        const resolved = proxyContextHolder.get(target)?.factory();
        return resolved ? Object.isExtensible(resolved) : true;
    },
    preventExtensions(target) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (resolved) { Object.preventExtensions(resolved); return true; }
        return false;
    },
    deleteProperty(target, p) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (resolved) { delete resolved[p]; return true; }
        return false;
    },
    defineProperty(target, p, attributes) {
        const resolved = proxyContextHolder.get(target)?.factory();
        if (resolved) { Object.defineProperty(resolved, p, attributes); return true; }
        return false;
    }
};

export function proxyLazy<T, I extends ExemptedEntries>(factory: () => T, opts: LazyOptions<I> = {}): T {
    let cache: T | undefined;
    const dummy = opts.hint !== "object" ? function () { } : {};
    const proxyFactory = () => { if (cache === undefined) cache = factory(); return cache; };
    const proxy = new Proxy(dummy, lazyHandler) as T & I;
    factories.set(proxy, proxyFactory);
    proxyContextHolder.set(dummy, { factory: proxyFactory, options: opts });
    return proxy;
}

export function lazyDestructure<T extends Record<PropertyKey, unknown>, I extends ExemptedEntries>(factory: () => T, opts: LazyOptions<I> = {}): T {
    const proxiedObject = proxyLazy(factory);
    return new Proxy({}, {
        get(_, property) {
            if (property === Symbol.iterator) {
                return function* () {
                    yield proxiedObject;
                    yield new Proxy({}, { get: (_, p) => proxyLazy(() => (proxiedObject as any)[p], opts) });
                    throw new Error("This is not a real iterator, this is likely used incorrectly");
                };
            }
            return proxyLazy(() => (proxiedObject as any)[property], opts);
        }
    }) as T;
}

export function getProxyFactory<T>(obj: T): (() => T) | void {
    return factories.get(obj) as (() => T) | void;
}
