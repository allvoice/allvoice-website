import NPCPicker from "~/components/npc-picker";
import { api } from "~/utils/api";

type Props = {
  voiceModelId: string;
  isOpen: boolean;
  onClose: () => void;
};

const NPCPickerEdit: React.FC<Props> = ({ voiceModelId, isOpen, onClose }) => {
  const utils = api.useUtils();
  const updateWarcraftLink = api.voices.updateWarcraftLink.useMutation({
    onMutate: async ({
      voiceModelId,
      uniqueWarcraftNpcId,
      warcraftNpcDisplayId,
      clientSide,
    }) => {
      await utils.voices.getVoiceModelWorkspace.cancel();
      utils.voices.getVoiceModelWorkspace.setData({ voiceModelId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          uniqueWarcraftNpcName: uniqueWarcraftNpcId
            ? clientSide?.name ?? undefined
            : undefined,
          warcraftDisplayName: warcraftNpcDisplayId
            ? clientSide?.name ?? undefined
            : undefined,
        };
      });
    },
    onSettled: () => {
      void utils.voices.getVoiceModelWorkspace.invalidate({ voiceModelId });
    },
  });

  const onSelectNPC = (id: string, name: string) => {
    updateWarcraftLink.mutate({
      voiceModelId,
      uniqueWarcraftNpcId: id,
      clientSide: {
        name: name,
      },
    });
    onClose();
  };

  const onSelectCharacterModel = (id: string, name: string) => {
    updateWarcraftLink.mutate({
      voiceModelId,
      warcraftNpcDisplayId: id,
      clientSide: {
        name: name,
      },
    });
    onClose();
  };

  return (
    <NPCPicker
      open={isOpen}
      setOpen={onClose}
      onSelectNPC={onSelectNPC}
      onSelectCharacterModel={onSelectCharacterModel}
    />
  );
};

export default NPCPickerEdit;
