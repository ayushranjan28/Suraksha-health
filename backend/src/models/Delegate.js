const { supabase } = require('../config/db');

class Delegate {
  static async addDelegate(patientId, delegateId, contactNumber = null) {
    const { data, error } = await supabase
      .from('user_delegates')
      .insert({
        patient_id: patientId,
        delegate_id: delegateId,
        contact_number: contactNumber
      })
      .select(`
        id,
        contact_number,
        delegate:users!delegate_id(id, full_name, email, unique_id)
      `)
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('This user is already a delegate');
      throw new Error(`Failed to add delegate: ${error.message}`);
    }
    return data;
  }

  static async removeDelegate(id, patientId) {
    const { data, error } = await supabase
      .from('user_delegates')
      .delete()
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single();

    if (error) throw new Error(`Failed to remove delegate: ${error.message}`);
    return data;
  }

  static async getDelegates(patientId) {
    const { data, error } = await supabase
      .from('user_delegates')
      .select(`
        id,
        contact_number,
        delegate:users!delegate_id(id, full_name, email, unique_id)
      `)
      .eq('patient_id', patientId);

    if (error) throw new Error(`Failed to get delegates: ${error.message}`);
    return data;
  }
  
  static async getPatientsForDelegate(delegateId) {
    const { data, error } = await supabase
      .from('user_delegates')
      .select(`
        patient_id
      `)
      .eq('delegate_id', delegateId);
      
    if (error) throw new Error(`Failed to get patients for delegate: ${error.message}`);
    return data.map(d => d.patient_id);
  }
}

module.exports = Delegate;
