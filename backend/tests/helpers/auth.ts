import { prisma } from '../../src/lib/prisma';

export async function verifyUserEmail(email: string) {
  await prisma.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyTokenExp: null },
  });
}
