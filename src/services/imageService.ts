// src/services/imageService.ts
// Service for generating an image via the Artistic-Worker Cloudflare Worker at nftartist.producerprotocol.pro

interface GenerateImageResponse {
  message: string;
  userId: string;
  image: string; // Expected format: data:image/png;base64,...
}

export const generateImage = async (prompt: string, userId: string): Promise<GenerateImageResponse> => {
  console.log(`Generating image with prompt: "${prompt}" for userId: ${userId}`);
  
  const response = await fetch('https://nftartist.producerprotocol.pro/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, userId }),
  });

  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Image generation failed: ${response.status} - ${errorText}`);
    throw new Error(`Image generation failed: ${errorText}`);
  }

  const data = await response.json() as GenerateImageResponse;
  console.log('Response data:', data);

  if (!data.image) {
    console.error('No image in response:', data);
    throw new Error('Server returned no image');
  }

  return data;
};

// Enhanced version with retry logic and better error handling
export const generateImageWithRetry = async (
  prompt: string, 
  userId: string, 
  maxRetries = 3, 
  timeout = 30000
): Promise<GenerateImageResponse> => {
  console.log(`Generating image with retry. Prompt: "${prompt}" for userId: ${userId}`);
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`Attempt ${retries + 1}/${maxRetries} to generate image`);
      
      const response = await fetch('https://nftartist.producerprotocol.pro/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, userId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Image generation failed: ${response.status} - ${errorText}`);
        throw new Error(`Image generation failed: ${errorText}`);
      }
      
      const data = await response.json() as GenerateImageResponse;
      console.log('Response received with keys:', Object.keys(data));
      
      if (!data.image) {
        console.error('No image in response:', data);
        throw new Error('Server returned no image');
      }
      
      console.log('Image generation successful');
      return data;
    } catch (error) {
      retries++;
      console.error(`Attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        console.error('Maximum retries exceeded');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const backoffTime = 1000 * Math.pow(2, retries);
      console.log(`Waiting ${backoffTime}ms before next attempt`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  throw new Error('Maximum retries exceeded');
};

// Diagnostic test function
export const testImageGeneration = async (): Promise<void> => {
  try {
    // Test with a simple prompt
    const testPrompt = "A simple landscape with mountains";
    const testUserId = "test-user-123";
    
    console.log("Starting test image generation...");
    
    // Log the request details
    console.log("Request details:", {
      url: 'https://nftartist.producerprotocol.pro/generate',
      method: 'POST',
      body: JSON.stringify({ prompt: testPrompt, userId: testUserId })
    });
    
    // Make the request with additional logging
    const response = await fetch('https://nftartist.producerprotocol.pro/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: testPrompt, userId: testUserId }),
    });
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries([...response.headers]));
    
    // Try to get the response as text first to see raw response
    const rawResponse = await response.text();
    console.log("Raw response:", rawResponse.substring(0, 500) + (rawResponse.length > 500 ? "..." : ""));
    
    // Try to parse as JSON if possible
    try {
      const jsonData = JSON.parse(rawResponse);
      console.log("Parsed JSON data keys:", Object.keys(jsonData));
      console.log("Image data exists:", !!jsonData.image);
      if (jsonData.image) {
        console.log("Image data length:", jsonData.image.length);
        console.log("Image data preview:", jsonData.image.substring(0, 100) + "...");
      }
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
    }
    
    console.log("Test completed");
  } catch (error) {
    console.error("Test failed with error:", error);
  }
};
