import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { PROPRIETARY_LICENSE_TEXT } from "@/lib/constants";

export const LicenseDialog = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button className="hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0 font-normal whitespace-nowrap">
                    License
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>License Information</DialogTitle>
                </DialogHeader>
                <div className="mt-4 text-sm bg-muted/50 p-4 rounded-md overflow-x-auto overflow-y-auto h-[60vh]">
                    <div className="font-mono text-sm whitespace-pre-wrap">
                        {PROPRIETARY_LICENSE_TEXT}
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <DialogTrigger asChild>
                        <Button variant="outline">Close</Button>
                    </DialogTrigger>
                </div>
            </DialogContent>
        </Dialog>
    );
};
