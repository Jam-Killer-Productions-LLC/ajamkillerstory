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

    // First try to parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Finalize response parsed:', responseData);
    } catch (parseError) {
      console.error('Failed to parse finalize response as JSON:', responseText);
      
      // If we can't parse the JSON but have text, use it directly
      if (responseText && typeof responseText === 'string' && responseText.length > 10) {
        return {
          data: {
            narrativeText: responseText.substring(0, 2000)
          }
        };
      }
      throw new Error(`Invalid JSON response from finalize: ${responseText}`);
    }
    
    // Handle the exact format seen in the logs:
    // {"response":"In the ravaged streets of...", "usage":{...}}
    if (responseData && typeof responseData.response === 'string') {
      console.log('Found response field in response data - using it directly');
      return {
        data: {
          narrativeText: responseData.response
        }
      };
    }
    
    // Handle legacy format with data.narrativeText
    if (responseData.data && responseData.data.narrativeText) {
      return responseData;
    }
    
    // Try to extract any usable text from various fields
    for (const field of ['text', 'content', 'message', 'narrative']) {
      if (responseData[field] && typeof responseData[field] === 'string') {
        return {
          data: {
            narrativeText: responseData[field]
          }
        };
      }
    }
    
    // If we still don't have something usable
    console.error('Could not extract narrative text from response:', responseData);
    throw new Error('Could not extract narrative text from response');
  } catch (error) {
    console.error('Error finalizing narrative:', error);
    throw error;
  }
}
