import { InfoIcon } from "lucide-react";
import React, { type FC } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";

type Props = {
  children?: React.ReactNode;
};

export const InfoPopover: FC<Props> = ({ children }: Props) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex w-min items-center justify-center rounded-md p-1 hover:bg-slate-100">
          <InfoIcon className="h-4 w-4 stroke-slate-500" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">{children}</PopoverContent>
    </Popover>
  );
};
