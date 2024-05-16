"use client";

import { ReactNode, createContext, useContext } from "react";

type RewardContextProps = {
  rewardsDialog: ReactNode;
};

const RewardContext = createContext<RewardContextProps>({
  rewardsDialog: null,
});

interface ObjektRewardProviderProps {
  rewardsDialog: ReactNode;
  children: ReactNode;
}

export function ObjektRewardProvider({
  children,
  rewardsDialog,
}: ObjektRewardProviderProps) {
  return (
    <RewardContext.Provider value={{ rewardsDialog }}>
      {children}
    </RewardContext.Provider>
  );
}

export function useObjektRewards() {
  return useContext(RewardContext);
}
