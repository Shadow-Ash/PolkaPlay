// pages/index.js
import GameFactory from '../components/GameFactory';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Web3 Gaming Arena - PolkaVM</title>
        <meta name="description" content="Decentralized gaming platform on PolkaVM" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <GameFactory />
    </>
  );
}

