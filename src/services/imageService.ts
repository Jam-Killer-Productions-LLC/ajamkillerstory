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
    return null;
  }
};

// Delete existing image if needed
export const deleteExistingImage = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Deleting existing image for user: ${userId}`);
    const response = await fetch(`https://nftartist.producerprotocol.pro/image/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Delete image response status: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error('Error deleting existing image:', error);
    return false;
  }
};

export const generateImage = async (prompt: string, userId: string, forceNew = false): Promise<GenerateImageResponse> => {
  console.log(`Generating image with prompt: "${prompt}" for userId: ${userId}`);
  
  // Check if we need to delete existing image first or use existing one
  if (forceNew) {
    console.log('Force new image requested, deleting existing image if any');
    await deleteExistingImage(userId);
  } else {
    // Check for existing image
    console.log('Checking for existing image');
    const existingImage = await checkExistingImage(userId);
    if (existingImage && existingImage.image) {
      console.log('Found existing image, returning it');
      return existingImage;
    }
  }
  
  console.log('Generating new image');
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

  const data = await response.json();
  console.log('Response data:', data);

  // Handle different response formats
  if (!data.image && data.error) {
    throw new Error(`Image generation failed: ${data.error}`);
  }

  return data as GenerateImageResponse;
};

// Enhanced version with retry logic
export const generateImageWithRetry = async (
  prompt: string, 
  userId: string, 
  forceNew = false, 
  maxRetries = 3
): Promise<GenerateImageResponse> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${maxRetries} to generate image`);
      const result = await generateImage(prompt, userId, forceNew);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('Failed to generate image after multiple attempts');
};
