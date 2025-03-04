import { BFFCollectionGroup } from "@/lib/universal/cosmo/objekts";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { create } from "zustand";
import { useUserState } from "@/hooks/use-user-state";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import {
  CosmoSpinCompleteRequest,
  CosmoSpinGetTickets,
  CosmoSpinOption,
  CosmoSpinPresignResponse,
} from "@/lib/universal/cosmo/spin";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useSendObjekt } from "./use-wallet-transaction";
import { Addresses } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error";
import { useCosmoArtists } from "./use-cosmo-artist";
import { match } from "ts-pattern";
import { Hex } from "viem";

export const SIMULATE: boolean = false;

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

export type SpinStateConfirmError = {
  status: "confirm-error";
  objekt: SelectedObjekt;
  spinId: number;
  hash: string;
  error?: string;
};

export type SpinStateComplete = {
  status: "complete";
  objekt: SelectedObjekt;
  spinId: number;
  hash: string;
  index: number;
  options: CosmoSpinOption[];
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
  | SpinStateConfirmError
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
  cancelSending: () => void;

  // actions
  startSelecting: () => void;
  select: (objekt: SelectedObjekt) => void;
  createSpin: (spinId: number) => void;
  startSending: () => void;
  confirmSent: (hash: string) => void;
  setError: (error: string) => void;
  confirmReceipt: () => void;
  confirmError: (error: string) => void;
  completeSpin: (index: number, options: CosmoSpinOption[]) => void;
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
        status: "selecting",
      } satisfies SpinStateSelecting,
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
   * Cancel the sending of the objekt.
   */
  cancelSending: () => {
    const spinState = get().state;
    if (spinState.status !== "created") {
      throw new Error("Cannot cancel when a spin has not been created.");
    }

    return set((state) => ({
      ...state,
      currentStep: 2,
      state: {
        status: "selected",
        objekt: spinState.objekt,
      } satisfies SpinStateSelected,
    }));
  },

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
   * Confirming with COSMO failed.
   */
  confirmError: (error: string) => {
    const spinState = get().state;
    if (spinState.status !== "success" && spinState.status !== "confirmed") {
      throw new Error("Objekt has not been sent.");
    }

    return set((state) => ({
      ...state,
      currentStep: 3,
      state: {
        ...spinState,
        status: "confirm-error",
        error,
      } satisfies SpinStateConfirmError,
    }));
  },

  /**
   * Set the selection of the index to submit for spin.
   */
  completeSpin: (index: number, options: CosmoSpinOption[]) => {
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
 * Get the tickets for the current artist.
 */
export function useSpinTickets() {
  const { token, artist } = useUserState();
  return useSuspenseQuery({
    queryKey: ["spin-tickets", artist],
    queryFn: () => {
      if (SIMULATE) {
        return {
          availableTicketsCount: 3,
          inProgressSpinId: 123,
          nextReceiveAt: null,
        };
      }

      const endpoint = new URL(
        `/bff/v3/spin/tickets/${artist}`,
        COSMO_ENDPOINT
      );
      return ofetch<CosmoSpinGetTickets>(endpoint.toString(), {
        retry: 1,
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
      });
    },
  });
}

/**
 * Start a new objekt spin.
 */
export function useSpinPresign() {
  const { token } = useUserState();
  const createSpin = useObjektSpin((state) => state.createSpin);
  return useMutation({
    mutationFn: async (tokenId: number): Promise<CosmoSpinPresignResponse> => {
      // DEBUG
      if (SIMULATE) {
        return { spinId: 123 };
      }

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
export function useSpinSendObjekt() {
  const { artist } = useUserState();
  const { artists } = useCosmoArtists();
  const [isPending, setIsPending] = useState(false);
  const { send } = useSendObjekt();
  const confirmMutation = useSpinConfirm();

  const startSending = useObjektSpin((state) => state.startSending);
  const confirmSent = useObjektSpin((state) => state.confirmSent);
  const setError = useObjektSpin((state) => state.setError);

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
      let hash: Hex | undefined = "0x123";
      if (SIMULATE === false) {
        hash = await send({
          to: Addresses.SPIN,
          tokenId: selection.objekt.token.tokenId,
          contract,
          opts: {
            mutationKey: ["spin-objekt", selection.objekt.token.tokenId],
          },
        });
      }

      // update the selection to success
      confirmSent(hash ?? "");

      // confirm the spin
      await confirmMutation.mutateAsync(selection.spinId);
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
 * Confirm with COSMO that the objekt has been sent.
 */
export function useSpinConfirm() {
  const { token } = useUserState();
  const confirmReceipt = useObjektSpin((state) => state.confirmReceipt);
  const confirmError = useObjektSpin((state) => state.confirmError);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (spinId: number): Promise<boolean> => {
      // DEBUG
      if (SIMULATE) {
        return true;
      }

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
    retry: 1,
    onSuccess: () => {
      // confirm the receipt of the objekt
      confirmReceipt();

      // invalidate the spin tickets query
      queryClient.invalidateQueries({ queryKey: ["spin-tickets"] });
    },
    onError: (error) => {
      confirmError(getErrorMessage(error));
    },
  });
}

/**
 * Submit the selection.
 */
export function useSpinComplete() {
  const { token } = useUserState();
  return useMutation({
    mutationFn: async (
      params: CosmoSpinCompleteRequest
    ): Promise<CosmoSpinOption[]> => {
      // DEBUG
      if (SIMULATE) {
        return simulatedOptions;
      }

      const endpoint = new URL("/bff/v3/spin/complete", COSMO_ENDPOINT);
      return await ofetch<CosmoSpinOption[]>(endpoint.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token?.accessToken}`,
        },
        body: params,
      });
    },
  });
}

const simulatedOptions: CosmoSpinOption[] = [
  {
    season: "Cream01",
    member: "JinSoul",
    collectionNo: "108Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/c0a40dd8-d701-4bd5-730f-e77370c8fb00/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/c0a40dd8-d701-4bd5-730f-e77370c8fb00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d9842cb5-a1a4-4629-2489-b1c43e831b00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:28:00.919Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 JinSoul 108Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "201Z",
    class: "Special",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/bd8e37fd-eba9-45d3-d7d5-268fd635f700/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/bd8e37fd-eba9-45d3-d7d5-268fd635f700/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/8aec6f81-5f7b-460e-7bf3-fc8911ed4f00/4x",
    accentColor: "#F7F7F7",
    backgroundColor: "#F7F7F7",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-11-25T06:05:31.534Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 201Z",
  },
  {
    season: "Cream01",
    member: "HeeJin",
    collectionNo: "108Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3ac1c5b4-ff6d-4057-499f-40997aa81300/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3ac1c5b4-ff6d-4057-499f-40997aa81300/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/af103474-f5bc-4ee9-549f-c0808d80ef00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:19:53.862Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 HeeJin 108Z",
  },
  {
    season: "Cream01",
    member: "HaSeul",
    collectionNo: "106Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d5cb3256-a4fa-4f7c-3e92-17016f743800/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d5cb3256-a4fa-4f7c-3e92-17016f743800/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/0153acef-4a47-4bfd-29a5-41f189968900/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:49:39.030Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 HaSeul 106Z",
  },
  {
    season: "Cream01",
    member: "JinSoul",
    collectionNo: "107Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3c93212e-74f8-4179-7c77-0c902552da00/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3c93212e-74f8-4179-7c77-0c902552da00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d9842cb5-a1a4-4629-2489-b1c43e831b00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:28:00.918Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 JinSoul 107Z",
  },
  {
    season: "Cream01",
    member: "HaSeul",
    collectionNo: "107Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/a5e9abf3-f482-4624-a9fe-c80003881400/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/a5e9abf3-f482-4624-a9fe-c80003881400/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/0153acef-4a47-4bfd-29a5-41f189968900/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:49:39.025Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 HaSeul 107Z",
  },
  {
    season: "Cream01",
    member: "KimLip",
    collectionNo: "106Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/5aed247f-0dfa-4790-01f0-988439b10900/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/5aed247f-0dfa-4790-01f0-988439b10900/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/e4fb62c3-db12-4851-2a18-41a66b22dd00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:23:30.468Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 KimLip 106Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "104Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/ff69f2a8-d4d0-4b51-e5cb-bd4e9915af00/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/ff69f2a8-d4d0-4b51-e5cb-bd4e9915af00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/59e5c95d-4d4a-4b24-753f-8a86ae61c200/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:41:13.267Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 104Z",
  },
  {
    season: "Cream01",
    member: "HeeJin",
    collectionNo: "108Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3ac1c5b4-ff6d-4057-499f-40997aa81300/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/3ac1c5b4-ff6d-4057-499f-40997aa81300/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/af103474-f5bc-4ee9-549f-c0808d80ef00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:19:53.862Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 HeeJin 108Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "101Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/59e5c95d-4d4a-4b24-753f-8a86ae61c200/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:41:13.269Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    objektNo: 2286,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 101Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "101Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/59e5c95d-4d4a-4b24-753f-8a86ae61c200/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:41:13.269Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 101Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "106Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/63a165b9-fb9d-4210-b34d-2f05a4934400/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/63a165b9-fb9d-4210-b34d-2f05a4934400/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/59e5c95d-4d4a-4b24-753f-8a86ae61c200/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:41:13.267Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 106Z",
  },
  null,
  {
    season: "Cream01",
    member: "JinSoul",
    collectionNo: "105Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/17419d8e-a1d7-4437-548e-78bfc2b1cd00/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/17419d8e-a1d7-4437-548e-78bfc2b1cd00/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/d9842cb5-a1a4-4629-2489-b1c43e831b00/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:28:00.924Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 JinSoul 105Z",
  },
  {
    season: "Cream01",
    member: "HaSeul",
    collectionNo: "104Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/595108eb-8c27-4c52-5cb8-79446c337100/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/595108eb-8c27-4c52-5cb8-79446c337100/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/0153acef-4a47-4bfd-29a5-41f189968900/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:49:39.032Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 HaSeul 104Z",
  },
  {
    season: "Cream01",
    member: "Choerry",
    collectionNo: "101Z",
    class: "First",
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/90a83617-1494-4570-6107-7348b1f89600/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/59e5c95d-4d4a-4b24-753f-8a86ae61c200/4x",
    accentColor: "#FF7477",
    backgroundColor: "#FF7477",
    comoAmount: 1,
    transferableByDefault: false,
    createdAt: "2024-10-21T07:41:13.269Z",
    updatedAt: "2025-02-28T02:14:16.098Z",
    textColor: "#000000",
    gridableByDefault: false,
    artists: ["artms"],
    collectionId: "Cream01 Choerry 101Z",
  },
];
