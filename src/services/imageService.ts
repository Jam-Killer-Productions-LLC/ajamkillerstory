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