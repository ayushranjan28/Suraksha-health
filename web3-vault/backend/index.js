import { HealthDataVaultOrchestrator } from './api.js';
import { ABHAIntegration } from './abha_integration.js';

async function runDataLifecycle() {
  console.log("=========================================================");
  console.log("   🏥 INITIALIZING DECENTRALIZED HEALTH DATA VAULT 🏥   ");
  console.log("=========================================================\n");

  const patientDID = "did:ethr:0xPatientAddress123";
  const doctorDID = "did:ethr:0xDoctorAddress456";
  const patientPublicKey = "patient_pub_key_xyz";
  const patientPrivateKey = "patient_priv_key_xyz";
  const doctorPublicKey = "doctor_pub_key_xyz";
  const doctorPrivateKey = "doctor_priv_key_xyz";

  // 1. Setup & Integration (ABHA)
  console.log("--- 1. SETTING UP IDENTITY & ABHA ---");
  const txnId = await ABHAIntegration.requestOTP("ayush@abdm");
  const vc = await ABHAIntegration.verifyAndLink(txnId.txnId, "123456", patientDID);
  console.log("Verified Credential Generated:", JSON.stringify(vc, null, 2));
  console.log("-------------------------------------\n");

  const medicalRecord = {
    patientName: "Ayush",
    condition: "Hypertension",
    prescriptions: ["Lisinopril 10mg"],
    timestamp: new Date().toISOString()
  };

  try {
    // 2. Issuance & Storage
    const { recordId, cid, encryptedSymmetricKey } = await HealthDataVaultOrchestrator.issueAndStoreRecord(
      patientDID,
      doctorDID,
      medicalRecord,
      patientPublicKey
    );

    // 3. Sharing
    const reEncryptionKey = await HealthDataVaultOrchestrator.shareRecord(
      patientDID,
      doctorDID,
      patientPrivateKey,
      doctorPublicKey
    );

    // 4. Verification & Decryption
    const decryptedRecord = await HealthDataVaultOrchestrator.fetchAndDecryptRecord(
      cid,
      encryptedSymmetricKey,
      reEncryptionKey,
      doctorPrivateKey
    );

    console.log("Final Decrypted Output:");
    console.log(JSON.stringify(decryptedRecord, null, 2));

  } catch (err) {
    console.error("Lifecycle failed:", err);
  }
}

runDataLifecycle();
