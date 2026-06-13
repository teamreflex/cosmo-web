export type AuthTicket = {
  expireAt: string;
  ticket: string;
};

type TicketWaitingForAction = {
  status: "wait_for_user_action";
  ticketRemainingMs: number;
};

// not an actual status but this just makes the invalid state easier to handle
type TicketInvalid = {
  status: "invalid";
};

export type ProfileImage = {
  artistName: string;
  profileImageUrl: string;
};

export type TicketUser = {
  id: number;
  nickname: string;
  profileImageUrl: string;
  profileImages: ProfileImage[];
};

type LoadedTicket<TStatus extends string> = {
  status: TStatus;
  ticketRemainingMs: number;
  ticketOtpRemainingMs: number;
  profiles: ProfileImage[];
  user: TicketUser;
};

type TicketWaitingForCertify = LoadedTicket<"wait_for_certify">;
type TicketCertified = LoadedTicket<"certified">;

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
