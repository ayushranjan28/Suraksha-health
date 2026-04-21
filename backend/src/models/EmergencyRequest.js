const { supabase } = require('../config/db');

class EmergencyRequest {
  static async create({ patientId, doctorId, reason }) {
    const { data, error } = await supabase
      .from('emergency_requests')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        reason,
        status: 'pending'
      })
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email)
      `)
      .single();

    if (error) throw new Error(`EmergencyRequest.create failed: ${error.message}`);
    return data;
  }

  static async updateStatus(id, status, expiresAt = null) {
    const payload = { status };
    if (expiresAt) payload.expires_at = expiresAt;

    const { data, error } = await supabase
      .from('emergency_requests')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error(`Emergency request ${id} not found.`);
      throw new Error(`EmergencyRequest.updateStatus failed: ${error.message}`);
    }
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`EmergencyRequest.findById failed: ${error.message}`);
    }
    return data;
  }

  static async findByPatient(patientId) {
    const { data, error } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        doctor:users!doctor_id(id, full_name, email)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`EmergencyRequest.findByPatient failed: ${error.message}`);
    return data;
  }

  static async findByDoctor(doctorId) {
    const { data, error } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        patient:users!patient_id(id, full_name, email)
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`EmergencyRequest.findByDoctor failed: ${error.message}`);
    return data;
  }

  /**
   * Check if an active emergency access exists between a doctor and patient
   */
  static async hasActiveAccess(patientId, doctorId) {
    const { data, error } = await supabase
      .from('emergency_requests')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('status', 'approved')
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) throw new Error(`EmergencyRequest.hasActiveAccess failed: ${error.message}`);
    return data && data.length > 0;
  }
}

module.exports = EmergencyRequest;
