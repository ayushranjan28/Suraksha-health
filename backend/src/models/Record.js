const { supabase } = require('../config/db');

class Record {
  /**
   * Create a new health record
   * @param {Object} params
   * @param {string} params.patientId
   * @param {string} params.doctorId
   * @param {string} params.title
   * @param {string} params.content
   */
  static async create({ patientId, doctorId, title, content }) {
    const { data, error } = await supabase
      .from('health_records')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        title,
        content
      })
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email)
      `)
      .single();

    if (error) throw new Error(`Record.create failed: ${error.message}`);
    return data;
  }

  /**
   * Find records for a specific patient
   * @param {string} patientId
   */
  static async findByPatient(patientId) {
    const { data, error } = await supabase
      .from('health_records')
      .select(`
        *,
        doctor:users!doctor_id(id, full_name, email)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Record.findByPatient failed: ${error.message}`);
    return data;
  }

  /**
   * Find a single record by ID
   * @param {string} id
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('health_records')
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Record.findById failed: ${error.message}`);
    }
    return data;
  }
}

module.exports = Record;
