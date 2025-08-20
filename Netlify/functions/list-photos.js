// netlify/functions/list-photos.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async (event) => {
  try {
    const root   = process.env.CLOUDINARY_FOLDER_ROOT || 'FAMILY_GALLERY';
    const album  = (event.queryStringParameters?.album || '').trim();
    if (!album) {
      return { statusCode: 400, body: JSON.stringify({ error: 'album is required' }) };
    }

    const max    = Number(event.queryStringParameters?.max_results || 30);
    const cursor = event.queryStringParameters?.cursor;

    // e.g. FAMILY_GALLERY/2025-reunion
    const folder = `${root}/${album}`;

    let search = cloudinary.search
      .expression(`resource_type:image AND folder="${folder}"`)
      .sort_by('created_at','desc')
      .max_results(max);

    if (cursor) search = search.next_cursor(cursor);

    const result = await search.execute();

    return {
      statusCode: 200,
      body: JSON.stringify({
        resources:   result.resources?.map(r => ({
          secure_url: r.secure_url,
          public_id:  r.public_id,
          width:      r.width,
          height:     r.height,
          created_at: r.created_at
        })) || [],
        next_cursor: result.next_cursor || null
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
