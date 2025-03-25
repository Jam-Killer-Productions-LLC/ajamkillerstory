// narrativeService.ts
const WORKER_URL = 'https://narratives.producerprotocol.pro';

export async function updateNarrative(userId: string, answer: string) {
  try {
    const response = await fetch(`${WORKER_URL}/narrative/update/${userId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ answer }),
    });
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `Failed to update narrative: ${response.status}`);
    }
    return responseData;
  } catch (error) {
    console.error('Error updating narrative:', error);
    throw error;
  }
}

export async function finalizeNarrative(userId: string) {
  try {
    const response = await fetch(`${WORKER_URL}/narrative/finalize/${userId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `Failed to finalize narrative: ${response.status}`);
    }

    // Handle the raw response format we're getting from the logs
    if (responseData.response) {
      return {
        data: {
          narrativeText: responseData.response
        }
      };
    }

    return responseData;
  } catch (error) {
    console.error('Error finalizing narrative:', error);
    throw error;
  }
}
