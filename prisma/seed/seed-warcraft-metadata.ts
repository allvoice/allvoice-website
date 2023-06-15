import { type Prisma, PrismaClient } from "@prisma/client";
import csvParser from "csv-parser";
import fs from "fs";

const prisma = new PrismaClient();

type WarcraftMetadataRow = {
  modelname: string;
  race_id: string;
  gender: string;
  unique_voice_name: string;
  npc_ids: string;
};

type ParsedWarcraftMetadataRow = {
  modelname: string;
  race_id: number;
  gender: number;
  unique_voice_name: string;
  npc_ids: number[];
};
async function parseWarcraftMetadataCSV() {
  return new Promise<ParsedWarcraftMetadataRow[]>((resolve, reject) => {
    const parsedData: ParsedWarcraftMetadataRow[] = [];

    // Read and parse the data.csv file
    fs.createReadStream("prisma/seed/warcraft-metadata.csv")
      .pipe(csvParser())
      .on("data", (row: WarcraftMetadataRow) => {
        parsedData.push({
          modelname: row.modelname,
          race_id: parseInt(row.race_id),
          gender: parseInt(row.gender),
          unique_voice_name: row.unique_voice_name,
          npc_ids: row.npc_ids
            .split(",")
            .map((id: string) => parseInt(id))
            .filter((id) => !isNaN(id)),
        });
      })
      .on("end", () => {
        resolve(parsedData);
      })
      .on("error", (err) => reject(err));
  });
}

async function main() {
  const data = await parseWarcraftMetadataCSV();

  data.forEach(async (row) => {
    const category = await prisma.wacraftNpcDisplay.create({
      data: {
        modelFilePath: row.modelname,
        raceId: row.race_id,
        genderId: row.gender,
        voiceName: row.unique_voice_name,
      },
    });

    for (const npcId of row.npc_ids) {
      try {
        await prisma.warcraftNpc.create({
          data: {
            npcId: npcId,
          },
        });
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          // console.log(`NPC with ID ${npcId} already exists.`);
        } else {
          // Handle other errors or re-throw the error
          throw error;
        }
      }
      try {
        await prisma.warcraftNpcDisplays.create({
          data: {
            npc: {
              connect: { npcId: npcId },
            },
            display: {
              connect: { id: category.id },
            },
          },
        });
      } catch (error) {
        console.log(`error connecting: ${npcId} to ${category.id}`);
      }
    }

  });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
