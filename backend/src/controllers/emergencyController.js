const User = require('../models/User');
const Delegate = require('../models/Delegate');
const AuditLog = require('../models/AuditLog');
const { sendEmergencyNotificationEmail } = require('../services/emailService');
const { supabase } = require('../config/db');

exports.declareEmergency = async (req, res, next) => {
  try {
    const { patientId, reason } = req.body;
    const doctorId = req.user.userId;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can declare an emergency' });
    }

    const patient = await User.findByIdOrUniqueId(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const actualPatientId = patient.id;

    // Get doctor info for the email
    const doctor = await User.findById(doctorId);
    const doctorName = doctor ? doctor.full_name : 'Unknown';
    const doctorContact = doctor ? doctor.email : 'N/A';

    // Grant 2 hours of access
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 2);
    
    const { data: request, error } = await supabase
      .from('emergency_requests')
      .insert({
        patient_id: actualPatientId,
        doctor_id: doctorId,
        reason: reason || 'Life-Threatening Emergency',
        status: 'approved',
        expires_at: expiry.toISOString()
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    await AuditLog.create({
      userId: doctorId,
      action: 'LIFE_THREATENING_OVERRIDE', // Keep the action name for continuity, or rename to EMERGENCY_DECLARED
      metadata: { patientId: actualPatientId, reason, requestId: request.id }
    });

    // Notify Delegates
    let delegates = [];
    try {
      delegates = await Delegate.getDelegates(actualPatientId);
      
      // Dispatch emails asynchronously
      for (const d of delegates) {
        if (d.delegate && d.delegate.email) {
          sendEmergencyNotificationEmail(
            d.delegate.email,
            d.delegate.full_name,
            patient.full_name,
            doctorName,
            doctorContact
          ).catch(e => console.error('Failed to send emergency email to delegate:', e));
        }
      }
    } catch (delegateError) {
      console.error('Error fetching/notifying delegates:', delegateError);
    }

    res.status(201).json({ 
      message: 'Emergency declared. Access granted and delegates notified.', 
      request,
      delegates
    });
  } catch (error) {
    next(error);
  }
};
