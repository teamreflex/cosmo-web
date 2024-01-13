import { Newspaper } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export default function NewUpdateDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex justify-center items-center py-1 px-2 rounded-xl bg-cosmo-text bg-opacity-25 hover:bg-opacity-40 transition-colors">
          <Newspaper className="text-cosmo-text w-6 h-6" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updates</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col text-sm gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-lg">January 13th 2024</h3>
            <ul className="list-disc list-inside">
              <li>Removed: Objekt sending, due to Ramper changes.</li>
              <li>
                Added: Privacy options for changing how much of your profile is
                publicly available.
              </li>
              <li>
                Added: Options to change the number of columns when displaying
                objekts.
              </li>
              <li>
                Added: Objekt indicators now show when an objekt is in a
                lenticular pair, which prevents sending.
              </li>
              <li>
                Added: Icon to indicate when a COMO drop has been carried over
                from the previous month, due to landing on the 31st.
              </li>
            </ul>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
