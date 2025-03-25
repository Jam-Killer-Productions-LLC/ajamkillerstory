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
        'Accept': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'omit'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to finalize narrative: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Finalize response:', responseData);

    // Handle the raw response format we're getting from the logs
    if (responseData.response) {
      return {
        data: {
          narrativeText: responseData.response
        }
      };
    }

    // If we don't have the expected format, throw an error
    if (!responseData.data || !responseData.data.narrativeText) {
      throw new Error('Invalid response format from narrative finalization');
    }

    return responseData;
  } catch (error) {
    console.error('Error finalizing narrative:', error);
    throw error;
  }
}
