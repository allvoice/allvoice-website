import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import createContextHook from "typesafe-context-hook";
import { api } from "~/utils/api";
import crypto from "crypto";

function createId() {
  const array = new Uint8Array(32); // 256 bits (32 bytes) of randomness
  if (typeof window !== "undefined") {
    window.crypto.getRandomValues(array);
  } else {
    crypto.getRandomValues(array);
  }
  const base64String = btoa(array as unknown as string);
  return base64String;
}

export const { useAllvoiceUser, AllvoiceUserProvider } = createContextHook(
  "AllvoiceUser",
  () => {
    const clerk = useUser();
    const [tempUserId, setTempUserId] = useState<string | null>(() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("tempUserId");
      }
      return null;
    });

    useEffect(() => {
      if (typeof window !== "undefined" && tempUserId === null) {
        const newTempUserId = createId();
        localStorage.setItem("tempUserId", newTempUserId);
        setTempUserId(newTempUserId);
      }
    }, [tempUserId]);

    useEffect(() => {
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === "tempUserId") {
          setTempUserId(event.newValue);
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const user = api.users.syncUser.useQuery(
      { clerkIsSignedIn: clerk.isSignedIn },
      {
        enabled: tempUserId != null && clerk.isSignedIn != null,
      },
    );

    return {
      user,
    };
  },
);
