// src/services/narrativeService.ts
// Service for calling narrative endpoints from your Cloudflare Worker.

export const updateNarrative = async (userId: string, answer: string) => {
    const response = await fetch(`/narrative/update/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });
    if (!response.ok) {
      throw new Error(`Error updating narrative: ${response.statusText}`);
    }
    return response.json();
  };
  
  export const finalizeNarrative = async (userId: string) => {
    const response = await fetch(`/narrative/finalize/${userId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error finalizing narrative: ${response.statusText}`);
    }
    return response.json();
  };