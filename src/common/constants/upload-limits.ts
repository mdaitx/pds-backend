/**
 * Limite de tamanho para uploads multipart (Multer).
 * 5 MB é pouco para fotos direto do celular; 15 MB cobre a maioria dos JPEG/PNG.
 */
export const UPLOAD_MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
