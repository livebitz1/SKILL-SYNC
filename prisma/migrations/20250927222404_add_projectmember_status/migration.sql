-- CreateEnum
CREATE TYPE "public"."ProjectMemberStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."ProjectMember" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "agreedToGuidelines" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availability" TEXT,
ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "motivation" TEXT,
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "preferredRole" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "public"."ProjectMemberStatus" NOT NULL DEFAULT 'APPLIED';
