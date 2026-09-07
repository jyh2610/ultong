-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('local', 'kakao', 'google', 'naver', 'apple');

-- CreateEnum
CREATE TYPE "pet_species" AS ENUM ('dog', 'cat', 'other');

-- CreateEnum
CREATE TYPE "pet_size" AS ENUM ('초소형', '소형', '중소형', '중형', '중대형', '대형');

-- CreateEnum
CREATE TYPE "report_type" AS ENUM ('denied_entry', 'rule_changed', 'closed', 'incorrect_info', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'reviewing', 'resolved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "provider" "auth_provider" NOT NULL DEFAULT 'local',
    "provider_uid" VARCHAR(191),
    "email" VARCHAR(254),
    "password_hash" VARCHAR(255),
    "nickname" VARCHAR(30) NOT NULL,
    "profile_image_url" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "species" "pet_species" NOT NULL,
    "breed" VARCHAR(50),
    "weight_kg" DECIMAL(5,2),
    "size_class" "pet_size",
    "has_cage" BOOLEAN NOT NULL DEFAULT false,
    "is_dangerous_breed" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" BIGINT NOT NULL,
    "content_id" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","content_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" BIGSERIAL NOT NULL,
    "content_id" VARCHAR(20) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "report_type" NOT NULL,
    "detail" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "reported_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_report_stats" (
    "content_id" VARCHAR(20) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "last_reported_at" TIMESTAMPTZ,
    "warning" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMPTZ,

    CONSTRAINT "place_report_stats_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "share_slug" VARCHAR(32),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_items" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "day_no" SMALLINT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "content_id" VARCHAR(20) NOT NULL,
    "title_snapshot" VARCHAR(200),
    "memo" TEXT,

    CONSTRAINT "course_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_provider" ON "users"("provider", "provider_uid");

-- CreateIndex (partial: 탈퇴 계정의 이메일은 재사용 가능해야 하므로 활성 계정에만 유니크)
CREATE UNIQUE INDEX "uq_users_email_active" ON "users"(lower("email")) WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;

-- CheckConstraint
ALTER TABLE "users" ADD CONSTRAINT "ck_users_credential" CHECK (
  ("provider" = 'local' AND "email" IS NOT NULL AND "password_hash" IS NOT NULL) OR
  ("provider" <> 'local' AND "provider_uid" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "pets_user_id_idx" ON "pets"("user_id");

-- CreateIndex
CREATE INDEX "favorites_content_id_idx" ON "favorites"("content_id");

-- CreateIndex
CREATE INDEX "reports_content_id_idx" ON "reports"("content_id");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "courses_user_id_idx" ON "courses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_courses_share_slug" ON "courses"("share_slug");

-- CreateIndex
CREATE INDEX "course_items_course_id_day_no_sort_order_idx" ON "course_items"("course_id", "day_no", "sort_order");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_items" ADD CONSTRAINT "course_items_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
