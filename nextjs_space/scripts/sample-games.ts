import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { uploadBufferToS3 } from '../lib/s3';
import { getBucketConfig } from '../lib/aws-config';

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export const SAMPLE_GAMES = [
  {
    slug: 'checkers',
    name: 'Checkers',
    description: 'Classic checkers (English draughts) — play a friend or the computer (levels 1–10), with Undo, Suggest and move-by-move commentary.',
    dir: 'checkers',
  },
  {
    slug: 'gomoku',
    name: 'Gomoku',
    description: 'Five in a row on a 15×15 board — play a friend or the computer (levels 1–10), with Undo, Suggest and move-by-move commentary.',
    dir: 'gomoku',
  },
  {
    slug: 'chinesecheckers',
    name: 'Chinese Checkers',
    description: 'Race your ten marbles across the star with steps and chained jumps — play a friend or the computer (levels 1–10), with last-move highlight, Undo, Suggest and commentary.',
    dir: 'chinesecheckers',
  },
  {
    slug: 'ninemensmorris',
    name: "Nine Men's Morris",
    description: 'Place, slide and fly your pieces to form mills — play a friend or the computer (levels 1–10), with last-move highlight, Undo, Suggest and commentary.',
    dir: 'ninemensmorris',
  },
];

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

/** Uploads the sample games in ../samples to cloud storage and registers them (idempotent). */
export async function installSampleGames(prisma: PrismaClient) {
  const samplesRoot = path.resolve(process.cwd(), '..', 'samples');
  const { bucketName, folderPrefix } = getBucketConfig();
  if (!bucketName) {
    console.warn('AWS_BUCKET_NAME not set — skipping sample games');
    return;
  }

  for (const g of SAMPLE_GAMES) {
    const srcDir = path.join(samplesRoot, g.dir);
    if (!fs.existsSync(path.join(srcDir, 'index.html'))) {
      console.warn(`Sample ${g.slug} not found at ${srcDir} — skipping`);
      continue;
    }
    const basePath = `${folderPrefix}public/games/${g.slug}`;
    for (const rel of listFiles(srcDir)) {
      const ext = path.extname(rel).toLowerCase();
      await uploadBufferToS3(fs.readFileSync(path.join(srcDir, rel)), `${basePath}/${rel.split(path.sep).join('/')}`, MIME[ext] ?? 'application/octet-stream');
    }
    await prisma.game.upsert({
      where: { slug: g.slug },
      update: { cloudStoragePath: basePath, description: g.description },
      create: { name: g.name, slug: g.slug, description: g.description, cloudStoragePath: basePath, isPublic: true },
    });
    console.log(`Sample game installed: ${g.slug}`);
  }
}
