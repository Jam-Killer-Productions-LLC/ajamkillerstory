// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS using your worker.

export const uploadMetadata = async (metadata: any, userId: string) => {
  console.log("Starting metadata upload for user:", userId);
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  metadata.name = `${metadata.name || 'NFT'}-${timestamp}`;
  
  try {
    // Direct request to the metadata service
    const response = await fetch("https://metaupload.producerprotocol.pro/upload", {
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
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("IPFS upload failed:", response.status, errorText);
      throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("IPFS upload successful:", data);
    
    return data;
  } catch (error) {
    console.error("Metadata upload error:", error);
    throw error;
  }
};
