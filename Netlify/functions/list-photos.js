// Netlify/functions/list-photos.js
// Lists Cloudinary images for a given album (folder) with pagination.
// Expected query params:
//   album=<slug>         (required)  e.g., 2025-reunion
//   cursor=<optional>    (optional)  pagination cursor from previous response
//   max_results=<num>    (optional)  defaults to 30
//
// Response:
//   { resources: [{ secure_url, public_id, format, width, height }], next_cursor }

const CLOUND_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY     = process.env.CLOUDINARY_API_KEY;
const API_SECRET  = process.env.CLOUDINARY_API_SECRET;

// If you keep your albums inside a parent folder in Cloudinary,
// set it here (or leave blank to search folders exactly matching the album slug)
const BASE_ALBUM_FOLDER = process.env.CLOUDINARY_BASE_FOLDER || ""; // e.g. "family-hub"

const SEARCH_URL = `https://api.cloudinary.com/v1_1/${CLOUND_NAME}/resources/search`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  try {
    // ---- validate input ----
    const params = new URLSearchParams(event.queryStringParameters || {});
    const album = (params.get("album") || "").trim();
    if (!album) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ error: "Missing required query param: album" }),
      };
    }

    const maxResults = Math.min(
      Math.max(parseInt(params.get("max_results") || "30", 10), 1),
      100
    ); // Cloudinary caps at 100
    const nextCursor = params.get("cursor");

    // ---- Build candidate expressions to be flexible with folder layout ----
    // We’ll try these until one returns resources:
    const folderCandidates = [
      // exact album as a top-level folder
      `${album}`,
      // album inside a base folder
      BASE_ALBUM_FOLDER ? `${BASE_ALBUM_FOLDER}/${album}` : null,
      // common alternates (uncomment/add if needed)
      // `gallery/${album}`,
      // `albums/${album}`,
    ].filter(Boolean);

    let found = null;
    let lastError = null;

    for (const folder of folderCandidates) {
      const body = {
        expression: `resource_type:image AND folder="${folder}"`,
        sort_by: [{ public_id: "desc" }], // newest first (public_id includes version)
        max_results: maxResults,
      };
      if (nextCursor) body.next_cursor = nextCursor;

      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        lastError = await res.text().catch(() => res.statusText);
        continue; // try next candidate
      }

      const data = await res.json();

      if (Array.isArray(data.resources) && data.resources.length > 0) {
        found = data;
        break; // success
      } else {
        // If this candidate returned zero but no error, keep trying others.
        // If none produce results, we’ll return an empty resources array.
        found = found || data; // keep last empty-but-ok response
      }
    }

    // If everything failed with errors:
    if (!found && lastError) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        body: JSON.stringify({ error: "Cloudinary search failed", detail: lastError }),
      };
    }

    const payload = found || { resources: [], next_cursor: undefined };

    // Only return the fields the front-end needs
    const resources = (payload.resources || []).map((r) => ({
      secure_url: r.secure_url,
      public_id: r.public_id,
      format: r.format,
      width: r.width,
      height: r.height,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({
        resources,
        next_cursor: payload.next_cursor,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Server error", detail: String(err) }),
    };
  }
};
