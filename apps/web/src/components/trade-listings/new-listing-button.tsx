import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";
import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useState } from "react";
import LinkCosmo from "../auth/link-cosmo";
import SignIn from "../auth/sign-in";
import { Button } from "../ui/button";
import ListingComposer from "./listing-composer";

/**
 * Opens the composer for a new listing. Posting needs an account with a
 * linked COSMO profile, so the same button signs in or links first. Phones
 * get an icon.
 */
export default function NewListingButton() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const href = useLocation({ select: (location) => location.href });
  const [open, setOpen] = useState(false);
  const button = (
    <Button
      size="sm"
      aria-label={m.listing_composer_new()}
      className="max-md:size-9 max-md:px-0"
    >
      <IconPlus />
      <span className="max-md:hidden">{m.listing_composer_new()}</span>
    </Button>
  );

  if (account === null) {
    return <SignIn trigger={button} callbackURL={href} />;
  }
  if (account.cosmo === undefined) {
    return <LinkCosmo trigger={button} />;
  }

  return (
    <>
      <Button
        size="sm"
        aria-label={m.listing_composer_new()}
        className="max-md:size-9 max-md:px-0"
        onClick={() => setOpen(true)}
      >
        <IconPlus />
        <span className="max-md:hidden">{m.listing_composer_new()}</span>
      </Button>
      <ListingComposer
        mode={{ kind: "create" }}
        address={account.cosmo.address}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
