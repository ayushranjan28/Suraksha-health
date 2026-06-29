const Record = require('../models/Record');
const EmergencyRequest = require('../models/EmergencyRequest');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.createRecord = async (req, res, next) => {
  try {
    const { patientId, title, content, fileUrls, previousDoctorId, previousDoctorName } = req.body;
    const doctorId = req.user.userId;

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const record = await Record.create({
      patientId,
      doctorId,
      title,
      content,
      fileUrls,
      previousDoctorId,
      previousDoctorName
    });

    res.status(201).json({ message: 'Record created successfully', record });
  } catch (error) {
    next(error);
  }
};

exports.getRecords = async (req, res, next) => {
  try {
    const { userId, role } = req.user;

    let records = [];
    if (role === 'patient') {
      records = await Record.findByPatient(userId);
    } else if (role === 'doctor') {
      // Doctor can only see records of patients they have active emergency access to
      // or records they have created themselves.
      // For simplicity, we fetch records for a specific patient if patientId is provided in query
      const { patientId, patientName } = req.query;
      if (patientId) {
        let hasAccess = false;

        if (patientName) {
          // Cross-verification: Doctor provided UUID and Name
          const patient = await User.findById(patientId);
          if (patient && patient.full_name.toLowerCase() === patientName.toLowerCase()) {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          hasAccess = await EmergencyRequest.hasActiveAccess(patientId, userId);
        }

        if (!hasAccess) {
          return res.status(403).json({ error: 'No active emergency access to this patient and cross-verification failed' });
        }
        records = await Record.findByPatient(patientId);
        
        // Log this access
        await AuditLog.create({
          userId,
          action: 'RECORD_VIEWED',
          metadata: { patientId }
        });
      } else {
        return res.status(400).json({ error: 'patientId query parameter is required for doctors to view records' });
      }
    }

    res.json({ records });
  } catch (error) {
    next(error);
  }
};

exports.getRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const record = await Record.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (role === 'patient' && record.patient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (role === 'doctor' && record.doctor_id !== userId) {
      let hasAccess = false;
      const { patientName } = req.query;

      if (patientName) {
        const patient = await User.findById(record.patient_id);
        if (patient && patient.full_name.toLowerCase() === patientName.toLowerCase()) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        hasAccess = await EmergencyRequest.hasActiveAccess(record.patient_id, userId);
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. No active emergency access and cross-verification failed.' });
      }

      // Log this access
      await AuditLog.create({
        userId,
        action: 'RECORD_VIEWED',
        metadata: { patientId: record.patient_id, recordId: record.id }
      });
    }

    res.json({ record });
  } catch (error) {
    next(error);
  }
};
