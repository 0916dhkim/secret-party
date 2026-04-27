/**
 * React hook for registering page APIs with the window.app testing registry
 * 
 * Components use this hook to expose their test interface to the testing harness.
 * The API is registered when the component mounts and cleaned up when it unmounts.
 * 
 * @example
 * function ProjectListPage() {
 *   const formRef = useRef<HTMLFormElement>(null);
 *   const [isCreatingProject, setIsCreatingProject] = useState(false);
 * 
 *   useRegisterPageApi("projectListPage", {
 *     isReady: () => !!formRef.current,
 *     getVisibleProjectIds: () => [...],
 *     pressProjectItem: ({ id }) => {
 *       const element = document.querySelector(`[data-project-id="${id}"] button`);
 *       if (element instanceof HTMLButtonElement) {
 *         element.click();
 *       }
 *     },
 *     // ... more methods
 *   });
 * 
 *   return (
 *     <form ref={formRef}>
 *       (content goes here)
 *     </form>
 *   );
 * }
 */

import { useEffect } from "react";
import { registerPageApi, unregisterPageApi } from "./registry";

/**
 * Register a page API with the window.app testing registry
 * 
 * The API object should contain methods that the test harness can call.
 * The API is automatically cleaned up when the component unmounts.
 * 
 * @param key - The key to register under (e.g. "projectListPage")
 * @param api - The API object containing test methods
 * 
 * Type-safe: TypeScript will enforce that the API object matches
 * the corresponding interface in WindowApp (e.g. ProjectListPageApi).
 * 
 * @example
 * useRegisterPageApi("projectListPage", {
 *   isReady: () => true,
 *   getVisibleProjectIds: () => ["id-1", "id-2"],
 *   pressProjectItem: ({ id }) => { ... },
 * });
 */
export function useRegisterPageApi<K extends keyof import("./registry.types").WindowApp>(
  key: K,
  api: import("./registry.types").WindowApp[K]
): void {
  useEffect(() => {
    // Register the API when the component mounts
    registerPageApi(key as string, api);

    // Clean up when the component unmounts
    return () => {
      unregisterPageApi(key as string);
    };
  }, [key, api]);
}
