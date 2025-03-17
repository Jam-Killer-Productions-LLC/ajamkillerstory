import React from "react";

interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
  contract: any; // Replace 'any' with the specific contract type if available
}

const MintNFT: React.FC<MintNFTProps> = ({
  metadataUri,
  narrativePath,
  contract,
}) => {
  // Your component implementation
  return (
    <div>
      <h2>Mint NFT</h2>
      <p>Metadata URI: {metadataUri}</p>
      <p>Narrative Path: {narrativePath}</p>
      {/* You can use the contract prop here as needed */}
    </div>
  );
};

export default MintNFT;
