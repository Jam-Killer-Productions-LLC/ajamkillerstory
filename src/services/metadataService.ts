// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS via Cloudflare Worker

interface UploadResponse {
  success: boolean;
  uri?: string;
  message?: string;
  error?: string;
  warning?: string;
}

/**
 * Uploads metadata to IPFS via Cloudflare Worker that uses QuickNode's S3 API
 * @param metadata - The NFT metadata to upload
 * @param userId - User identifier for tracking uploads
 * @returns Promise with IPFS response including URI
 */
export const uploadMetadata = async (metadata: any, userId: string): Promise<UploadResponse> => {
  console.log("Starting metadata upload for user:", userId);
  console.log("Metadata to upload:", JSON.stringify(metadata).substring(0, 200) + "...");
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  metadata.name = `${metadata.name || 'NFT'}-${timestamp}`;
  
  try {
    console.log(`Making request to worker at https://mojohand.producerprotocol.pro/upload`);
    console.log(`Request payload size: ${JSON.stringify({ metadata, userId, timestamp }).length} bytes`);
    
    // Direct request to the metadata service worker - this goes to your /upload endpoint
    const response = await fetch("https://mojohand.producerprotocol.pro/upload", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": window.location.origin
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({ 
        metadata, 
        userId,
        timestamp 
      }),
    });
    
    console.log(`Worker response status: ${response.status}`);
    
    if (!response.ok) {
      // Try to get error text from response
      let errorText = "";
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = "Could not read error response";
      }
      
      console.error(`IPFS upload failed: Status ${response.status}, Error: ${errorText}`);
      throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
    }
    
    // Parse the response
    let data;
    try {
      const responseText = await response.text();
      console.log("Worker response text:", responseText.substring(0, 200) + (responseText.length > 200 ? "..." : ""));
      
      try {
        data = JSON.parse(responseText);
        console.log("Parsed worker response:", data);
      } catch (parseError) {
        console.error("Failed to parse worker response as JSON:", parseError);
        throw new Error("Invalid JSON response from worker");
      }
    } catch (textError) {
      console.error("Failed to read response text:", textError);
      throw new Error("Failed to read response from worker");
    }
    
    // Validate the response
    if (!data) {
      console.error("Worker returned empty response");
      throw new Error("Empty response from worker");
    }
    
    // Check if we have a valid URI
    if (data.uri) {
      console.log("IPFS upload successful. URI:", data.uri);
      return {
        success: true,
        uri: data.uri,
        message: data.message || "Upload successful"
      };
    } 
    
    // If we have success but no URI, this is strange, log it
    if (data.success && !data.uri) {
      console.warn("Worker returned success but no URI:", data);
      throw new Error("Worker returned success but no URI");
    }
    
    // If we get here, something went wrong
    console.error("Unexpected worker response format:", data);
    throw new Error(data.error || "Unknown error from worker");
    
  } catch (error) {
    console.error("Metadata upload error:", error);
    
    // Return an error response so the app can continue
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      warning: "Failed to upload to IPFS. Using fallback.",
      uri: generateFallbackUri(userId)
    };
  }
};

/**
 * Generate a fallback URI for development/testing
 * This ensures the app doesn't crash even if IPFS upload fails
 */
function generateFallbackUri(userId: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  return `ipfs://QmFallback${timestamp}${randomId}${userId.substring(0, 6)}`;
}
