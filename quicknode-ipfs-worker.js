/**
 * QuickNode IPFS Upload Worker
 * 
 * This Cloudflare Worker handles IPFS uploads using QuickNode's API.
 * It expects the QuickNode API key in the X-QuickNode-Key header.
 */

// Configuration
const QUICKNODE_API_ENDPOINT = 'https://api.quicknode.com/ipfs/rest/v1/pin';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-QuickNode-Key',
};

// Handle OPTIONS preflight requests
function handleOptions(request) {
  return new Response(null, {
    headers: CORS_HEADERS,
    status: 204,
  });
}

// Handle error responses
function errorResponse(message, status = 500) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

// Main worker event handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Main request handler function
 */
async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed. Please use POST.', 405);
  }

  try {
    // Get QuickNode API key from request header
    const apiKey = request.headers.get('X-QuickNode-Key');
    if (!apiKey) {
      return errorResponse('Missing QuickNode API key in X-QuickNode-Key header', 400);
    }

    // Get request body
    const contentType = request.headers.get('Content-Type') || '';
    let metadata;
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      metadata = body.metadata;
      
      if (!metadata) {
        return errorResponse('Missing metadata in request body', 400);
      }
      
      // Add timestamp and user info if available
      if (body.userId) {
        metadata.userId = body.userId;
      }
      if (body.timestamp) {
        metadata.timestamp = body.timestamp;
      }
    } else {
      return errorResponse('Unsupported content type. Please use application/json', 415);
    }

    // Convert metadata to JSON
    const metadataBlob = JSON.stringify(metadata);
    
    // Create form data for QuickNode API
    const formData = new FormData();
    const blob = new Blob([metadataBlob], { type: 'application/json' });
    formData.append('file', blob, 'metadata.json');

    // Send request to QuickNode
    const quicknodeResponse = await fetch(QUICKNODE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        // Don't set Content-Type as it will be set automatically with FormData
      },
      body: formData,
    });

    // Handle QuickNode response
    if (!quicknodeResponse.ok) {
      const errorText = await quicknodeResponse.text();
      console.error('QuickNode upload failed:', quicknodeResponse.status, errorText);
      return errorResponse(`QuickNode upload failed: ${errorText}`, quicknodeResponse.status);
    }

    // Process successful response
    const data = await quicknodeResponse.json();
    console.log('QuickNode upload successful:', data);
    
    // Return formatted response with IPFS CID/URI
    return new Response(
      JSON.stringify({
        success: true,
        cid: data.cid,
        uri: `ipfs://${data.cid}`,
        message: 'Upload successful',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error('Worker error:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
} 