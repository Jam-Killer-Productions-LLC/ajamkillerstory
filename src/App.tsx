import React from "react";
import "./App.css";
import { useContract } from "@thirdweb-dev/react";
import NarrativeBuilder, { NarrativeFinalizedData } from "./components/NarrativeBuilder";
import Layout from "./components/Layout";

function App() {
  const { contract } = useContract("0xfA2A3452D86A9447e361205DFf29B1DD441f1821");
  
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
