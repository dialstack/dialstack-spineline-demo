import { useEffect, useState, useCallback } from "react";
import {
  type DialStackInstance,
  loadDialstackAndInitialize,
} from "@dialstack/sdk";

/**
 * Hook to initialize and manage DialStack SDK instance
 *
 * This hook handles:
 * - Fetching the publishable key from the server
 * - Fetching client secrets from the proxy API
 * - Initializing the DialStack SDK instance
 * - Managing instance state
 *
 * The account ID is automatically determined from the authenticated user session.
 *
 * @returns Object containing the DialStack instance and error state
 */
export const useDialstack = () => {
  const [hasError, setHasError] = useState(false);
  const [dialstackInstance, setDialstackInstance] =
    useState<DialStackInstance | null>(null);

  const fetchClientSecret = useCallback(async () => {
    // Fetch the session client secret from our proxy API
    // The server determines the account ID from the authenticated session
    const response = await fetch("/api/dialstack/session", {
      method: "POST",
    });

    if (!response.ok) {
      // Handle errors on the client side here
      const { error } = await response.json();
      console.warn("An error occurred: ", error);
      setHasError(true);
      return undefined;
    } else {
      const { client_secret: clientSecret } = await response.json();
      setHasError(false);
      return clientSecret;
    }
  }, []);

  useEffect(() => {
    if (!dialstackInstance) {
      // Fetch the publishable key from the server, then initialize the SDK
      fetch("/api/dialstack/config")
        .then((res) => res.json())
        .then(({ publishableKey }) => {
          return loadDialstackAndInitialize({
            publishableKey,
            fetchClientSecret: async () => {
              return await fetchClientSecret();
            },
          });
        })
        .then((instance) => {
          setDialstackInstance(instance);
        })
        .catch((error) => {
          console.error("Failed to initialize DialStack:", error);
          setHasError(true);
        });
    }
  }, [dialstackInstance, fetchClientSecret]);

  return {
    hasError,
    dialstackInstance,
  };
};
