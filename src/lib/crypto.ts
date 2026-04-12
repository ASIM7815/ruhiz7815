// Client-side only — Web Crypto API (RSA-OAEP + AES-GCM hybrid encryption)

const RSA_ALGORITHM: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const AES_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH = 256;

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_ALGORITHM, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportPublicKeyAsJWK(
  key: CryptoKey
): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicKeyFromJWK(
  jwk: JsonWebKey
): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, RSA_ALGORITHM, true, [
    "encrypt",
  ]);
}

export interface EncryptedPayload {
  encryptedContent: string;
  encryptedKeySender: string;
  encryptedKeyRecipient: string;
  iv: string;
}

export async function encryptMessage(
  plaintext: string,
  recipientPubKey: CryptoKey,
  senderPubKey: CryptoKey
): Promise<EncryptedPayload> {
  // Generate random AES-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true, // extractable so we can wrap it with RSA
    ["encrypt", "decrypt"]
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the plaintext with AES-GCM
  const encoded = new TextEncoder().encode(plaintext);
  const encryptedContent = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    encoded
  );

  // Export the AES key as raw bytes
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES key with recipient's RSA public key
  const encryptedKeyRecipient = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPubKey,
    rawAesKey
  );

  // Encrypt AES key with sender's RSA public key (so sender can also decrypt)
  const encryptedKeySender = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPubKey,
    rawAesKey
  );

  return {
    encryptedContent: toBase64(encryptedContent),
    encryptedKeySender: toBase64(encryptedKeySender),
    encryptedKeyRecipient: toBase64(encryptedKeyRecipient),
    iv: toBase64(iv.buffer),
  };
}

export async function decryptMessage(
  encryptedContentB64: string,
  encryptedKeyB64: string,
  ivB64: string,
  privateKey: CryptoKey
): Promise<string> {
  // Decrypt the AES key using RSA private key
  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(encryptedKeyB64)
  );

  // Import the raw AES key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: AES_ALGORITHM },
    false,
    ["decrypt"]
  );

  // Decrypt the content
  const iv = fromBase64(ivB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    fromBase64(encryptedContentB64)
  );

  return new TextDecoder().decode(decrypted);
}
