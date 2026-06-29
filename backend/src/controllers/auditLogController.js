const { supabase } = require('../config/db');

exports.getPatientAccessLogs = async (req, res, next) => {
  try {
    const patientId = req.user.userId;
    
    if (req.user.role !== 'patient') {
       return res.status(403).json({ error: 'Only patients can view their access logs' });
    }

    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        id,
        action,
        created_at,
        metadata,
        doctor:users!user_id ( id, full_name, unique_id )
      `)
      .eq('action', 'RECORD_VIEWED')
      .contains('metadata', { patientId })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    res.json({ logs: data });
  } catch (error) {
    next(error);
  }
};
