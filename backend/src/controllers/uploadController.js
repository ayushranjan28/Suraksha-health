const { supabase } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const pinataJWT = process.env.PINATA_JWT;
    
    let publicUrl = '';
    
    if (pinataJWT) {
      // ── IPFS Storage via Pinata ──────────────────────────
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      
      const pinataMetadata = JSON.stringify({ name: file.originalname });
      formData.append('pinataMetadata', pinataMetadata);

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${pinataJWT}`
        }
      });
      
      const cid = response.data.IpfsHash;
      publicUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    } else {
      // ── Fallback to Supabase Storage ─────────────────────
      const originalName = file.originalname;
      const fileExt = originalName.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const bucketName = 'medical_records';

      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(b => b.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
        
      publicUrl = publicUrlData.publicUrl;
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      url: publicUrl
    });
  } catch (error) {
    console.error('Upload error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to upload file', details: error.message });
  }
};
