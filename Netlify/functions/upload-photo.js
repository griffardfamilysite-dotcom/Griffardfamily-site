// Netlify/functions/upload-photo.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'Family123$';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body || '{}');
    const { album, password, file } = data;

// Add this log
console.log("UPLOAD DEBUG: album =", album);

}    if (password !== UPLOAD_PASSWORD) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
    if (!album || !file) {
      return { statusCode: 400, body: 'Missing album or file' };
    }

    // Put file in FAMILY_GALLERY/<album>
    const folder = `FAMILY_GALLERY/${album}`;

    const res = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'image',
      overwrite: false,
      use_filename: true
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        result: { secure_url: res.secure_url, public_id: res.public_id, folder: res.folder }
      })
    };
  } catch (err) {
    console.error('upload-photo error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
