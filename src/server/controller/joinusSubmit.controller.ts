import type { Context } from "koa";
import type { JoinUsSubmitService } from "../services/joinusSubmit.service";
import { AppError } from "../types/api";

type UploadedTempFile = {
    filepath?: string;
    filePath?: string;
    path?: string;
    mimetype?: string;
    originalName?: string;
    originalFilename?: string;
    newFilename?: string;
};

type UploadedFile = {
    buffer: Buffer;
    mimetype: string;
    originalName: string;
};

function getUploadedTempFilePath(file: UploadedTempFile): string {
    const p = file.filepath ?? file.filePath ?? file.path;
    if (!p) throw new Error('NO_FILE_PATH');
    return p;
}

async function readUploadedBufferAndUnlink(file: UploadedTempFile): Promise<UploadedFile> {
    const { readFile, unlink } = await import('node:fs/promises');
    const filePath = getUploadedTempFilePath(file);

    let buffer: Buffer;
    try {
        buffer = await readFile(filePath);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'READ_FILE_FAILED';
        throw new Error(`READ_FILE_FAILED: ${msg}`);
    }

    await unlink(filePath).catch(() => undefined);

    const mimetype = file.mimetype ?? 'application/octet-stream';
    const originalName =
        file.originalName ??
        file.originalFilename ??
        (file as any).name ??
        (file as any).filename ??
        file.newFilename ??
        'attachment';

    return { buffer, mimetype, originalName };
}

function toBodyRecord(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};
    return body as Record<string, unknown>;
}

function toFileList(raw: unknown): UploadedTempFile[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw as UploadedTempFile[];
	return [raw as UploadedTempFile];
}

export class JoinusSubmitController {
    constructor(private service: JoinUsSubmitService) {}

    submitAnonymous = async (ctx: Context) => {
        const fields = toBodyRecord(ctx.request.body);
        const portfolioRaw = (ctx.request.files as any)?.portfolio;

        const tmpFiles = toFileList(portfolioRaw);
        const uploads: UploadedFile[] = [];
        for (const f of tmpFiles) {
            uploads.push(await readUploadedBufferAndUnlink(f));
        }

        try {
            await this.service.submitAnonymous(fields, uploads);
        } catch (e) {
            if (e instanceof AppError) throw e;
            const msg = e instanceof Error ? e.message : 'SUBMIT_FAILED';
            throw new AppError(400, 'SUBMIT_FAILED', msg);
        }

        ctx.body = { ok: true };
    };
}
