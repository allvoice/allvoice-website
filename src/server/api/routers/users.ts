import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  createMock: publicProcedure.query(async ({ input, ctx }) => {
    const user = await ctx.prisma.user.create({
      data: {},
    });
    return user;
  }),
});
