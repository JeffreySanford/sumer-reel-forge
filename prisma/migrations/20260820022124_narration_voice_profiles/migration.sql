-- CreateEnum
CREATE TYPE "narration_engine" AS ENUM ('CHATTERBOX', 'KOKORO');

-- CreateEnum
CREATE TYPE "narration_style_preset" AS ENUM ('DOCUMENTARY', 'INTIMATE', 'MYTHIC', 'DRAMATIC', 'ARCHIVAL');

-- CreateEnum
CREATE TYPE "narration_role_type" AS ENUM ('NARRATOR', 'CHARACTER', 'ARCHIVAL', 'CHORUS');

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "narration_override_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "narration_style_notes" TEXT,
ADD COLUMN     "narration_style_preset" "narration_style_preset",
ADD COLUMN     "narration_voice_id" UUID;

-- AlterTable
ALTER TABLE "studio_projects" ADD COLUMN     "default_narration_voice_id" UUID,
ADD COLUMN     "narration_style_notes" TEXT,
ADD COLUMN     "narration_style_preset" "narration_style_preset" NOT NULL DEFAULT 'MYTHIC';

-- CreateTable
CREATE TABLE "narration_voice_profiles" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "engine" "narration_engine" NOT NULL,
    "model" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "provider_voice" TEXT,
    "reference_audio_uri" TEXT,
    "reference_audio_checksum" TEXT,
    "rights_basis" TEXT,
    "rights_confirmed_at" TIMESTAMPTZ(6),
    "default_exaggeration" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "default_cfg_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "default_temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "narration_voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_narration_roles" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "role_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role_type" "narration_role_type" NOT NULL,
    "voice_profile_id" UUID,
    "style_preset" "narration_style_preset",
    "style_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chapter_narration_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "narration_voice_profiles_slug_key" ON "narration_voice_profiles"("slug");

-- CreateIndex
CREATE INDEX "narration_voice_profiles_active_engine_idx" ON "narration_voice_profiles"("active", "engine");

-- CreateIndex
CREATE INDEX "chapter_narration_roles_voice_profile_id_idx" ON "chapter_narration_roles"("voice_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_narration_roles_chapter_id_role_key_key" ON "chapter_narration_roles"("chapter_id", "role_key");

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_default_narration_voice_id_fkey" FOREIGN KEY ("default_narration_voice_id") REFERENCES "narration_voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_narration_voice_id_fkey" FOREIGN KEY ("narration_voice_id") REFERENCES "narration_voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_narration_roles" ADD CONSTRAINT "chapter_narration_roles_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_narration_roles" ADD CONSTRAINT "chapter_narration_roles_voice_profile_id_fkey" FOREIGN KEY ("voice_profile_id") REFERENCES "narration_voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
