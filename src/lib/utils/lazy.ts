type ExemptedEntries = Record<symbol | string, unknown>;

interface LazyOptions<E extends ExemptedEntries> {
    hint?: "function" | "object";
    exemptedEntries?: E
}

interface ContextHolder {
    options: LazyOptions<any>;
    factory: any
}

const unconfigurable = new Set(["arguments", "caller", "prototype"]);
const isUnconfigurable = (key: PropertyKey) => typeof key === "string" && unconfigurable.has(key);

const factories = new WeakMap<any, () => any>();
const proxyContextHolder = new WeakMap<any, ContextHolder>();

// Static, high-performance Reflect trap definitions to eliminate Object.fromEntries startup cost
const lazyHandler: ProxyHandler<any> = {
    get(target, p, receiver) {
        if (__DEV__ && p === "__IS_RAIN_LAZY_PROXY__") return true;

        const contextHolder = proxyContextHolder.get(target);

        if (contextHolder?.options) {
            const { exemptedEntries: isolatedEntries } = contextHolder.options;
            if (isolatedEntries?.[p]) return isolatedEntries[p];
        }

        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.get of ${typeof resolved}`);
        return Reflect.get(resolved, p, receiver);
    },
    set(target, p, value, receiver) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.set of ${typeof resolved}`);
        return Reflect.set(resolved, p, value, receiver);
    },
    apply(target, thisArg, args) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();

        if (typeof resolved === "function") {
            return Reflect.apply(resolved, thisArg, args);
        }

        if (window.React) {
            return window.React.createElement(resolved, args[0]);
        }

        throw new Error(`Cannot call ${typeof resolved} as a function`);
    },
    has(target, p) {
        const contextHolder = proxyContextHolder.get(target);

        if (contextHolder?.options) {
            const { exemptedEntries: isolatedEntries } = contextHolder.options;
            if (isolatedEntries && p in isolatedEntries) return true;
        }

        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.has of ${typeof resolved}`);
        return Reflect.has(resolved, p);
    },
    ownKeys(target) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.ownKeys of ${typeof resolved}`);

        const cacheKeys = Reflect.ownKeys(resolved);
        unconfigurable.forEach(key => !cacheKeys.includes(key) && cacheKeys.push(key));
        return cacheKeys;
    },
    getOwnPropertyDescriptor(target, p) {
        if (isUnconfigurable(p)) return Reflect.getOwnPropertyDescriptor(target, p);

        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to getOwnPropertyDescriptor of ${typeof resolved}`);

        const descriptor = Reflect.getOwnPropertyDescriptor(resolved, p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    },
    defineProperty(target, p, attributes) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.defineProperty of ${typeof resolved}`);
        return Reflect.defineProperty(resolved, p, attributes);
    },
    deleteProperty(target, p) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.deleteProperty of ${typeof resolved}`);
        return Reflect.deleteProperty(resolved, p);
    },
    getPrototypeOf(target) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.getPrototypeOf of ${typeof resolved}`);
        return Reflect.getPrototypeOf(resolved);
    },
    setPrototypeOf(target, prototype) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.setPrototypeOf of ${typeof resolved}`);
        return Reflect.setPrototypeOf(resolved, prototype);
    },
    isExtensible(target) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.isExtensible of ${typeof resolved}`);
        return Reflect.isExtensible(resolved);
    },
    preventExtensions(target) {
        const contextHolder = proxyContextHolder.get(target);
        const resolved = contextHolder?.factory();
        if (!resolved) throw new Error(`Trying to Reflect.preventExtensions of ${typeof resolved}`);
        return Reflect.preventExtensions(resolved);
    }
};

/**
 * Lazy proxy that will only call the factory function when needed (when a property is accessed)
 * @param factory Factory function to create the object
 * @param asFunction Mock the proxy as a function
 * @returns A proxy that will call the factory function only when needed
 * @example const ChannelStore = proxyLazy(() => findByProps("getChannelId"));
 */
export function proxyLazy<T, I extends ExemptedEntries>(factory: () => T, opts: LazyOptions<I> = {}): T {
    let cache: T;

    const dummy = opts.hint !== "object" ? function () { } : {};
    const proxyFactory = () => cache ??= factory();

    const proxy = new Proxy(dummy, lazyHandler) as T & I;
    factories.set(proxy, proxyFactory);
    proxyContextHolder.set(dummy, {
        factory: proxyFactory, // Cache references cleanly
        options: opts,
    });

    return proxy;
}

/**
 * Lazily destructure an object with all the properties being lazified. This assumes all the properties are either an object or a function
 * @param factory Factory function which resolves to the object (and caches it)
 * @param asFunction Mock the proxy as a function
 * @example
 *
 * const { uuid4 } = lazyDestructure(() => findByProps("uuid4"))
 * uuid4; // <- is a lazy proxy!
 */
export function lazyDestructure<
    T extends Record<PropertyKey, unknown>,
    I extends ExemptedEntries
>(factory: () => T, opts: LazyOptions<I> = {}): T {
    const proxiedObject = proxyLazy(factory);

    return new Proxy({}, {
        get(_, property) {
            if (property === Symbol.iterator) {
                return function* () {
                    yield proxiedObject;
                    yield new Proxy({}, {
                        get: (_, p) => proxyLazy(() => proxiedObject[p], opts)
                    });
                    throw new Error("This is not a real iterator, this is likely used incorrectly");
                };
            }
            return proxyLazy(() => proxiedObject[property], opts);
        }
    }) as T;
}

export function getProxyFactory<T>(obj: T): (() => T) | void {
    return factories.get(obj) as (() => T) | void;
}
