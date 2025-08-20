// netlify/functions/upload-photo.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const OK_PASSWORD = process.env.UPLOAD_PASSWORD || 'Family123$';

export default async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return { statusCode: 400, body: 'Expected JSON body' };
    }

    const { album, file, password } = JSON.parse(event.body || '{}');
    if (!album || !file) return { statusCode: 400, body: 'album and file are required' };
    if (password !== OK_PASSWORD) return { statusCode: 401, body: 'Invalid password' };

    const root   = process.env.CLOUDINARY_FOLDER_ROOT || 'FAMILY_GALLERY';
    const folder = `${root}/${album.trim()}`;

    // file can be a data: URL (base64) or a remote URL
    const result = await cloudinary.uploader.upload(file, {
      folder,
      overwrite: false,
      resource_type: 'image',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        secure_url: result.secure_url,
        public_id:  result.public_id
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};

