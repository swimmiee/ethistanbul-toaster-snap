import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
// @ts-ignore
import { getDefaultConfig } from 'connectkit';
import { arbitrum, localhost, optimism } from 'viem/chains';

export const supportedChains = [localhost, arbitrum, optimism];

const { chains } = configureChains(supportedChains, [publicProvider()]);

const wagmiConfig = createConfig(
  getDefaultConfig({
    chains,
    // Required API Keys
    // alchemyId: process.env.ALCHEMY_ID,
    // alchemyId: import.meta.env.VITE_ALCHEMY_ID,
    // walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
    alchemyId: 'J5Q1Q9Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1',
    walletConnectProjectId: 'J5Q1Q9Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1Q1',
    // Required
    appName: 'Toaster Finance',

    // Optional
    appDescription: 'Toaster Finance is a DeFi onboarding app for everyone.',
    appUrl: 'https://family.co', // your app's url
    appIcon: 'https://family.co/logo.png', // your app's icon, no bigger than 1024x1024px (max. 1MB)
  }),
);

export default wagmiConfig;
