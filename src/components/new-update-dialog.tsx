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
        <button className="flex justify-center items-center py-1 px-2 rounded-xl bg-red-500 bg-opacity-25 hover:bg-opacity-40 transition-colors">
          <Newspaper className="text-red-500 w-6 h-6" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updates</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col text-sm gap-2">
          {/* jan 19th */}
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-lg">January 19th 2024</h3>
            <ul className="list-disc list-inside">
              <li>
                Due to Cosmo changes, searching for users now requires signing
                in. This also applies to viewing profiles that haven&apos;t been
                added into the system.
              </li>
              <li>
                Profiles that have been added to the system can continue to be
                viewed without signing in.
              </li>
            </ul>
          </div>

          {/* jan 15th */}
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-lg">January 15th 2024</h3>
            <ul className="list-disc list-inside">
              <li>
                Added: Option to swap between Cosmo and Polygon for collection
                display.
              </li>
              <li>
                Added: Lowest Serial & Highest Serial sorting when using
                Polygon.
              </li>
            </ul>
          </div>

          {/* jan 13th */}
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
