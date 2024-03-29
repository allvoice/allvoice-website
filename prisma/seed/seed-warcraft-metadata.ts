import { PrismaClient } from "@prisma/client";
import csvParser from "csv-parser";
import fs from "fs";
import { Presets, SingleBar } from "cli-progress";

const prisma = new PrismaClient();

type WarcraftMetadataRow = {
  entry: string;
  name: string;
  modelname: string;
  race_id: string;
  gender: string;
  unique_voice_name: string;
};

type ParsedWarcraftMetadataRow = {
  // entry is the npc's id
  entry: number;
  // name is the npc's name
  name: string;
  // modelname is the full path to the NPC's model
  modelname: string;
  race_id: number;
  gender: number;
  // -1 for unknown
  unique_voice_name: string;
};
async function parseWarcraftMetadataCSV() {
  return new Promise<ParsedWarcraftMetadataRow[]>((resolve, reject) => {
    const parsedData: ParsedWarcraftMetadataRow[] = [];

    // Read and parse the data.csv file
    fs.createReadStream("prisma/seed/warcraft-display-metadata.csv")
      .pipe(csvParser())
      .on("data", (row: WarcraftMetadataRow) => {
        parsedData.push({
          entry: parseInt(row.entry),
          name: row.name,
          modelname: row.modelname,
          race_id: parseInt(row.race_id),
          gender: parseInt(row.gender),
          unique_voice_name: row.unique_voice_name,
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

  await prisma.warcraftNpcDisplays.deleteMany();
  await prisma.warcraftNpc.deleteMany();
  await prisma.warcraftNpcDisplays.deleteMany();

  const progressBar = new SingleBar({}, Presets.shades_classic);
  progressBar.start(data.length, 0); // Start the progress bar with total number of data rows

  for (const row of data) {
    if (row.unique_voice_name == "-1") {
      progressBar.increment();
      continue;
    }
    await prisma.warcraftNpcDisplays.create({
      data: {
        display: {
          connectOrCreate: {
            where: {
              modelFilePath: row.modelname,
            },
            create: {
              modelFilePath: row.modelname,
              raceId: row.race_id,
              genderId: row.gender,
              voiceName: row.unique_voice_name,
            },
          },
        },
        npc: {
          connectOrCreate: {
            where: { npcId: row.entry },
            create: {
              npcId: row.entry,
              name: row.name,
              uniqueWarcraftNpc: {
                connectOrCreate: {
                  where: { name: row.name },
                  create: { name: row.name },
                },
              },
            },
          },
        },
      },
    });
    progressBar.increment();
  }
  progressBar.stop();
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
