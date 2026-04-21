import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts medical data securely using AES-256-GCM.
 * This is used BEFORE uploading the payload to IPFS/Arweave.
 * 
 * @param {Object} data - The medical record JSON
 * @param {string} symmetricKey - 32-byte hex string
 * @returns {Object} Encrypted payload with iv and authTag
 */
export function encryptMedicalData(data, symmetricKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(symmetricKey, 'hex'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag
  };
}

/**
 * Decrypts medical data retrieved from IPFS/Arweave.
 * 
 * @param {Object} encryptedPayload - { iv, encryptedData, authTag }
 * @param {string} symmetricKey - 32-byte hex string
 * @returns {Object} Decrypted medical record JSON
 */
export function decryptMedicalData(encryptedPayload, symmetricKey) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(symmetricKey, 'hex'), 
    Buffer.from(encryptedPayload.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedPayload.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

/**
 * MOCK: Proxy Re-Encryption (PRE) Engine (e.g., NuCypher / Lit Protocol)
 * In production, the AES symmetric key is encrypted with the Patient's Public Key.
 * The Patient generates a "Re-encryption Key" and sends it to the Lit network.
 * The Doctor requests the network to re-encrypt the symmetric key to the Doctor's Public Key.
 */
export class PRE_Engine {
  /**
   * Encrypt the AES key so only the patient can initially access it.
   */
  static encryptKeyForPatient(symmetricKey, patientPublicKey) {
    // Uses ECC (e.g., ECIES) to encrypt the symmetric key
    // Implementation relies on lit-js-sdk or nucypher
    console.log("PRE: Encrypting symmetric key for Patient DID");
    return Buffer.from(`EncryptedKey[${symmetricKey}]`).toString('base64');
  }

  /**
   * Generate delegation key for network to transform patient cipher to doctor cipher.
   */
  static delegateAccess(patientPrivateKey, doctorPublicKey) {
    console.log("PRE: Generating Re-Encryption Key for Doctor");
    return `ReEncryptionKey_${doctorPublicKey.substring(0, 8)}`;
  }

  /**
   * Doctor uses the PRE network to decrypt the AES key using their private key.
   */
  static decryptKeyAsDoctor(encryptedSymmetricKey, reEncryptionKey, doctorPrivateKey) {
    console.log("PRE: Network re-encrypting and decrypting for Doctor");
    // Extracts original symmetric key
    const decoded = Buffer.from(encryptedSymmetricKey, 'base64').toString('utf8');
    const match = decoded.match(/EncryptedKey\[(.*?)\]/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error("PRE Decryption Failed");
  }
}
