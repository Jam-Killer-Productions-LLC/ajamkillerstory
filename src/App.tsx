import React from "react";
import "./App.css";
import { useContract } from "@thirdweb-dev/react";
import MintNFT from "./components/MintNFT";
import Layout from "./components/Layout";

function App() {
  const { contract } = useContract("0x914b1339944d48236738424e2dbdbb72a212b2f5");

  return (
    <Layout>
      <MintNFT />
    </Layout>
  );
}

export default App;
