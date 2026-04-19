import { http } from "wagmi";
import { arbitrumSepolia } from "./chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const wagmiConfig = getDefaultConfig({
  appName: "KURA Protocol",
  projectId: "f8fb543a2b9b59df6bb7288a192153ba",
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc", {
      batch: true,
      retryCount: 3,
    }),
  },
  pollingInterval: 4_000,
});
