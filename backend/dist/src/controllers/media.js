import { getUploadSignature } from '../services/media.js';
export async function signature(_req, res) {
    const signatureData = getUploadSignature();
    return res.json(signatureData);
}
//# sourceMappingURL=media.js.map