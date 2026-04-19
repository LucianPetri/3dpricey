CREATE TABLE "LaserQuoteData" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "designPath" TEXT,
    "designWidth" DOUBLE PRECISION NOT NULL,
    "designHeight" DOUBLE PRECISION NOT NULL,
    "estimatedCutTime" DOUBLE PRECISION NOT NULL,
    "estimatedEngravingTime" DOUBLE PRECISION,
    "materialSurfaceArea" DOUBLE PRECISION NOT NULL,
    "laserPower" DOUBLE PRECISION,
    "focusLensReplacement" BOOLEAN NOT NULL DEFAULT false,
    "laserTubeAge" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LaserQuoteData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmbroideryQuoteData" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "designPath" TEXT,
    "stitchCount" INTEGER NOT NULL,
    "designWidth" DOUBLE PRECISION NOT NULL,
    "designHeight" DOUBLE PRECISION NOT NULL,
    "estimatedEmbroideryTime" DOUBLE PRECISION NOT NULL,
    "baseGarmentCost" DOUBLE PRECISION NOT NULL,
    "threadCount" INTEGER NOT NULL,
    "needleSize" TEXT,
    "backingMaterialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmbroideryQuoteData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrinterConnectionState" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "lastReconnectAt" TIMESTAMP(3),
    "reconnectError" TEXT,
    "assignedJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrinterConnectionState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaserQuoteData_quoteId_key" ON "LaserQuoteData"("quoteId");
CREATE UNIQUE INDEX "EmbroideryQuoteData_quoteId_key" ON "EmbroideryQuoteData"("quoteId");
CREATE UNIQUE INDEX "PrinterConnectionState_machineId_key" ON "PrinterConnectionState"("machineId");

ALTER TABLE "LaserQuoteData"
    ADD CONSTRAINT "LaserQuoteData_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmbroideryQuoteData"
    ADD CONSTRAINT "EmbroideryQuoteData_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrinterConnectionState"
    ADD CONSTRAINT "PrinterConnectionState_machineId_fkey"
    FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;