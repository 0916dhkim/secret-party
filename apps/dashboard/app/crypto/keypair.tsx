export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

export async function serializeKeyPair(keyPair: CryptoKeyPair) {
  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  return {
    publicKey: Buffer.from(publicKeyBuffer).toString("base64"),
    privateKey: Buffer.from(privateKeyBuffer).toString("base64"),
  };
}

export async function deserializePublicKey(base64: string) {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    Buffer.from(base64, "base64"),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  return publicKey;
}

export async function deserializePrivateKey(base64: string) {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(base64, "base64"),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );

  return privateKey;
}

export async function deserializeKeyPair(
  publicKeyBase64: string,
  privateKeyBase64: string
) {
  const publicKey = await deserializePublicKey(publicKeyBase64);
  const privateKey = await deserializePrivateKey(privateKeyBase64);

  return { publicKey, privateKey };
}

export async function encryptWithPublicKey(
  data: BufferSource,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
}

export async function decryptWithPrivateKey(
  encryptedData: BufferSource,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedData
  );
}

