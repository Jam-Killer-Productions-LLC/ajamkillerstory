import React from "react";
import "./App.css";
import { useContract } from "@thirdweb-dev/react";
import NarrativeBuilder, { NarrativeFinalizedData } from "./components/NarrativeBuilder";
import Layout from "./components/Layout";

function App() {
  const { contract } = useContract("0x914b1339944d48236738424e2dbdbb72a212b2f5");
  
  const handleNarrativeFinalized = (data: NarrativeFinalizedData) => {
    console.log('Narrative finalized:', data);
    // Here you can handle the finalized narrative data
  };

  return (
    <Layout>
      <NarrativeBuilder onNarrativeFinalized={handleNarrativeFinalized} />
    </Layout>
  );
}

export default App;
