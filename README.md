# allvoice

[JOIN THE DISCORD](https://discord.gg/bwJFfRRcMB)

This website's goal is to be used as a generic voice library for gamers and game developers to pull from for curated, high quality, AI generated, voiceover models. Generic meaning multiple languagues and games.

This site is mainly built using [nextjs](https://nextjs.org/) with the starter template from [create-t3-app](https://create.t3.gg/).

## Current Goal

This website is going to support [World of Warcraft VoiceOver](https://github.com/mrthinger/wow-voiceover) in its mission to create high quality voiceovers for all NPCs in Vanilla, TBC, and Wrath. In order to do this there are 2 main functions.

### Creating Voices

allvoice features a robust voice editor that makes it easy for anyone to contribute voice models for NPCs.

### Rating Voices

allvoice allows the community to rate voices, ensuring each NPC has the highest quality voice model selected for it. allvoice should order which voices are most important for the community to rate.

## Contributing

I am going to try to populate this README and github issues with modular pieces of work, but it is high effort. If you'd really like to help [join the discord](https://discord.gg/bwJFfRRcMB) and I (@mrthinger) would be more than happy to hop on a short voicecall and walk you through the project.

## Setup

All of the setup is required to run.

### setup software

- node lts v20 (i use [nvm](https://github.com/nvm-sh/nvm) / [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage my node installs)
- [pnpm](https://pnpm.io/installation) (performant npm)
- [docker](https://www.docker.com/) (manages local db + s3 bucket from docker-compose)

### setup project

- clone project
- open in vscode or [cursor](https://cursor.sh/)
- `pnpm install`
- `docker compose up -d` for postgres and s3
- copy .env.example to .env `cp .env.example .env`

### setup db

#### short term easy shortcut

**UPDATE** (9/1/2024): migrated off mysql planetscale to postgres. Keeping this here because it still contains NPC data that could be converted to postgres.

- run allvoice.sql script found here: https://github.com/allvoice/allvoice-website/releases/tag/db-v1.0.0
- run `pnpm db:push` to update the database schema.

#### long term instructions

- run `pnpm db:push` to push the database schema.
- run `pnpm db:seed`
- note: this might take a few mins so move on
- note: this method is missing voiceline content

### setup clerk

- setup a [clerk](https://clerk.com) account for auth (should take less than 2 mins)
- update .env with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY

### setup elevenlabs

- setup an [elevenlabs](https://elevenlabs.io) account for voice generation (need at least the $1 paid tier)
- update .env with ELEVENLABS_API_KEY

### setup s3 bucket

- navigate to <http://localhost:9001> to make a local s3 bucket and access key
- update .env with BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY
- install [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- run `./bucket-config/apply-bucket-configs.sh`

### run the website

- `pnpm dev`

## [cursor](https://cursor.sh/) prompt

`im using typescript, functional react 18, nextjs page router, tailwind, trpc, prisma, and react query 5 with the trpc integration. T3 stack is the name of the stack im using. use env instead of process.env`
