import React from "react";
import "./App.css";
import { useContract } from "@thirdweb-dev/react";
import MintNFT from "./components/MintNFT";
import Layout from "./components/Layout";

function App() {
  const { contract } = useContract("0x60b1Aed47EDA9f1E7E72b42A584bAEc7aFbd539B");

  return (
    <Layout>
      <MintNFT />
    </Layout>
  );
}

export default App;
