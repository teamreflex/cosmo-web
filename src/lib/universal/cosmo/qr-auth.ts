export type AuthTicket = {
  expireAt: string;
  ticket: string;
};

export type TicketWaitingForAction = {
  status: "wait_for_user_action";
  ticketRemainingMs: number;
};

// not an actual status but this just makes the invalid state easier to handle
export type TicketInvalid = {
  status: "invalid";
};

type LoadedTicket<Status extends string> = {
  status: Status;
  ticketRemainingMs: number;
  ticketOtpRemainingMs: number;
  profiles: {
    artistName: string;
    profileImageUrl: string;
  }[];
  user: {
    id: number;
    nickname: string;
    profileImageUrl: string;
  };
};

export type TicketWaitingForCertify = LoadedTicket<"wait_for_certify">;
export type TicketCertified = LoadedTicket<"certified">;

export type QueryTicket =
  | TicketInvalid
  | TicketWaitingForAction
  | TicketWaitingForCertify
  | TicketCertified;

/**
 * Build the QR code value for the ticket.
 */
export function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}
