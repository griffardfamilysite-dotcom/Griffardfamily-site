// Netlify/functions/upload-photo.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'Family123$';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body || '{}');
    const { album, password, file } = data;

    if (!album || !file) {
      return { statusCode: 400, body: 'Missing album or file' };
    }
    if (password !== UPLOAD_PASSWORD) {
      return { statusCode: 401, body: 'Unauthorized' };
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return { statusCode: 500, body: 'Server not configured' };
    }

    // Upload into folder FAMILY_GALLERY/<album>
    const folder = `FAMILY_GALLERY/${album}`;

    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto', // accepts images/videos; change to 'image' if you only want images
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        ok: true,
        result: {
          secure_url: result.secure_url,
          public_id: result.public_id,
          folder: result.folder,
          width: result.width,
          height: result.height,
          format: result.format
        }
      })
    };
  } catch (err) {
    console.error('upload-photo error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  }
};
