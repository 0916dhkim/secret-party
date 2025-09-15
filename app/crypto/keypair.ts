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

  const publicKeyPEM = bufferToPEM(publicKeyBuffer, "PUBLIC KEY");
  const privateKeyPEM = bufferToPEM(privateKeyBuffer, "PRIVATE KEY");

  return {
    publicKey: publicKeyPEM,
    privateKey: privateKeyPEM,
  };
}

export async function deserializeKeyPair(
  publicKeyPEM: string,
  privateKeyPEM: string
) {
  const publicKeyBuffer = pemToBuffer(publicKeyPEM, "PUBLIC KEY");
  const privateKeyBuffer = pemToBuffer(privateKeyPEM, "PRIVATE KEY");

  const publicKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );

  return { publicKey, privateKey };
}

export async function encryptWithPublicKey(
  data: ArrayBuffer | Uint8Array,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
}

export async function decryptWithPrivateKey(
  encryptedData: ArrayBuffer | Uint8Array,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedData
  );
}

function bufferToPEM(buffer: ArrayBuffer, type: string): string {
  const base64 = Buffer.from(buffer).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`;
}

function pemToBuffer(pem: string, type: string) {
  // Remove the PEM headers and footers, including any surrounding whitespace
  const base64 = pem
    .replace(`-----BEGIN ${type}-----`, "")
    .replace(`-----END ${type}-----`, "")
    .replace(/\s/g, "");

  return Buffer.from(base64, "base64");
}
