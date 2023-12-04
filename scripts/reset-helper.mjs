import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteVoicesAndSeedSounds() {
    // Set all forkParentId fields to null (doesnt work i think due to ciclical relation)
    // await prisma.voiceModel.updateMany({
    //   data: {
    //     forkParentId: null,
    //   },
    // });
  // Delete related records first
  await prisma.voiceModelSeedSounds.deleteMany();
  await prisma.seedSound.deleteMany();
  await prisma.testSound.deleteMany();
  await prisma.previewSound.deleteMany();
  await prisma.voiceModel.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.vote.deleteMany();

  // Then delete the main records
  await prisma.voice.deleteMany();
}

deleteVoicesAndSeedSounds()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  });