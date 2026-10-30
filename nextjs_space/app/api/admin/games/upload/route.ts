export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadBufferToS3 } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';
import AdmZip from 'adm-zip';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const slug = formData.get('slug') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !name || !slug) {
      return NextResponse.json({ error: 'file, name, and slug are required' }, { status: 400 });
    }

    // Validate slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens' }, { status: 400 });
    }

    // Check slug is unique
    const existing = await prisma.game.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A game with this slug already exists' }, { status: 409 });
    }

    // Read zip
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const { folderPrefix } = getBucketConfig();
    const basePath = `${folderPrefix}public/games/${slug}`;

    let uploadedCount = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
      const key = `${basePath}/${entry.entryName}`;

      await uploadBufferToS3(entry.getData(), key, contentType);
      uploadedCount++;
    }

    // Register game in DB
    const game = await prisma.game.create({
      data: {
        name,
        slug,
        description: description ?? '',
        cloudStoragePath: basePath,
        isPublic: true,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json({
      id: game.id,
      slug: game.slug,
      filesUploaded: uploadedCount,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Game upload error:', err);
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 });
  }
}
