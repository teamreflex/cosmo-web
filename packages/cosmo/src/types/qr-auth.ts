import type {
  AuthTicketSchema,
  QueryTicketSchema,
  TicketUserSchema,
} from "../schema/qr-auth";

export type AuthTicket = typeof AuthTicketSchema.Type;

export type TicketUser = typeof TicketUserSchema.Type;

export type QueryTicket = typeof QueryTicketSchema.Type;

/**
 * Build the QR code value for the ticket.
 */
export function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}
