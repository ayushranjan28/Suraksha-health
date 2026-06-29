const { supabase } = require('../config/db');

class PatientProfile {
  static async upsert(userId, profileData) {
    const { bloodGroup, allergies, pastAccidents, trauma, otherInfo } = profileData;
    
    const { data, error } = await supabase
      .from('patient_profiles')
      .upsert({
        user_id: userId,
        blood_group: bloodGroup,
        allergies: allergies,
        past_accidents: pastAccidents,
        trauma: trauma,
        other_info: otherInfo,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) throw new Error(`PatientProfile.upsert failed: ${error.message}`);
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`PatientProfile.findByUserId failed: ${error.message}`);
    }
    return data;
  }
}

module.exports = PatientProfile;
