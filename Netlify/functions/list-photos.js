const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const album = params.get('album') || '2025-reunion';
    const maxResults = parseInt(params.get('max_results') || '30', 10);
    const nextCursor = params.get('cursor') || undefined;

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Missing Cloudinary environment variables.');
    }

    // List resources inside FAMILY_GALLERY/<album>
    const res = await cloudinary.search
      .expression(`folder=FAMILY_GALLERY/${album}`)
      .with_field('context')
      .max_results(maxResults)
      .next_cursor(nextCursor)
      .execute();

    const payload = {
      resources: (res.resources || []).map(r => ({
        secure_url: r.secure_url,
        public_id: r.public_id,
        folder: r.folder,
        width: r.width,
        height: r.height,
        format: r.format
      })),
      next_cursor: res.next_cursor || null
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    // Log for Netlify Function logs
    console.error('list-photos error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  }
};


    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
