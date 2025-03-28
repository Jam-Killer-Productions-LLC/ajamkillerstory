// src/services/metadataService.ts
// Service for uploading NFT metadata to IPFS using your worker.

export const uploadMetadata = async (metadata: any, userId: string) => {
    console.log("Uploading metadata to IPFS for user:", userId);
    try {
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
        
        // Get the full response as text first for debugging
        const responseText = await response.text();
        console.log("Raw IPFS upload response:", responseText);
        
        if (!response.ok) {
            console.error(`Metadata upload failed with status: ${response.status}`);
            throw new Error(`Metadata upload failed: ${response.status} - ${responseText}`);
        }
        
        // Try to parse as JSON
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
            console.log("Parsed IPFS upload response:", jsonResponse);
            
            // If response doesn't have a uri field but has other fields that might contain the URI
            if (!jsonResponse.uri) {
                // Check for common alternative field names
                for (const field of ['url', 'ipfsUri', 'metadataUri', 'ipfs', 'hash', 'cid']) {
                    if (jsonResponse[field]) {
                        console.log(`Found URI in alternative field '${field}': ${jsonResponse[field]}`);
                        // Create a normalized response with the required uri field
                        return {
                            uri: jsonResponse[field],
                            originalResponse: jsonResponse
                        };
                    }
                }
                
                // If we've found a path to the uri nested deeper
                if (jsonResponse.data && jsonResponse.data.uri) {
                    console.log(`Found URI in nested field 'data.uri': ${jsonResponse.data.uri}`);
                    return {
                        uri: jsonResponse.data.uri,
                        originalResponse: jsonResponse
                    };
                }
                
                console.error("No URI found in response:", jsonResponse);
            }
            
            return jsonResponse;
        } catch (parseError) {
            console.error("Failed to parse response as JSON:", responseText, parseError);
            
            // If the response is an IPFS hash directly
            if (responseText.trim().startsWith('ipfs://') || responseText.trim().match(/^[a-zA-Z0-9]{46}$/)) {
                console.log("Response appears to be a direct IPFS URI:", responseText.trim());
                return { uri: responseText.trim() };
            }
            
            throw new Error(`Invalid JSON response from metadata upload: ${responseText}`);
        }
    } catch (error) {
        console.error("Error uploading metadata:", error);
        throw error;
    }
};
