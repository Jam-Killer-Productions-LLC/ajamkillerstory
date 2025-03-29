import { withdrawContractFunds, mintNFTAsOwner } from './contractOwner';

// If this is used in a Node.js environment (like Express)
// You would set up routes like:
//
// app.post('/api/withdraw', async (req, res) => {
//   const result = await withdrawContractFunds();
//   res.json(result);
// });
//
// app.post('/api/mint', async (req, res) => {
//   const { address, narrativePath, mojoScore, narrative } = req.body;
//   const result = await mintNFTAsOwner(address, narrativePath, mojoScore, narrative);
//   res.json(result);
// });

// For serverless environments (like Cloudflare Workers), you would export handlers:
export async function handleWithdraw(request: Request): Promise<Response> {
  // Authenticate the request - VERY IMPORTANT!
  // Only proceed if this is an authenticated admin request
  
  const result = await withdrawContractFunds();
  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export async function handleMint(request: Request): Promise<Response> {
  // Authenticate the request - VERY IMPORTANT!
  // Only proceed if this is an authenticated request
  
  const body = await request.json();
  const { address, narrativePath, mojoScore, narrative } = body;
  
  const result = await mintNFTAsOwner(address, narrativePath, mojoScore, narrative);
  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Export all functions for use in your app or API routes
export { withdrawContractFunds, mintNFTAsOwner }; 