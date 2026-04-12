"use client";

import { useEffect, useState, useRef } from "react";
import {
  generateKeyPair,
  exportPublicKeyAsJWK,
} from "@/lib/crypto";
import { storeKeyPair, getKeyPair } from "@/lib/keystore";

export function useEncryptionKeys() {
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      // Check if keys already exist in IndexedDB
      const existing = await getKeyPair();
      if (existing) {
        setPublicKey(existing.publicKey);
        setPrivateKey(existing.privateKey);
        setIsReady(true);
        return;
      }

      // Generate new keys
      setIsGenerating(true);
      const keyPair = await generateKeyPair();

      // Store in IndexedDB
      await storeKeyPair(keyPair.publicKey, keyPair.privateKey);

      // Upload public key to server
      const jwk = await exportPublicKeyAsJWK(keyPair.publicKey);
      await fetch("/api/user/me/public-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: jwk }),
      });

      setPublicKey(keyPair.publicKey);
      setPrivateKey(keyPair.privateKey);
      setIsGenerating(false);
      setIsReady(true);
    }

    init();
  }, []);

  return { publicKey, privateKey, isReady, isGenerating };
}
