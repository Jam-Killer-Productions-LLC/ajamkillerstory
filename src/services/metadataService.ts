// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS using your worker.

export const uploadMetadata = async (metadata: any, userId: string) => {
    const response = await fetch(
      "https://dont-kill-the-jammer.fletcher-christians-account3359.workers.dev/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata, userId }),
      }
    );
    if (!response.ok) {
      throw new Error(`Metadata upload failed: ${response.statusText}`);
    }
    return response.json();
  };