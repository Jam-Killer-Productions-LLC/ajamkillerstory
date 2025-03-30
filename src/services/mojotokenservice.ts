// src/services/mojoTokenService.ts
interface MojoTokenRequest {
  address: string;
  mojoScore: number;
  narrativePath: string;
}

export const awardMojoTokens = async (data: MojoTokenRequest): Promise<{txHash: string}> => {
  try {
    const response = await fetch('https://mojotokenrewards.producerprotocol.pro/mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error awarding tokens:", error);
    throw error;
  }
};
