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
 * Uploads metadata to IPFS via Cloudflare Worker
 * @param metadata - The NFT metadata to upload
 * @param userId - User identifier for tracking uploads
 * @returns Promise with IPFS response including URI
 */
export const uploadMetadata = async (metadata: any, userId: string): Promise<UploadResponse> => {
  console.log("Starting metadata upload for user:", userId);
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  metadata.name = `${metadata.name || 'NFT'}-${timestamp}`;
  
  try {
    console.log("Sending metadata to worker for IPFS upload");
    
    // The worker expects metadata and userId
    const response = await fetch("https://mojohand.producerprotocol.pro/upload", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        metadata,
        userId,
        timestamp
      }),
    });
    
    console.log("Worker response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("IPFS upload failed:", response.status, errorText);
      
      // Return an error response with fallback URI
      return {
        success: false,
        error: `IPFS upload failed: ${response.status}`,
        uri: generateFallbackUri(userId),
        warning: "Using fallback URI due to upload failure"
      };
    }
    
    // Parse the response
    try {
      const data = await response.json();
      console.log("IPFS upload response data:", data);
      
      // Check if we have a URI in the response
      if (data.uri) {
        return {
          success: true,
          uri: data.uri,
          message: data.message || "Upload successful",
          warning: data.warning // Pass through any warnings from the worker
        };
      } else if (data.success) {
        // Success but no URI for some reason
        console.warn("Worker returned success but no URI");
        return {
          success: true,
          uri: generateFallbackUri(userId),
          message: "Upload successful but URI was missing",
          warning: "Using fallback URI - worker did not return a valid IPFS URI"
        };
      } else {
        // Something went wrong
        console.error("Worker did not return success");
        return {
          success: false,
          error: data.error || "Unknown error",
          uri: generateFallbackUri(userId),
          warning: "Using fallback URI due to worker error"
        };
      }
    } catch (parseError) {
      console.error("Error parsing worker response:", parseError);
      return {
        success: false,
        error: "Failed to parse worker response",
        uri: generateFallbackUri(userId),
        warning: "Using fallback URI due to response parsing error"
      };
    }
  } catch (error) {
    console.error("Network error during upload:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      uri: generateFallbackUri(userId),
      warning: "Using fallback URI due to network error"
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
