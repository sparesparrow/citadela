-- Segment poptavky, firemni fakturacni udaje a zajem o pujcovnu.
-- Segment je slug (ciselnik zije v src/lib/site.ts), ne enum — stejne jako roomSlug.
ALTER TABLE "Inquiry" ADD COLUMN     "segment" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "vatId" TEXT,
ADD COLUMN     "rentalInterest" TEXT[];

-- CreateIndex
CREATE INDEX "Inquiry_segment_createdAt_idx" ON "Inquiry"("segment", "createdAt");
