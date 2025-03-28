import React from "react";
import "./App.css";
import { useContract } from "@thirdweb-dev/react";
import NarrativeBuilder, { NarrativeFinalizedData } from "./components/NarrativeBuilder";
import Layout from "./components/Layout";

interface AppProps {
  contract: any;
}

function App({ contract }: AppProps) {
  const handleNarrativeFinalized = (data: NarrativeFinalizedData) => {
    console.log('Narrative finalized:', data);
    // Here you can handle the finalized narrative data
    // For example, you might want to mint an NFT or update the UI
  };

  return (
    <Layout>
      <NarrativeBuilder onNarrativeFinalized={handleNarrativeFinalized} />
    </Layout>
  );
}

export default App;
