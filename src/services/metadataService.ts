// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS using your worker.

export const uploadMetadata = async (metadata: any, userId: string) => {
    const response = await fetch(
      "https://metaupload.producerprotocol.pro/upload",
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ metadata, userId }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
};
