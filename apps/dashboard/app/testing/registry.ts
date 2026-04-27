/**
 * The window.app testing registry
 * 
 * Provides a Proxy-wrapped registry for test harnesses to interact with the app.
 * Supports dynamic registration of page APIs and provides descriptive errors
 * when accessing unmounted or unregistered pages.
 */

import type { WindowApp } from "./registry.types";

/**
 * Initialize the window.app testing registry
 * 
 * Should be called once in the root component (during React render, not before)
 * to set up the global window.app object with the Proxy wrapper.
 * 
 * Once initialized, components can call useRegisterPageApi() to register themselves.
 */
export function initializeRegistry() {
  if (typeof window === "undefined") {
    return; // SSR context, skip initialization
  }

  // Initialize the raw registry object if it doesn't exist
  if (!window._appRegistry) {
    window._appRegistry = {} as Record<string, any>;
  }

  // Wrap it in a Proxy to provide descriptive errors and type safety
  if (!window.app) {
    window.app = createRegistryProxy();
  }
}

/**
 * Create the Proxy wrapper for the registry
 * 
 * Intercepts property access and provides helpful error messages when
 * accessing unmounted pages or undefined methods.
 */
function createRegistryProxy(): WindowApp {
  return new Proxy({} as WindowApp, {
    get(target, prop: string | symbol) {
      // Allow reflection
      if (prop === Symbol.toStringTag) {
        return "WindowApp";
      }

      // Check if the property exists in the raw registry
      const registry = window._appRegistry as Record<string, any>;
      const value = registry[prop as string];

      if (value === undefined) {
        // Provide a helpful error message for unmounted pages
        throw new Error(
          `window.app.${String(prop)} is not mounted. ` +
          `This usually means the page component hasn't rendered yet, ` +
          `or the component forgot to call useRegisterPageApi(). ` +
          `Available: ${Object.keys(registry).join(", ") || "none"}`
        );
      }

      return value;
    },

    set(target, prop: string | symbol, value: any) {
      // Direct assignment to the raw registry
      const registry = window._appRegistry as Record<string, any>;
      registry[prop as string] = value;
      return true;
    },

    has(target, prop: string | symbol) {
      const registry = window._appRegistry as Record<string, any>;
      return (prop as string) in registry;
    },

    ownKeys(target) {
      const registry = window._appRegistry as Record<string, any>;
      return Object.keys(registry);
    },

    getOwnPropertyDescriptor(target, prop: string | symbol) {
      const registry = window._appRegistry as Record<string, any>;
      if ((prop as string) in registry) {
        return { configurable: true, enumerable: true, value: registry[prop as string] };
      }
      return undefined;
    },
  });
}

/**
 * Register a page API in the window.app registry
 * 
 * Internal function used by useRegisterPageApi hook.
 * Stores the API object under the given key.
 * 
 * @param key - The key to register under (e.g. "projectListPage")
 * @param api - The API object to register
 * 
 * @example
 * registerPageApi("projectListPage", {
 *   isReady: () => true,
 *   getVisibleProjectIds: () => [...],
 * });
 */
export function registerPageApi(key: string, api: any) {
  if (typeof window === "undefined") {
    return; // SSR context, skip
  }

  if (!window._appRegistry) {
    window._appRegistry = {};
  }

  window._appRegistry[key] = api;
}

/**
 * Unregister a page API from the window.app registry
 * 
 * Internal function used by useRegisterPageApi hook cleanup.
 * Removes the API object from the registry.
 * 
 * @param key - The key to unregister
 * 
 * @example
 * unregisterPageApi("projectListPage");
 */
export function unregisterPageApi(key: string) {
  if (typeof window === "undefined") {
    return; // SSR context, skip
  }

  if (window._appRegistry) {
    delete window._appRegistry[key];
  }
}

/**
 * Augment the Window interface to include the raw registry
 * (internal, not part of the public testing API)
 */
declare global {
  interface Window {
    _appRegistry?: Record<string, any>;
  }
}
