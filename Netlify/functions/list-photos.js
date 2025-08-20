// netlify/functions/list-photos.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || '');
    const album = params.get('album') || '2025-reunion';
    const maxResults = parseInt(params.get('max_results') || '30', 10);
    const nextCursor = params.get('cursor') || undefined;

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Missing Cloudinary environment variables.');
    }

    // Look under the Cloudinary folder FAMILY_GALLERY/<album>
    const res = await cloudinary.search
      .expression(`folder=FAMILY_GALLERY/${album}`)
      .with_field('context')
      .max_results(maxResults)
      .next_cursor(nextCursor)
      .execute();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        resources: (res.resources || []).map(r => ({
          secure_url: r.secure_url,
          public_id: r.public_id,
          folder: r.folder,
          width: r.width,
          height: r.height,
          format: r.format
        })),
        next_cursor: res.next_cursor || null
      })
    };
  } catch (err) {
    console.error('list-photos error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  }
};
