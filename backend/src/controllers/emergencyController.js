const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const Delegate = require('../models/Delegate');

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
      
      const delegatedPatientIds = await Delegate.getPatientsForDelegate(userId);
      for (const pid of delegatedPatientIds) {
        const delReqs = await EmergencyRequest.findByPatient(pid);
        // Add a flag to indicate these are delegated requests
        requests = requests.concat(delReqs.map(r => ({ ...r, isDelegated: true })));
      }
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

    // Patient or Delegate can approve/reject/revoke
    let isAuthorized = false;
    if (role === 'patient') {
      if (request.patient_id === userId) {
        isAuthorized = true;
      } else {
        const delegatedPatientIds = await Delegate.getPatientsForDelegate(userId);
        if (delegatedPatientIds.includes(request.patient_id)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let expiresAt = null;
    if (status === 'approved') {
      const { expiresInHours } = req.body;
      if (expiresInHours !== undefined) {
        if (expiresInHours === 0) {
          expiresAt = null; // Permanent
        } else {
          const expiry = new Date();
          expiry.setHours(expiry.getHours() + parseInt(expiresInHours));
          expiresAt = expiry.toISOString();
        }
      } else {
        // Default to 24 hours if not specified
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        expiresAt = expiry.toISOString();
      }
    }

    const updatedRequest = await EmergencyRequest.updateStatus(id, status, expiresAt);

    res.json({ message: `Emergency request ${status}`, request: updatedRequest });
  } catch (error) {
    next(error);
  }
};
