/*
  Warnings:

  - You are about to drop the column `vehicle_id` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle_id` on the `FuelingEvent` table. All the data in the column will be lost.
  - The primary key for the `Vehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `vehicle_id` on the `Vehicle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[plate]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `plate` to the `FuelingEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plate` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "FuelingEvent" DROP CONSTRAINT "FuelingEvent_vehicle_id_fkey";

-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "vehicle_id",
ADD COLUMN     "plate" TEXT;

-- AlterTable
ALTER TABLE "FuelingEvent" DROP COLUMN "vehicle_id",
ADD COLUMN     "plate" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_pkey",
DROP COLUMN "vehicle_id",
ADD COLUMN     "plate" TEXT NOT NULL,
ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("plate");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_plate_fkey" FOREIGN KEY ("plate") REFERENCES "Vehicle"("plate") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingEvent" ADD CONSTRAINT "FuelingEvent_plate_fkey" FOREIGN KEY ("plate") REFERENCES "Vehicle"("plate") ON DELETE RESTRICT ON UPDATE CASCADE;
