// src/components/MintNFT.tsx
import React, { useState } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
} from "@thirdweb-dev/react";
import { BigNumber } from "ethers";
import { Buffer } from "buffer";
import "./MintNFT.css";

const NFT_CONTRACT_ADDRESS = "0x60b1Aed47EDA9f1E7E72b42A584bAEc7aFbd539B";

const NFT_OPTIONS = {
  A: {
    image:
      "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
    name: "The Noise Police Neighbor",
    description:
      "Your uptight neighbor with a decibel meter and a vendetta against fun.",
  },
  B: {
    image:
      "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
    name: "The Mean Girlfriend",
    description: "She says your music is 'too loud' and 'embarrassing'.",
  },
  C: {
    image:
      "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
    name: "The Jerk Bar Owner",
    description: "He cut your set short for 'being too experimental'.",
  },
} as const;

type NFTChoice = keyof typeof NFT_OPTIONS;

const MintNFT: React.FC = () => {
  const address = useAddress();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS);
  const { mutateAsync: mint } = useContractWrite(contract, "mint");
  const { data: mintFee } = useContractRead(contract, "mintFee");

  const [selected, setSelected] = useState<NFTChoice | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    if (!selected || !address || !mintFee) return;

    try {
      setIsMinting(true);
      setError(null);

      const metadata = {
        name: `Don't Kill the Jam: ${NFT_OPTIONS[selected].name}`,
        description: NFT_OPTIONS[selected].description,
        image: NFT_OPTIONS[selected].image,
      };

      const tokenURI = `data:application/json;base64,${Buffer.from(
        JSON.stringify(metadata)
      ).toString("base64")}`;

      await mint({
        args: [address, tokenURI, 5, "Canoe"], // 5 = mojoScore
        overrides: { value: BigNumber.from(mintFee) },
      });

      setSelected(null);
    } catch (err: any) {
      setError(err?.reason || err?.message || "Failed to mint NFT");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="mint-nft-container">
      {error && <div className="error-message">{error}</div>}

      {!selected ? (
        <div className="nft-options">
          <h3>Select an NFT</h3>
          {Object.entries(NFT_OPTIONS).map(([key, opt]) => (
            <div
              key={key}
              onClick={() => setSelected(key as NFTChoice)}
              className="nft-option"
            >
              <img src={opt.image} alt={opt.name} />
              <h4>{opt.name}</h4>
            </div>
          ))}
        </div>
      ) : (
        <div className="selected-nft">
          <img
            src={NFT_OPTIONS[selected].image}
            alt={NFT_OPTIONS[selected].name}
          />
          <h4>{NFT_OPTIONS[selected].name}</h4>
          <p>{NFT_OPTIONS[selected].description}</p>
          <button
            className="mint-button"
            onClick={handleMint}
            disabled={isMinting}
          >
            {isMinting ? "Minting..." : "Mint NFT"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MintNFT;
