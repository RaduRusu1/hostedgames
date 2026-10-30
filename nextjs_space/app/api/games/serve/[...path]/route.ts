export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params;
    if (!segments?.length) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    const { folderPrefix } = getBucketConfig();
    const filePath = segments.join('/');
    const key = `${folderPrefix}public/games/${filePath}`;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    const response = await getFileStream(key);
    const body = await response.Body?.transformToByteArray();

    if (!body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
