// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS using your worker.

export const uploadMetadata = async (metadata: any, userId: string, retries = 3) => {
    let lastError: Error | null = null;
    
    // Log the metadata we're trying to upload
    console.log('Uploading metadata to IPFS:', {
        name: metadata.name,
        description: metadata.description?.substring(0, 100) + '...',
        imageLength: metadata.image?.length || 0,
        attributes: metadata.attributes
    });
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`IPFS upload attempt ${attempt + 1} of ${retries}`);
            
            // Verify that the image data is properly formatted
            if (!metadata.image) {
                throw new Error('No image data provided in metadata');
            }
            
            if (typeof metadata.image !== 'string') {
                throw new Error('Image data must be a string');
            }
            
            if (!metadata.image.startsWith('data:image/') && !metadata.image.startsWith('ipfs://') && !metadata.image.startsWith('https://')) {
                throw new Error('Image data must be a valid data URI, IPFS URI, or HTTPS URL');
            }
            
            const response = await fetch(
                "https://metaupload.producerprotocol.pro/upload",
                {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ 
                        metadata, 
                        userId,
                        apiKey: process.env.IPFS_API_KEY || '' // Optional API key if needed
                    }),
                    // Add a longer timeout for IPFS upload
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                }
            );
            
            // Handle non-OK responses
            if (!response.ok) {
                let errorText;
                try {
                    const errorJson = await response.json();
                    errorText = errorJson.error || `HTTP error ${response.status}`;
                } catch {
                    errorText = await response.text();
                }
                throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
            }
            
            // Parse the response
            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse IPFS upload response:', responseText);
                throw new Error(`Invalid JSON response from IPFS upload: ${responseText.substring(0, 100)}...`);
            }
            
            // Validate the response data
            if (!data.uri || typeof data.uri !== 'string' || !data.uri.startsWith('ipfs://')) {
                console.error('Invalid IPFS URI in response:', data);
                throw new Error(`Invalid IPFS URI returned: ${JSON.stringify(data)}`);
            }
            
            console.log('Successfully uploaded metadata to IPFS:', data.uri);
            return data;
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`IPFS upload attempt ${attempt + 1} failed:`, lastError.message);
            
            // If we have more retries, wait before trying again
            if (attempt < retries - 1) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`Waiting ${delay}ms before retrying...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error('Failed to upload metadata to IPFS after multiple attempts');
};
