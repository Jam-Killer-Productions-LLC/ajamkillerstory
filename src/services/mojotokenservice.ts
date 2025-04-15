// src/services/mojoTokenService.ts
import { ethers } from "ethers";

interface MojoTokenRequest {
  address: string;
  mojoScore: number;
  narrativePath: string;
}

/**
 * Service for awarding Mojo tokens after successful NFT mints
 */
export const awardMojoTokensService = async (
  data: MojoTokenRequest,
): Promise<{ txHash: string }> => {
  try {
    const response = await fetch(
      "https://mojotokenrewards.producerprotocol.pro/mint",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
         
        },
        body: JSON.stringify({
          address: data.address,
          mojoScore: data.mojoScore,
          narrativePath: data.narrativePath,
          timestamp: Date.now(),
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const responseData = await response.json();
    console.log(
      "Mojo tokens awarded successfully:",
      responseData,
    );
    return responseData;
  } catch (error) {
    console.error("Error awarding Mojo tokens:", error);
    throw error;
  }
};
