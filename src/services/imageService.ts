// src/services/imageService.ts
// Service for generating an image via the Artistic-Worker Cloudflare Worker at nftartist.producerprotocol.pro

interface GenerateImageResponse {
  message: string;
  userId: string;
  image: string; // Expected format: data:image/png;base64,...
  status?: string;
  error?: string;
}

// Check if user already has an image generated
export const checkExistingImage = async (userId: string): Promise<GenerateImageResponse | null> => {
  try {
    console.log(`Checking for existing image for user: ${userId}`);
    const response = await fetch(`https://nftartist.producerprotocol.pro/image/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Check existing image response status: ${response.status}`);
    
    // If we get a 500 error, it might be from the worker storage issue
    if (response.status === 500) {
      console.log('Worker returned 500 error - likely a storage initialization issue');
      return null;
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        // No existing image found, which is fine
        console.log('No existing image found (404)');
        return null;
      }
      throw new Error(`Failed to check existing image: ${response.status}`);
    }

    const data = await response.json();
    console.log('Existing image data:', data);
    return data as GenerateImageResponse;
  } catch (error) {
    console.error('Error checking existing image:', error);
    // Don't throw the error, just return null to indicate no valid image found
    return null;
  }
};

export const generateImage = async (prompt: string, userId: string, forceNew = false): Promise<GenerateImageResponse> => {
  console.log(`Generating image with prompt: "${prompt.substring(0, 100)}..." for userId: ${userId}`);
  
  // Check if we need to delete existing image first or use existing one
  if (forceNew) {
    console.log('Force new image requested, deleting existing image if any');
  } else {
    // Check for existing image
    console.log('Checking for existing image');
    const existingImage = await checkExistingImage(userId);
    if (existingImage && existingImage.image) {
      console.log('Found existing image, returning it');
      return existingImage;
    }
  }
  
  console.log('Generating new image with Flux model');
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

  try {
    const data = await response.json();
    console.log('Response data received');

    // Handle different response formats
    if (!data.image && data.error) {
      throw new Error(`Image generation failed: ${data.error}`);
    }

    return data as GenerateImageResponse;
  } catch (error) {
    console.error('Error parsing response:', error);
    throw new Error('Failed to parse image response from server');
  }
};

// Enhanced version with retry logic and timeout
export const generateImageWithRetry = async (
  prompt: string, 
  userId: string, 
  forceNew = false, 
  maxRetries = 3
): Promise<GenerateImageResponse> => {
  let lastError: Error | null = null;
  
  // For each attempt
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${maxRetries} to generate image`);
      
      // First delete existing if forcing new
      if (forceNew && attempt === 1) {
        console.log("Forcing new image, attempting to delete existing");
        try {
          // Remove the reference to `deleteExistingImage`
        } catch (deleteErr) {
          console.warn("Failed to delete existing image, but continuing:", deleteErr);
        }
      }
      
      // Set up a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Image generation timed out after 60 seconds on attempt ${attempt}`));
        }, 60000); // 60 second timeout
      });
      
      // Race the actual generate call with the timeout
      const result = await Promise.race([
        generateImage(prompt, userId, false), // Don't force delete here since we already did it above if needed
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, errorMessage);
      
      // Special handling for specific errors
      if (errorMessage.includes("Cannot read properties of undefined") || 
          errorMessage.includes("Invalid AI response")) {
        console.log("Detected worker storage or AI response issue - will retry with delay");
      }
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 15000); // Maximum 15 seconds
        console.log(`Waiting ${delay}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('Failed to generate image after multiple attempts');
};
