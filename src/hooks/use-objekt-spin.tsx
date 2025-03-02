import { BFFCollectionGroup } from "@/lib/universal/cosmo/objekts";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { create } from "zustand";
import { useUserState } from "@/hooks/use-user-state";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import {
  CosmoSpinCompleteRequest,
  CosmoSpinCompleteResponse,
  CosmoSpinPresignResponse,
} from "@/lib/universal/cosmo/spin";
import { useMutation } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useSendObjekt } from "./use-wallet-transaction";
import { Addresses } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { useCosmoArtists } from "./use-cosmo-artist";
import { match } from "ts-pattern";

type SelectedObjekt = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

// spin has not been started yet
export type SpinStateIdle = {
  status: "idle";
};

// selecting an objekt
export type SpinStateSelecting = {
  status: "selecting";
};

// objekt has been selected
export type SpinStateSelected = {
  status: "selected";
  objekt: SelectedObjekt;
};

// spin has been created
export type SpinStateCreated = {
  status: "created";
  objekt: SelectedObjekt;
  spinId: number;
};

// objekt is being sent
export type SpinStateSending = {
  status: "sending";
  objekt: SelectedObjekt;
  spinId: number;
};

// objekt has been sent
export type SpinStateSent = {
  status: "success";
  objekt: SelectedObjekt;
  spinId: number;
  hash: string;
};

// objekt send failed
export type SpinStateSendError = {
  status: "error";
  objekt: SelectedObjekt;
  spinId: number;
  error?: string;
};

export type SpinStateConfirmReceipt = {
  status: "confirmed";
  objekt: SelectedObjekt;
  spinId: number;
  hash: string;
};

export type SpinStateComplete = {
  status: "complete";
  objekt: SelectedObjekt;
  spinId: number;
  hash: string;
  index: number;
  options: CosmoSpinCompleteResponse;
};

export type SpinState =
  | SpinStateIdle
  | SpinStateSelecting
  | SpinStateSelected
  | SpinStateCreated
  | SpinStateSending
  | SpinStateSent
  | SpinStateSendError
  | SpinStateConfirmReceipt
  | SpinStateComplete;

type ObjektSpinState = {
  state: SpinState;

  // overlay state
  openCollection: BFFCollectionGroup | null;
  setOpenCollection: (open: BFFCollectionGroup | null) => void;

  // step state
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // helpers
  isSelected: (tokenId: number) => boolean;
  hasSelected: (tokenIds: number[]) => boolean;
  resetSelection: () => void;
  resetState: () => void;

  // actions
  startSelecting: () => void;
  select: (objekt: SelectedObjekt) => void;
  createSpin: (spinId: number) => void;
  startSending: () => void;
  confirmSent: (hash: string) => void;
  setError: (error: string) => void;
  confirmReceipt: () => void;
  completeSpin: (index: number, options: CosmoSpinCompleteResponse) => void;
};

/**
 * State for the objekt spin functionality.
 */
export const useObjektSpin = create<ObjektSpinState>()((set, get) => ({
  // overlay state
  openCollection: null,
  setOpenCollection: (open) => set({ openCollection: open }),

  /**
   * Central state for the objekt spin functionality.
   */
  state: {
    status: "idle",
  } satisfies SpinStateIdle,

  // step state
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  /**
   * Determine whether the specific token has been selected.
   */
  isSelected: (tokenId) => {
    return match(get().state)
      .with(
        { status: "selected" },
        ({ objekt }) => objekt.token.tokenId === tokenId
      )
      .otherwise(() => false);
  },

  /**
   * Determine whether any of the given tokens have been selected.
   */
  hasSelected: (tokenIds) => {
    return match(get().state)
      .with({ status: "selected" }, ({ objekt }) =>
        tokenIds.includes(objekt.token.tokenId)
      )
      .otherwise(() => false);
  },

  /**
   * Reset the selection.
   */
  resetSelection: () =>
    set(() => ({
      currentStep: 1,
      state: {
        status: "idle",
      } satisfies SpinStateIdle,
      openCollection: null,
    })),

  /**
   * Reset state completely.
   */
  resetState: () =>
    set((state) => ({
      ...state,
      currentStep: 0,
      openCollection: null,
      state: {
        status: "idle",
      } satisfies SpinStateIdle,
    })),

  /**
   * Start selecting an objekt.
   */
  startSelecting: () =>
    set((state) => ({
      ...state,
      currentStep: 1,
      state: {
        status: "selecting",
      } satisfies SpinStateSelecting,
    })),

  /**
   * Select the given objekt
   */
  select: (objekt) =>
    set((state) => {
      return {
        ...state,
        currentStep: 2,
        state: {
          objekt,
          status: "selected",
        } satisfies SpinStateSelected,
      };
    }),

  /**
   * Create a new spin.
   */
  createSpin: (spinId: number) => {
    const spinState = get().state;
    if (spinState.status !== "selected") {
      throw new Error("No objekt selected.");
    }

    return set((state) => ({
      ...state,
      currentStep: 2,
      state: {
        ...spinState,
        status: "created",
        spinId,
      } satisfies SpinStateCreated,
    }));
  },

  /**
   * Start sending the objekt.
   */
  startSending: () => {
    const spinState = get().state;
    if (spinState.status !== "created") {
      throw new Error("No spin created.");
    }

    return set((state) => ({
      ...state,
      currentStep: 2,
      state: {
        ...spinState,
        status: "sending",
      } satisfies SpinStateSending,
    }));
  },

  /**
   * Confirm that the objekt has been sent.
   */
  confirmSent: (hash: string) => {
    const spinState = get().state;
    if (spinState.status !== "sending") {
      throw new Error("No objekt is pending transfer.");
    }

    return set((state) => ({
      ...state,
      currentStep: 2,
      state: {
        ...spinState,
        status: "success",
        hash,
      } satisfies SpinStateSent,
    }));
  },

  /**
   * Set an error message.
   */
  setError: (error: string) =>
    set((state) => ({
      ...state,
      currentStep: 2,
      state: {
        ...state.state,
        status: "error",
        error,
      } as SpinStateSendError,
    })),

  /**
   * Confirm the receipt of the objekt.
   */
  confirmReceipt: () => {
    const spinState = get().state;
    if (spinState.status !== "success") {
      throw new Error("Objekt has not been sent.");
    }

    return set((state) => ({
      ...state,
      currentStep: 3,
      state: {
        ...spinState,
        status: "confirmed",
      } satisfies SpinStateConfirmReceipt,
    }));
  },

  /**
   * Set the selection of the index to submit for spin.
   */
  completeSpin: (index: number, options: CosmoSpinCompleteResponse) => {
    const spinState = get().state;
    if (spinState.status !== "confirmed") {
      throw new Error("Objekt has not been confirmed sent.");
    }

    return set((state) => ({
      ...state,
      currentStep: 3,
      state: {
        ...spinState,
        status: "complete",
        index,
        options,
      } satisfies SpinStateComplete,
    }));
  },
}));

