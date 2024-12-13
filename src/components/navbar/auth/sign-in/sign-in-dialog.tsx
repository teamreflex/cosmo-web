import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn } from "lucide-react";
import SignInWithEmail from "./sign-in-with-email";
// import SignInWithQR from "./sign-in-with-qr";

export default function SignInDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="link" className="px-0 md:px-4">
          <span className="hidden md:block">Sign In</span>
          <LogIn className="md:hidden h-8 w-8 shrink-0" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sign In</AlertDialogTitle>

          <AlertDialogDescription>
            Signing in allows you to send, scan & grid objekts, participate in
            Gravity events, build wishlists and more.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <SignInWithEmail />

        {/* <Tabs defaultValue="email">
          <TabsList className="flex justify-self-center w-fit mx-auto">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <SignInWithEmail />
          </TabsContent>
          <TabsContent value="qr">
            <SignInWithQR />
          </TabsContent>
        </Tabs> */}

        <AlertDialogFooter>
          <div className="flex items-center gap-2" id="sign-in-footer" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
