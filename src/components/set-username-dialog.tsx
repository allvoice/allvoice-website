import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, LoadingButton } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { api } from "~/utils/api";
import { usernameSchema } from "~/utils/schema";

type SetUsernameDialogProps = {
  triggerContent?: React.ReactNode;
};

const FormSchema = z.object({
  username: usernameSchema,
});

const SetUsernameDialog: React.FC<SetUsernameDialogProps> = ({
  triggerContent,
}) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
    },
  });
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const updateUser = api.users.updateUser.useMutation({
    onSuccess: (data, variables) => {
      if (data?.error == "username") {
        form.setError("username", {
          type: "manual",
          message: data.message,
        });
      } else {
        utils.users.getUserDetails.setData(undefined, (old) => {
          if (!old) return old;
          return {
            ...old,
            username: data.username ?? variables.username,
          };
        });
        void utils.users.getUserDetails.invalidate();
        setOpen(false);
      }
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof FormSchema>> = async (data) => {
    if (updateUser.isPending) return;
    await updateUser.mutateAsync({
      username: data.username,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerContent ? (
          triggerContent
        ) : (
          <Button variant="outline">Set Username</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="mrthinger" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <LoadingButton
                type="submit"
                className="w-full"
                loading={updateUser.isPending}
              >
                Save changes
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SetUsernameDialog;
