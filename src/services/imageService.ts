// src/services/imageService.ts
// Service for generating an image via your Artistic-Worker Cloudflare Worker.

export const generateImage = async (prompt: string, userId: string) => {
    const response = await fetch(
      "https://artistic-worker.fletcher-christians-account3359.workers.dev/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userId }),
      }
    );
    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`);
    }
    return response.json();
  };