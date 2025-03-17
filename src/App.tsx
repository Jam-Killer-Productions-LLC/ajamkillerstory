// src/App.tsx
import React, { useState } from "react";
import NarrativeBuilder from "./components/NarrativeBuilder";
import MintNFT from "./components/MintNFT";
import { NarrativeFinalizedData } from "./types/narrative";

interface AppProps {
  contract: any; // Replace 'any' with the actual contract type if available
}

const App: React.FC<AppProps> = ({ contract }) => {
  // We'll store the metadata URI and narrative path generated from NarrativeBuilder.
  const [metadataUri, setMetadataUri] = useState<string>("");
  const [narrativePath, setNarrativePath] = useState<string>("");

  const handleNarrativeFinalized = (data: NarrativeFinalizedData) => {
    // Validate the metadata URI
    if (!data.uri || !data.uri.startsWith("ipfs://")) {
      console.error("Invalid metadata URI");
      return;
    }

    setMetadataUri(data.uri);
    setNarrativePath(data.narrativePath);
  };

  return (
  
interface AppProps {
  contract: any; // Replace 'any' with the actual contract type if available
}

const App: React.FC<AppProps> = ({ contract }) => {
  // We'll store the metadata URI and narrative path generated from NarrativeBuilder.
  const [metadataUri, setMetadataUri] = useState<string>("");
  const [narrativePath, setNarrativePath] = useState<string>("");

  const handleNarrativeFinalized = (data: NarrativeFinalizedData) => {
    try {
      if (!data.uri || !data.uri.startsWith("ipfs://")) {
        throw new Error("Invalid metadata URI");
      }

      setMetadataUri(data.uri);
      setNarrativePath(data.narrativePath);
    } catch (error) {
      console.error("Error finalizing narrative:", error);
      // Provide user feedback, e.g., show an error message
    }
  };

  return (
    <div>
      {/* Build your narrative */}
      <NarrativeBuilder onNarrativeFinalized={handleNarrativeFinalized} />
      
      {/* Once narrative is finalized, show the mint component */}
      {metadataUri && narrativePath && (
        <MintNFT 
          metadataUri={metadataUri} 
          narrativePath={narrativePath}
          contract={contract}
        />
      )}
    </div>
  );
};

export default App;
