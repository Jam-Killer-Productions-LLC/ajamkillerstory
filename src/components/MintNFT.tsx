// src/components/MintNFT.tsx
import React, { useState, useEffect, useCallback, FC } from "react";
import { useAddress, useNetwork, useContract } from "@thirdweb-dev/react";
import { ethers } from "ethers";

const NFT_CONTRACT_ADDRESS = "0x914B1339944D48236738424e2dBDBB72A212B2F5";
const OPTIMISM_CHAIN_ID = 10;

const NFT_OPTIONS = {
  A: {
    image: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
    name: "The Noise Police Neighbor",
    description: "Your uptight neighbor with a decibel meter and a vendetta against fun.",
  },
  B: {
    image: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
    name: "The Mean Girlfriend",
    description: "She says your music is 'too loud' and 'embarrassing'.",
  },
  C: {
    image: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
    name: "The Jerk Bar Owner",
    description: "He cut your set short for 'being too experimental'.",
  },
} as const;

type NFTChoice = keyof typeof NFT_OPTIONS;

function createMetadataURI(meta: any): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(meta)).toString("base64")}`;
}

const MintNFT: FC = () => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS);
  const [selected, setSelected] = useState<NFTChoice|null>(null);
  const [fee, setFee] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState<"idle"|"pending"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [onOpt, setOnOpt] = useState(false);
  const [netErr, setNetErr] = useState("");

  // fetch fee
  useEffect(() => {
    if (!contract) return;
    contract.call("mintFee")
      .then((f: any) => setFee(ethers.utils.formatEther(f)))
      .catch(console.error);
  }, [contract]);

  // check chain
  useEffect(() => {
    if (!address || !(window as any).ethereum) return;
    (window as any).ethereum.request({ method: "eth_chainId" })
      .then((hex:string) => {
        const id = parseInt(hex,16);
        setOnOpt(id===OPTIMISM_CHAIN_ID);
        setNetErr(id===OPTIMISM_CHAIN_ID? "": "Switch to Optimism");
      })
      .catch(()=> setNetErr("Can't verify network"));
  }, [address]);

  const switchNet = async () => {
    if (!switchNetwork) return setNetErr("Install a Web3 wallet");
    try {
      await switchNetwork(OPTIMISM_CHAIN_ID);
      setOnOpt(true);
      setNetErr("");
    } catch { setNetErr("Failed to switch"); }
  };

  // build metadata with mojo & narrative
  const buildMeta = useCallback(() => {
    if (!selected) return null;
    const mojo = Math.floor(Math.random()*101);
    const narrs = ["douche","Canoe","Miser"];
    const narr = narrs[Math.floor(Math.random()*narrs.length)];
    return {
      name: `Don't Kill the Jam: ${NFT_OPTIONS[selected].name}`,
      description: NFT_OPTIONS[selected].description,
      image: NFT_OPTIONS[selected].image,
      attributes: [
        { trait_type: "Jam Killer", value: NFT_OPTIONS[selected].name },
        { trait_type: "Mojo Score", value: mojo },
        { trait_type: "Narrative",   value: narr }
      ],
    };
  }, [selected]);

  const handleMint = useCallback(async () => {
    if (!address || !contract || !selected || isMinting) {
      setErrorMsg(
        !address
          ? "Connect your wallet"
          : !contract
          ? "Contract not loaded"
          : !selected
          ? "Select an NFT to mint"
          : "Mint already in progress"
      );
      return setStatus("error");
    }

    setStatus("pending");
    setIsMinting(true);
    setErrorMsg("");

    try {
      const metadata = buildMeta();
      if (!metadata) throw new Error("Failed to build metadata");
      const tokenURI = createMetadataURI(metadata);

      // Get mojoScore and narrative from metadata attributes
      const mojoScore = metadata.attributes.find(attr => attr.trait_type === "Mojo Score")?.value || 0;
      const narrative = metadata.attributes.find(attr => attr.trait_type === "Narrative")?.value || "";

      // Call the 4-arg payable mintTo function
      const tx = await contract.call(
        "mintTo",
        [
          address, // to
          tokenURI, // _tokenURI
          mojoScore, // _mojoScore
          narrative // _narrative
        ],
        { value: ethers.utils.parseEther(fee), gasLimit: 300000 }
      );

      if (!tx?.receipt || tx.receipt.status === 0) {
        throw new Error("Transaction reverted");
      }

      setTxHash(tx.receipt.transactionHash);
      setStatus("success");
      setSelected(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Mint failed");
      setStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [address, contract, selected, isMinting, fee, buildMeta]);

  return (
    <div className="mint-nft-container">
      {status!=="idle" ? (
        <div className={`mint-status ${status}`}>
          {status==="pending" && <p>Minting…</p>}
          {status==="success" && (
            <>
              <p>Success! 🎉</p>
              <a href={`https://optimistic.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">View</a>
            </>
          )}
          {status==="error" && (
            <>
              <p>Failed: {errorMsg}</p>
            </>
          )}
        </div>
      ) : (
        <>
          {!address && <p>Connect wallet</p>}
          {address && !onOpt && (
            <div>
              <p>{netErr}</p>
              <button onClick={switchNet}>Switch to Optimism</button>
            </div>
          )}
          {address && onOpt && !selected && (
            <div className="nft-options">
              <h3>Pick one (Fee: {fee} ETH)</h3>
              {Object.entries(NFT_OPTIONS).map(([k,o])=>(
                <div key={k} onClick={()=>setSelected(k as NFTChoice)}>
                  <img src={o.image} alt={o.name}/>
                  <h4>{o.name}</h4>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div>
              <img src={NFT_OPTIONS[selected].image} alt="preview"/>
              <button onClick={handleMint} disabled={isMinting}>
                {isMinting?"Going…":"Mint NFT"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MintNFT;