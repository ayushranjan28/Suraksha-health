const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');

exports.createRequest = async (req, res, next) => {
  try {
    const { patientId, reason } = req.body;
    const doctorId = req.user.userId;

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const request = await EmergencyRequest.create({
      patientId,
      doctorId,
      reason
    });

    res.status(201).json({ message: 'Emergency access requested', request });
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    let requests = [];
    if (role === 'patient') {
      requests = await EmergencyRequest.findByPatient(userId);
    } else if (role === 'doctor') {
      requests = await EmergencyRequest.findByDoctor(userId);
    }

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;

    if (!['approved', 'rejected', 'revoked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await EmergencyRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Emergency request not found' });
    }

    // Only patient can approve/reject/revoke
    if (role !== 'patient' || request.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let expiresAt = null;
    if (status === 'approved') {
      // Set expiration to 24 hours from now
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      expiresAt = expiry.toISOString();
    }

    const updatedRequest = await EmergencyRequest.updateStatus(id, status, expiresAt);

    res.json({ message: `Emergency request ${status}`, request: updatedRequest });
  } catch (error) {
    next(error);
  }
};
