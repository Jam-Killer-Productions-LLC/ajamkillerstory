// src/services/imageService.ts
// Service for generating an image via the Artistic-Worker Cloudflare Worker at nftartist.producerprotocol.pro

interface GenerateImageResponse {
  message: string;
  userId: string;
  image: string; // Expected format: data:image/png;base64,...
  status?: string;
}

// Check if user already has an image generated
export const checkExistingImage = async (userId: string): Promise<GenerateImageResponse | null> => {
  try {
    const response = await fetch(`https://nftartist.producerprotocol.pro/image/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No existing image found, which is fine
        return null;
      }
      throw new Error(`Failed to check existing image: ${response.status}`);
    }

    return await response.json() as GenerateImageResponse;
  } catch (error) {
    console.error('Error checking existing image:', error);
    return null;
  }
};

// Delete existing image if needed
export const deleteExistingImage = async (userId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://nftartist.producerprotocol.pro/image/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
  timeout = 30000,
  forceNew = false
): Promise<GenerateImageResponse> => {
  console.log(`Generating image with retry. Prompt: "${prompt}" for userId: ${userId}`);
  
  // Check for existing image first if not forcing new
  if (!forceNew) {
    const existingImage = await checkExistingImage(userId);
    if (existingImage && existingImage.image) {
      console.log('Found existing image, returning it');
      return existingImage;
    }
  } else {
    // Delete existing image if forcing new
    await deleteExistingImage(userId);
  }
  
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