/**
 * Start a new objekt spin.
 */
export function useSpinPresign() {
  const { token } = useUserState();
  const createSpin = useObjektSpin((state) => state.createSpin);
  return useMutation({
    mutationFn: async (tokenId: number) => {
      const endpoint = new URL("/bff/v3/spin/pre-sign", COSMO_ENDPOINT);
      return await ofetch<CosmoSpinPresignResponse>(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
        body: {
          usedTokenId: tokenId,
        },
      });
    },
    onSuccess: ({ spinId }) => {
      createSpin(spinId);
    },
  });
}

/**
 * Send the objekt and confirm the spin.
 */
export function useSpinSubmit() {
  const { token, artist } = useUserState();
  const { artists } = useCosmoArtists();
  const [isPending, setIsPending] = useState(false);
  const { send } = useSendObjekt();
  const submit = useMutation({
    mutationFn: async (spinId: number) => {
      const endpoint = new URL("/bff/v3/spin", COSMO_ENDPOINT);
      return await ofetch<void>(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
        body: {
          spinId,
        },
      }).then(() => true);
    },
  });

  const startSending = useObjektSpin((state) => state.startSending);
  const confirmSent = useObjektSpin((state) => state.confirmSent);
  const setError = useObjektSpin((state) => state.setError);
  const confirmReceipt = useObjektSpin((state) => state.confirmReceipt);

  /**
   * Execute objekt send and confirm the spin upon transaction receipt.
   */
  async function handleSend(selection: SpinStateCreated) {
    setIsPending(true);

    try {
      const contract = artists.find((a) => a.id === artist)?.contracts.Objekt;
      if (!contract) {
        throw new Error("Invalid artist selected.");
      }

      // update the selection to pending
      startSending();

      // send the objekt to the spin account
      const hash = await send({
        to: Addresses.SPIN,
        tokenId: selection.objekt.token.tokenId,
        contract,
        opts: {
          mutationKey: ["spin-objekt", selection.objekt.token.tokenId],
        },
      });

      // update the selection to success
      confirmSent(hash ?? "");

      // submit the spin
      const result = await submit.mutateAsync(selection.spinId);

      // confirm the receipt of the objekt
      confirmReceipt();

      return result;
    } catch (error) {
      // update the selection to error
      setError(getErrorMessage(error));

      return false;
    } finally {
      setIsPending(false);
    }
  }

  return {
    handleSend,
    isPending,
  };
}

/**
 * Submit the selection.
 */
export function useSpinComplete() {
  const { token } = useUserState();
  const completeSpin = useObjektSpin((state) => state.completeSpin);
  return useMutation({
    mutationFn: async (params: CosmoSpinCompleteRequest) => {
      const endpoint = new URL("/bff/v3/spin/complete", COSMO_ENDPOINT);
      return await ofetch<CosmoSpinCompleteResponse>(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
        body: params,
      });
    },
    onSuccess: (options, { index }) => {
      completeSpin(index, options);
    },
  });
}
