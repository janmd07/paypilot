import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { PAYPILOT_CONFIG } from './config';

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(PAYPILOT_CONFIG.chain.rpcUrl),
});

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

export async function getUSDCBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: PAYPILOT_CONFIG.contracts.usdcBaseSepolia,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });
    // USDC uses 6 decimals
    return (Number(balance) / 1e6).toFixed(2);
  } catch (error) {
    console.error('Error fetching Base Sepolia USDC balance:', error);
    return '0.00';
  }
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export async function requestWalletConnection(): Promise<{
  address: `0x${string}`;
  chainId: number;
} | null> {
  const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: EthereumProvider }) : undefined;
  if (!win || !win.ethereum) {
    throw new Error('No Ethereum wallet detected. Please install Coinbase Wallet or MetaMask.');
  }

  const ethereum = win.ethereum;
  const accounts = (await ethereum.request({ method: 'eth_requestAccounts' })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected');
  }

  const hexChainId = (await ethereum.request({ method: 'eth_chainId' })) as string;
  const chainId = parseInt(hexChainId, 16);

  // Switch to Base Sepolia if not on Base Sepolia
  if (chainId !== PAYPILOT_CONFIG.chain.chainId) {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${PAYPILOT_CONFIG.chain.chainId.toString(16)}` }],
      });
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${PAYPILOT_CONFIG.chain.chainId.toString(16)}`,
              chainName: PAYPILOT_CONFIG.chain.name,
              rpcUrls: [PAYPILOT_CONFIG.chain.rpcUrl],
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: [PAYPILOT_CONFIG.chain.blockExplorer],
            },
          ],
        });
      }
    }
  }

  return {
    address: accounts[0] as `0x${string}`,
    chainId: PAYPILOT_CONFIG.chain.chainId,
  };
}
