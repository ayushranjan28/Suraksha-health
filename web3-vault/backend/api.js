import { encryptMedicalData, decryptMedicalData, PRE_Engine } from '../crypto/crypto_engine.js';
import { StorageService } from './storage_service.js';
import crypto from 'crypto';

// In production, ethers.js is used to interact with Polygon.
// import { ethers } from 'ethers';

/**
 * MOCK: Smart Contract API wrapper
 */
class HealthVaultContract {
  static async addRecordOnChain(patientDID, recordId, cid, arTxId) {
    console.log(`[Smart Contract] Anchoring record ${recordId} for DID ${patientDID}`);
    console.log(`[Smart Contract] IPFS CID: ${cid} | Arweave: ${arTxId}`);
    // return contract.addRecord(patientAddress, recordId, cid, arTxId);
  }

  static async grantConsentOnChain(patientDID, doctorDID) {
    console.log(`[Smart Contract] Consent granted from ${patientDID} to ${doctorDID}`);
  }
}

/**
 * Core Orchestrator for the Data Lifecycle
 */
export class HealthDataVaultOrchestrator {
  
  /**
   * ISSUANCE & STORAGE: Generates record, encrypts it, uploads to IPFS/Arweave, anchors on-chain.
   */
  static async issueAndStoreRecord(patientDID, doctorDID, medicalRecordJson, patientPublicKey) {
    console.log("\n--- STARTING ISSUANCE & STORAGE LIFECYCLE ---");
    
    // 1. Generate unique record ID and secure symmetric key
    const recordId = crypto.randomUUID();
    const symmetricKey = crypto.randomBytes(32).toString('hex'); // K
    
    // 2. Encrypt medical data with AES-256
    const encryptedPayload = encryptMedicalData(medicalRecordJson, symmetricKey);
    
    // 3. Encrypt symmetric key with Patient's public key (PRE)
    const encryptedSymmetricKey = PRE_Engine.encryptKeyForPatient(symmetricKey, patientPublicKey);

    // 4. Upload to decentralized storage
    const { cid, arTxId } = await StorageService.storeRecord({
      payload: encryptedPayload,
      encryptedKey: encryptedSymmetricKey
    });

    // 5. Anchor on Polygon
    await HealthVaultContract.addRecordOnChain(patientDID, recordId, cid, arTxId);

    console.log("--- ISSUANCE COMPLETE ---\n");
    return { recordId, cid, encryptedSymmetricKey };
  }

  /**
   * SHARING: Patient delegates access to a Doctor via PRE and on-chain consent.
   */
  static async shareRecord(patientDID, doctorDID, patientPrivateKey, doctorPublicKey) {
    console.log("\n--- STARTING SHARING LIFECYCLE ---");

    // 1. Grant on-chain consent so the doctor can read the CID
    await HealthVaultContract.grantConsentOnChain(patientDID, doctorDID);

    // 2. Delegate re-encryption key to the PRE network
    const reEncryptionKey = PRE_Engine.delegateAccess(patientPrivateKey, doctorPublicKey);
    
    // Store reEncryptionKey securely (e.g., in Lit Protocol nodes)
    console.log("--- SHARING COMPLETE ---\n");
    return reEncryptionKey;
  }

  /**
   * VERIFICATION: Doctor fetches CID, uses PRE to get AES key, and decrypts record.
   */
  static async fetchAndDecryptRecord(cid, encryptedSymmetricKey, reEncryptionKey, doctorPrivateKey) {
    console.log("\n--- STARTING VERIFICATION LIFECYCLE ---");

    // 1. Doctor retrieves encrypted payload from IPFS
    const retrievedPayloadWrapper = await StorageService.retrieveFromIPFS(cid);

    // 2. Network re-encrypts the symmetric key for the doctor, who then decrypts it
    const decryptedSymmetricKey = PRE_Engine.decryptKeyAsDoctor(
      encryptedSymmetricKey, 
      reEncryptionKey, 
      doctorPrivateKey
    );

    // 3. Doctor decrypts the actual medical record
    const medicalRecord = decryptMedicalData(retrievedPayloadWrapper, decryptedSymmetricKey);
    
    console.log("SUCCESS: Record fully decrypted by Doctor");
    console.log("--- VERIFICATION COMPLETE ---\n");

    return medicalRecord;
  }
}
