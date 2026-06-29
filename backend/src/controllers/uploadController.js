const { supabase } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const originalName = file.originalname;
    const fileExt = originalName.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const bucketName = 'medical_records';

    // Check if bucket exists, if not, create it
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    const bucketExists = buckets.find(b => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    res.status(200).json({
      message: 'File uploaded successfully',
      url: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
};
