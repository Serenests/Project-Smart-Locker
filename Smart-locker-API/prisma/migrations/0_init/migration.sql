-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Camera" (
    "camera_id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("camera_id")
);

-- CreateTable
CREATE TABLE "public"."Group_Location" (
    "group_location_id" SERIAL NOT NULL,
    "group_location_name" VARCHAR(45) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Group_Location_pkey" PRIMARY KEY ("group_location_id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "location_id" SERIAL NOT NULL,
    "group_location_id" INTEGER NOT NULL,
    "location_name" VARCHAR(45),
    "latitude" VARCHAR(100),
    "longitude" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "public"."Locker" (
    "locker_id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "locker_location_detail" VARCHAR(100),
    "locker_status" BOOLEAN NOT NULL DEFAULT false,
    "api_token" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Locker_pkey" PRIMARY KEY ("locker_id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "product_id" VARCHAR(45) NOT NULL,
    "product_name" VARCHAR(45),
    "product_detail" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(45) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "public"."Slot" (
    "slot_id" SERIAL NOT NULL,
    "locker_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "slot_status" VARCHAR(45),
    "capacity" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "public"."Slot_stock" (
    "slot_stock_id" SERIAL NOT NULL,
    "lot_id" VARCHAR(45) NOT NULL,
    "product_id" VARCHAR(45) NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "amount" INTEGER,
    "expired_at" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Slot_stock_pkey" PRIMARY KEY ("slot_stock_id")
);

-- CreateTable
CREATE TABLE "public"."Snapshot" (
    "snapshot_id" SERIAL NOT NULL,
    "image_path" VARCHAR(255),
    "transaction_id" INTEGER NOT NULL,
    "transaction_detail_id" INTEGER NOT NULL,
    "slot_stock_id" INTEGER NOT NULL,
    "camera_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "activity" VARCHAR(45),
    "status" VARCHAR(45),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "public"."Transaction_detail" (
    "transaction_detail_id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "product_id" VARCHAR(45) NOT NULL,
    "slot_stock_id" INTEGER NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "amount" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Transaction_detail_pkey" PRIMARY KEY ("transaction_detail_id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" INTEGER,
    "group_location_id" INTEGER,
    "citizen_id" TEXT,
    "card_uid" TEXT,
    "citizen_id_search" TEXT,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "date_of_birth" DATE,
    "religion" VARCHAR(45),
    "gender" VARCHAR(45),
    "email" VARCHAR(100),
    "password" TEXT,
    "phone_number" VARCHAR(45),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."User_locker_grant" (
    "user_locker_grant_id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_by" VARCHAR(100),
    "permission_withdraw" INTEGER,
    "permission_restock" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "locker_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "User_locker_grant_pkey" PRIMARY KEY ("user_locker_grant_id")
);

-- CreateTable
CREATE TABLE "public"."Locker_Provision" (
    "provision_id" SERIAL NOT NULL,
    "locker_id" INTEGER NOT NULL,
    "provision_code" VARCHAR(6) NOT NULL,
    "is_activated" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "Locker_Provision_pkey" PRIMARY KEY ("provision_id")
);

-- CreateTable
CREATE TABLE "public"."qr_task" (
    "task_id" TEXT NOT NULL,
    "locker_id" INTEGER NOT NULL,
    "task_type" TEXT NOT NULL,
    "assigned_user_id" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "items_json" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "qr_task_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Locker_Provision_locker_id_key" ON "public"."Locker_Provision"("locker_id");

-- CreateIndex
CREATE UNIQUE INDEX "Locker_Provision_provision_code_key" ON "public"."Locker_Provision"("provision_code");

-- CreateIndex
CREATE UNIQUE INDEX "qr_task_qr_token_key" ON "public"."qr_task"("qr_token");

-- AddForeignKey
ALTER TABLE "public"."Camera" ADD CONSTRAINT "fk_camera_slot" FOREIGN KEY ("slot_id") REFERENCES "public"."Slot"("slot_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "fk_location_group" FOREIGN KEY ("group_location_id") REFERENCES "public"."Group_Location"("group_location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Locker" ADD CONSTRAINT "fk_locker_location" FOREIGN KEY ("location_id") REFERENCES "public"."Location"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Slot" ADD CONSTRAINT "fk_slot_location" FOREIGN KEY ("location_id") REFERENCES "public"."Location"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Slot" ADD CONSTRAINT "fk_slot_locker" FOREIGN KEY ("locker_id") REFERENCES "public"."Locker"("locker_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Slot_stock" ADD CONSTRAINT "fk_stock_product" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Slot_stock" ADD CONSTRAINT "fk_stock_slot" FOREIGN KEY ("slot_id") REFERENCES "public"."Slot"("slot_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "fk_snapshot_camera" FOREIGN KEY ("camera_id") REFERENCES "public"."Camera"("camera_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "fk_snapshot_detail" FOREIGN KEY ("transaction_detail_id") REFERENCES "public"."Transaction_detail"("transaction_detail_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "fk_snapshot_stock" FOREIGN KEY ("slot_stock_id") REFERENCES "public"."Slot_stock"("slot_stock_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "fk_snapshot_transaction" FOREIGN KEY ("transaction_id") REFERENCES "public"."Transaction"("transaction_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "fk_transaction_user" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Transaction_detail" ADD CONSTRAINT "fk_detail_product" FOREIGN KEY ("product_id") REFERENCES "public"."Product"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Transaction_detail" ADD CONSTRAINT "fk_detail_slot" FOREIGN KEY ("slot_id") REFERENCES "public"."Slot"("slot_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Transaction_detail" ADD CONSTRAINT "fk_detail_stock" FOREIGN KEY ("slot_stock_id") REFERENCES "public"."Slot_stock"("slot_stock_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Transaction_detail" ADD CONSTRAINT "fk_detail_transaction" FOREIGN KEY ("transaction_id") REFERENCES "public"."Transaction"("transaction_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "fk_user_group_location" FOREIGN KEY ("group_location_id") REFERENCES "public"."Group_Location"("group_location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "fk_user_location" FOREIGN KEY ("location_id") REFERENCES "public"."Location"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "fk_user_role" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User_locker_grant" ADD CONSTRAINT "fk_grant_location" FOREIGN KEY ("location_id") REFERENCES "public"."Location"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User_locker_grant" ADD CONSTRAINT "fk_grant_locker" FOREIGN KEY ("locker_id") REFERENCES "public"."Locker"("locker_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."User_locker_grant" ADD CONSTRAINT "fk_grant_user" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."Locker_Provision" ADD CONSTRAINT "fk_provision_locker" FOREIGN KEY ("locker_id") REFERENCES "public"."Locker"("locker_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

