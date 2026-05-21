type ExemptedEntries = Record<symbol | string, unknown>;

interface LazyOptions<E extends ExemptedEntries> {
    hint?: "function" | "object";
    exemptedEntries?: E
}

const unconfigurable = new Set(["arguments", "caller", "prototype"]);
const isUnconfigurable = (key: PropertyKey) => typeof key === "string" && unconfigurable.has(key);

const factories = new WeakMap<any,() => any>();

function healHandler(handler: ProxyHandler<any>, resolved: any, opts: LazyOptions<any>) {
    const exemptedEntries = opts.exemptedEntries;

    for (const fnName of Object.getOwnPropertyNames(Reflect).filter(
        n => n !== "apply" && n !== "get" && n !== "has" && n !== "ownKeys" && n !== "getOwnPropertyDescriptor"
    )) {
        (handler as any)[fnName] = (target: any, ...args: any[]) => (Reflect as any)[fnName](resolved, ...args);
    }

    handler.apply = (target, thisArg, args) => {
        if (typeof resolved === "function") {
            return Reflect.apply(resolved, thisArg, args);
        }

        if (window.React) {
            return window.React.createElement(resolved, args[0]);
        }

        throw new Error(`Cannot call ${typeof resolved} as a function`);
    };

    handler.get = (target, p, receiver) => {
        if (__DEV__ && p === "__IS_RAIN_LAZY_PROXY__") return true;
        if (exemptedEntries && p in exemptedEntries) return exemptedEntries[p as string | symbol];
        return Reflect.get(resolved, p, receiver);
    };

    handler.has = (target, p) => {
        if (exemptedEntries && p in exemptedEntries) return true;
        return Reflect.has(resolved, p);
    };

    handler.ownKeys = target => {
        const cacheKeys = Reflect.ownKeys(resolved);
        const keySet = new Set(cacheKeys);
        for (const key of unconfigurable) {
            if (!keySet.has(key)) cacheKeys.push(key);
        }
        return cacheKeys;
    };

    handler.getOwnPropertyDescriptor = (target, p) => {
        if (isUnconfigurable(p)) return Reflect.getOwnPropertyDescriptor(target, p);
        const descriptor = Reflect.getOwnPropertyDescriptor(resolved, p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    };
}

/**
 * Lazy proxy that will only call the factory function when needed (when a property is accessed)
 * @param factory Factory function to create the object
 * @param asFunction Mock the proxy as a function
 * @returns A proxy that will call the factory function only when needed
 * @example const ChannelStore = proxyLazy(() => findByProps("getChannelId"));
 */
export function proxyLazy<T, I extends ExemptedEntries>(factory: () => T, opts: LazyOptions<I> = {}): T {
    let cache: T;
    const resolvedRef = { value: undefined as T | undefined };
    const factoryFn = () => cache ??= factory();

    const dummy = opts.hint !== "object" ? function () { } : {};
    const handler: ProxyHandler<any> = {};
    const exemptedEntries = opts.exemptedEntries;

    for (const fnName of Object.getOwnPropertyNames(Reflect).filter(
        n => n !== "apply" && n !== "get" && n !== "has" && n !== "ownKeys" && n !== "getOwnPropertyDescriptor"
    )) {
        (handler as any)[fnName] = (target: any, ...args: any[]) => {
            if (!resolvedRef.value) {
                resolvedRef.value = factoryFn();
                if (!resolvedRef.value) throw new Error(`Trying to Reflect.${fnName} of ${typeof resolvedRef.value}`);
                healHandler(handler, resolvedRef.value, opts);
            }
            return (Reflect as any)[fnName](resolvedRef.value, ...args);
        };
    }

    handler.apply = (target, thisArg, args) => {
        if (!resolvedRef.value) {
            resolvedRef.value = factoryFn();
            if (!resolvedRef.value) throw new Error(`Trying to call ${typeof resolvedRef.value}`);
            healHandler(handler, resolvedRef.value, opts);
        }
        const resolved = resolvedRef.value;
        if (typeof resolved === "function") {
            return Reflect.apply(resolved, thisArg, args);
        }

        if (window.React) {
            return window.React.createElement(resolved, args[0]);
        }

        throw new Error(`Cannot call ${typeof resolved} as a function`);
    };

    handler.get = (target, p, receiver) => {
        if (__DEV__ && p === "__IS_RAIN_LAZY_PROXY__") return true;

        if (exemptedEntries && p in exemptedEntries) {
            return exemptedEntries[p as string | symbol];
        }

        if (!resolvedRef.value) {
            resolvedRef.value = factoryFn();
            if (!resolvedRef.value) throw new Error(`Trying to Reflect.get of ${typeof resolvedRef.value}`);
            healHandler(handler, resolvedRef.value, opts);
        }
        return Reflect.get(resolvedRef.value, p, receiver);
    };

    handler.has = (target, p) => {
        if (exemptedEntries && p in exemptedEntries) return true;

        if (!resolvedRef.value) {
            resolvedRef.value = factoryFn();
            if (!resolvedRef.value) throw new Error(`Trying to Reflect.has of ${typeof resolvedRef.value}`);
            healHandler(handler, resolvedRef.value, opts);
        }
        return Reflect.has(resolvedRef.value, p);
    };

    handler.ownKeys = target => {
        if (!resolvedRef.value) {
            resolvedRef.value = factoryFn();
            if (!resolvedRef.value) throw new Error(`Trying to Reflect.ownKeys of ${typeof resolvedRef.value}`);
            healHandler(handler, resolvedRef.value, opts);
        }
        const cacheKeys = Reflect.ownKeys(resolvedRef.value);
        const keySet = new Set(cacheKeys);
        for (const key of unconfigurable) {
            if (!keySet.has(key)) cacheKeys.push(key);
        }
        return cacheKeys;
    };

    handler.getOwnPropertyDescriptor = (target, p) => {
        if (isUnconfigurable(p)) return Reflect.getOwnPropertyDescriptor(target, p);

        if (!resolvedRef.value) {
            resolvedRef.value = factoryFn();
            if (!resolvedRef.value) throw new Error(`Trying to getOwnPropertyDescriptor of ${typeof resolvedRef.value}`);
            healHandler(handler, resolvedRef.value, opts);
        }
        const descriptor = Reflect.getOwnPropertyDescriptor(resolvedRef.value, p);
        if (descriptor) Object.defineProperty(target, p, descriptor);
        return descriptor;
    };

    const proxy = new Proxy(dummy, handler) as T & I;
    factories.set(proxy, factoryFn);

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
