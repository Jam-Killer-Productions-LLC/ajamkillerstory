// narrativeService.ts
const WORKER_URL = 'https://narratives.producerprotocol.pro';

export async function updateNarrative(userId: string, answer: string) {
  try {
    console.log(`Updating narrative for ${userId} with answer: "${answer}"`);
    
    const response = await fetch(`${WORKER_URL}/narrative/update/${userId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ answer }),
    });
    
    // For debugging
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', responseText);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      console.error('Server returned error:', response.status, responseData);
      throw new Error(responseData.error || `Failed to update narrative: ${response.status} - ${responseText}`);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error updating narrative:', error);
    throw error;
  }
}

export async function finalizeNarrative(userId: string) {
  try {
    console.log(`Finalizing narrative for ${userId}`);
    
    const response = await fetch(`${WORKER_URL}/narrative/finalize/${userId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'omit'
    });
    
    // For debugging
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Finalize narrative error:', response.status, responseText);
      throw new Error(`Failed to finalize narrative: ${response.status} - ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse finalize response as JSON:', responseText);
      throw new Error(`Invalid JSON response from finalize: ${responseText}`);
    }
    
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
      console.error('Invalid narrative format:', responseData);
      throw new Error('Invalid response format from narrative finalization');
    }

    return responseData;
  } catch (error) {
    console.error('Error finalizing narrative:', error);
    throw error;
  }
}
