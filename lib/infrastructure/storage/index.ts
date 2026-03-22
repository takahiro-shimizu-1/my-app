/**
 * Storage Abstraction
 *
 * Unified interface for file storage (GCS in production, local in development).
 * Replaces the scattered GCS helper functions from the original main.py.
 */

export interface StorageClient {
  exists(path: string): Promise<boolean>;
  upload(path: string, data: Buffer, contentType?: string): Promise<void>;
  download(path: string): Promise<Buffer>;
  list(prefix: string): Promise<string[]>;
}

/**
 * Local filesystem storage for development.
 */
export class LocalStorageClient implements StorageClient {
  constructor(private baseDir: string) {}

  async exists(path: string): Promise<boolean> {
    const fs = await import("fs/promises");
    const fullPath = `${this.baseDir}/${path}`;
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async upload(path: string, data: Buffer): Promise<void> {
    const fs = await import("fs/promises");
    const nodePath = await import("path");
    const fullPath = `${this.baseDir}/${path}`;
    await fs.mkdir(nodePath.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async download(path: string): Promise<Buffer> {
    const fs = await import("fs/promises");
    const fullPath = `${this.baseDir}/${path}`;
    return fs.readFile(fullPath);
  }

  async list(prefix: string): Promise<string[]> {
    const fs = await import("fs/promises");
    const nodePath = await import("path");
    const fullPath = `${this.baseDir}/${prefix}`;
    try {
      const entries = await fs.readdir(fullPath, { recursive: true });
      return entries.map((e) => nodePath.join(prefix, String(e)));
    } catch {
      return [];
    }
  }
}

/**
 * Google Cloud Storage client for production.
 * Requires @google-cloud/storage package (install separately).
 */
export class GcsStorageClient implements StorageClient {
  private bucketName: string;
  private storageModule: unknown;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  private async getStorage(): Promise<{ bucket(name: string): { file(path: string): { exists(): Promise<[boolean]>; save(data: Buffer, opts?: { contentType?: string }): Promise<void>; download(): Promise<[Buffer]> }; getFiles(opts: { prefix: string }): Promise<[Array<{ name: string }>]> } }> {
    if (!this.storageModule) {
      // Dynamic import - @google-cloud/storage must be installed
      const mod = await import(/* webpackIgnore: true */ "@google-cloud/storage" as string);
      this.storageModule = new mod.Storage();
    }
    return this.storageModule as ReturnType<GcsStorageClient["getStorage"]> extends Promise<infer T> ? T : never;
  }

  async exists(path: string): Promise<boolean> {
    const storage = await this.getStorage();
    const [exists] = await storage.bucket(this.bucketName).file(path).exists();
    return exists;
  }

  async upload(path: string, data: Buffer, contentType?: string): Promise<void> {
    const storage = await this.getStorage();
    await storage.bucket(this.bucketName).file(path).save(data, { contentType });
  }

  async download(path: string): Promise<Buffer> {
    const storage = await this.getStorage();
    const [content] = await storage.bucket(this.bucketName).file(path).download();
    return content;
  }

  async list(prefix: string): Promise<string[]> {
    const storage = await this.getStorage();
    const [files] = await storage.bucket(this.bucketName).getFiles({ prefix });
    return files.map((f: { name: string }) => f.name);
  }
}

/**
 * Factory: create storage client based on environment.
 */
export function createStorageClient(): StorageClient {
  const gcsBucket = process.env.GCS_BUCKET;
  if (gcsBucket) {
    return new GcsStorageClient(gcsBucket);
  }
  return new LocalStorageClient(process.env.STORAGE_DIR ?? "./storage");
}
