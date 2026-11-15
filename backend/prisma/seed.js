// Seeds the shared catalogue (genres + media). Safe to run more than once:
// existing genres are kept and titles that already exist are skipped.
// Run with: npm run db:seed
const prisma = require("../src/config/prisma");
const { genres, movies, tvShows } = require("./seed-data");

async function seedGenres() {
  for (const name of genres) {
    await prisma.genre.upsert({ where: { name }, update: {}, create: { name } });
  }
  const rows = await prisma.genre.findMany();
  return new Map(rows.map((g) => [g.name, g.id]));
}

// Creates the Media row and its detail row in one query, so a title never
// exists without its MOVIE / TV_SHOW details (ERD rules BR-1 to BR-4).
async function seedMedia(item, type, genreIds) {
  const exists = await prisma.media.findFirst({ where: { title: item.title, type } });
  if (exists) return false;

  await prisma.media.create({
    data: {
      title: item.title,
      description: item.description,
      releaseDate: new Date(`${item.releaseDate}T00:00:00Z`),
      type,
      ...(type === "MOVIE"
        ? { movieDetails: { create: { duration: item.duration } } }
        : {
            tvShowDetails: {
              create: {
                numberOfSeasons: item.numberOfSeasons,
                numberOfEpisodes: item.numberOfEpisodes,
              },
            },
          }),
      genres: {
        create: item.genres.map((name) => {
          const genreId = genreIds.get(name);
          if (!genreId) throw new Error(`Unknown genre "${name}" for "${item.title}"`);
          return { genreId };
        }),
      },
    },
  });
  return true;
}

async function main() {
  const genreIds = await seedGenres();
  let created = 0;
  for (const movie of movies) if (await seedMedia(movie, "MOVIE", genreIds)) created++;
  for (const show of tvShows) if (await seedMedia(show, "TV_SHOW", genreIds)) created++;
  const total = movies.length + tvShows.length;
  console.log(`Seed complete: ${genreIds.size} genres, ${created} new titles (${total - created} already present).`);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
