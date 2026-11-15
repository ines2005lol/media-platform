-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_media" (
    "collection_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_media_pkey" PRIMARY KEY ("collection_id","media_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "preference_type" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "release_date" DATE,
    "poster_url" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movie_details" (
    "media_id" UUID NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "movie_details_pkey" PRIMARY KEY ("media_id")
);

-- CreateTable
CREATE TABLE "tv_show_details" (
    "media_id" UUID NOT NULL,
    "number_of_seasons" INTEGER NOT NULL,
    "number_of_episodes" INTEGER NOT NULL,

    CONSTRAINT "tv_show_details_pkey" PRIMARY KEY ("media_id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_genres" (
    "media_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,

    CONSTRAINT "media_genres_pkey" PRIMARY KEY ("media_id","genre_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "collections_user_id_name_key" ON "collections"("user_id", "name");

-- CreateIndex
CREATE INDEX "collection_media_media_id_idx" ON "collection_media"("media_id");

-- CreateIndex
CREATE INDEX "user_preferences_media_id_idx" ON "user_preferences"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_media_id_key" ON "user_preferences"("user_id", "media_id");

-- CreateIndex
CREATE INDEX "user_saved_media_media_id_idx" ON "user_saved_media"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_media_user_id_media_id_key" ON "user_saved_media"("user_id", "media_id");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "media_genres_genre_id_idx" ON "media_genres"("genre_id");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_media" ADD CONSTRAINT "collection_media_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_media" ADD CONSTRAINT "collection_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_media" ADD CONSTRAINT "user_saved_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_media" ADD CONSTRAINT "user_saved_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movie_details" ADD CONSTRAINT "movie_details_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_show_details" ADD CONSTRAINT "tv_show_details_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CHECK constraints

-- Media type must be MOVIE or TV_SHOW
ALTER TABLE "media"
ADD CONSTRAINT "media_type_check"
CHECK ("type" IN ('MOVIE', 'TV_SHOW'));

-- Preference must be LIKE or DISLIKE
ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_type_check"
CHECK ("preference_type" IN ('LIKE', 'DISLIKE'));

-- Usernames and emails must be lowercase
ALTER TABLE "users"
ADD CONSTRAINT "users_username_lowercase_check"
CHECK ("username" = LOWER("username"));

ALTER TABLE "users"
ADD CONSTRAINT "users_email_lowercase_check"
CHECK ("email" = LOWER("email"));

-- Movie duration must be positive
ALTER TABLE "movie_details"
ADD CONSTRAINT "movie_duration_positive_check"
CHECK ("duration" > 0);

-- TV show counts must be positive
ALTER TABLE "tv_show_details"
ADD CONSTRAINT "tv_seasons_positive_check"
CHECK ("number_of_seasons" > 0);

ALTER TABLE "tv_show_details"
ADD CONSTRAINT "tv_episodes_positive_check"
CHECK ("number_of_episodes" > 0);
