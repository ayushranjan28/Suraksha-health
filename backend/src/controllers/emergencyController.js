const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const Delegate = require('../models/Delegate');
const AuditLog = require('../models/AuditLog');
const { getDistanceInMeters } = require('../utils/geo');

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

exports.overrideRequest = async (req, res, next) => {
  try {
    const { patientId, reason, lat, lng } = req.body;
    const doctorId = req.user.userId;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can use emergency override' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location coordinates required for override' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const hospitalLat = parseFloat(process.env.HOSPITAL_LAT || 0);
    const hospitalLng = parseFloat(process.env.HOSPITAL_LNG || 0);
    const maxRadius = parseFloat(process.env.ALLOWED_RADIUS_METERS || 500);

    const distance = getDistanceInMeters(lat, lng, hospitalLat, hospitalLng);

    if (distance > maxRadius) {
      await AuditLog.create({
        userId: doctorId,
        action: 'FAILED_OVERRIDE_ATTEMPT',
        metadata: { patientId, reason, lat, lng, distance, error: 'Outside hospital zone' }
      });
      return res.status(403).json({ error: `You are too far from the registered hospital zone (Distance: ${Math.round(distance)}m). Override denied.` });
    }

    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 2);
    
    const { data: request, error } = await require('../config/db').supabase
      .from('emergency_requests')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        reason,
        status: 'approved',
        expires_at: expiry.toISOString()
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    await AuditLog.create({
      userId: doctorId,
      action: 'LIFE_THREATENING_OVERRIDE',
      metadata: { patientId, reason, lat, lng, distance, requestId: request.id }
    });

    res.status(201).json({ message: 'Emergency override granted for 2 hours', request });
  } catch (error) {
    next(error);
  }
};
