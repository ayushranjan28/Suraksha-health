const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profile = await PatientProfile.findByUserId(userId);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const profileData = req.body;
    const profile = await PatientProfile.upsert(userId, profileData);
    res.json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    next(error);
  }
};

// For doctors to view a patient's profile during emergency or cross-verification
exports.getPatientProfileByDoctor = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { patientName } = req.query;
    // Basic cross-verification
    if (patientName) {
      const patient = await User.findById(patientId);
      if (!patient || patient.full_name.toLowerCase() !== patientName.toLowerCase()) {
        return res.status(403).json({ error: 'Cross-verification failed' });
      }
    } else {
      // Allow if there's active access, or we just rely on previous checks.
      // But for simplicity, we allow doctors to see the profile if cross verification succeeds
      return res.status(403).json({ error: 'Patient name required for cross-verification' });
    }

    const profile = await PatientProfile.findByUserId(patientId);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
};
