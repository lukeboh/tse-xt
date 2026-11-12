/** Cliente da API oficial v2. Token somente em memoria; nao imprime respostas brutas. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export function compareVersions(a, b) {
  const parse = v => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)) throw new Error('INVALID_VERSION');
    const parts = v.split('.').map(Number);
    if (parts.some(n => n > 65535)) throw new Error('INVALID_VERSION');
    return parts;
  };
  const aa = parse(a), bb = parse(b);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return Math.sign(aa[i] - bb[i]);
  return 0;
}

function revision(status) {
  if (!status) return null;
  return { state: status.state || '', versions: (status.distributionChannels || []).map(c => c.crxVersion).filter(Boolean) };
}

export function summarizeStatus(status) {
  return { published: revision(status.publishedItemRevisionStatus), submitted: revision(status.submittedItemRevisionStatus),
    uploadState: status.lastAsyncUploadState || '', takenDown: !!status.takenDown, warned: !!status.warned };
}

export function createClient({ publisherId, itemId, token, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), maxPolls = 24 }) {
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(publisherId || '')) throw new Error('INVALID_PUBLISHER_ID');
  if (!/^[a-p]{32}$/.test(itemId || '')) throw new Error('INVALID_ITEM_ID');
  if (!token || /[\r\n]/.test(token)) throw new Error('MISSING_ACCESS_TOKEN');
  const name = `publishers/${publisherId}/items/${itemId}`;
  async function request(operation, body) {
    const media = operation === 'upload';
    const url = `https://chromewebstore.googleapis.com/${media ? 'upload/' : ''}v2/${name}:${operation}`;
    let response;
    try {
      response = await fetchImpl(url, { method: operation === 'fetchStatus' ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': media ? 'application/zip' : 'application/json' } : {}) },
        ...(body ? { body } : {}), redirect: 'error', signal: AbortSignal.timeout(60000) });
    } catch { throw new Error(`CWS_CONNECTION_FAILED_${operation}`); }
    if (!response.ok) throw new Error(`CWS_HTTP_${response.status}_${operation}`);
    try { return await response.json(); } catch { throw new Error(`CWS_INVALID_RESPONSE_${operation}`); }
  }
  const status = () => request('fetchStatus');
  async function execute({ operation = 'status', version, packageBytes }) {
    if (!['status','upload','submit'].includes(operation)) throw new Error('INVALID_OPERATION');
    let current = await status();
    if (operation === 'status') return { operation, status: summarizeStatus(current) };
    compareVersions(version, version);
    if (!(packageBytes instanceof Uint8Array) || packageBytes.length < 4 || packageBytes[0] !== 0x50 || packageBytes[1] !== 0x4b)
      throw new Error('INVALID_ZIP');
    if (current.takenDown || current.warned) throw new Error('PUBLISHER_ACTION_REQUIRED');
    const submitted = revision(current.submittedItemRevisionStatus);
    if (submitted && ['PENDING_REVIEW','STAGED'].includes(submitted.state)) {
      if (submitted.versions.includes(version)) return { operation, version, result:'already-submitted', status:summarizeStatus(current) };
      throw new Error('ANOTHER_REVIEW_IN_PROGRESS');
    }
    const published = revision(current.publishedItemRevisionStatus);
    for (const previous of published?.versions || []) if (compareVersions(version, previous) <= 0) throw new Error('VERSION_NOT_NEWER');
    const uploaded = await request('upload', packageBytes);
    if (uploaded.crxVersion && uploaded.crxVersion !== version) throw new Error('UPLOADED_VERSION_MISMATCH');
    let uploadState = uploaded.uploadState;
    for (let i = 0; uploadState === 'IN_PROGRESS' && i < maxPolls; i++) {
      await sleep(2500);
      current = await status();
      uploadState = current.lastAsyncUploadState;
    }
    if (uploadState !== 'SUCCEEDED') throw new Error(uploadState === 'IN_PROGRESS' ? 'UPLOAD_TIMEOUT' : 'UPLOAD_FAILED');
    if (operation === 'upload') return { operation, version, result:'uploaded', status:summarizeStatus(await status()) };
    const submittedResult = await request('publish', JSON.stringify({ publishType:'STAGED_PUBLISH', skipReview:false, blockOnWarnings:true }));
    return { operation, version, result:'submitted-for-review', submissionState:submittedResult.state || '', status:summarizeStatus(await status()) };
  }
  return { status, execute };
}

async function main() {
  const operation = process.env.CWS_OPERATION || 'status';
  const client = createClient({ publisherId:process.env.CWS_PUBLISHER_ID, itemId:process.env.CWS_ITEM_ID, token:process.env.CWS_ACCESS_TOKEN });
  const bytes = operation === 'status' ? undefined : await readFile(process.env.CWS_PACKAGE_PATH);
  const result = await client.execute({ operation, version:process.env.CWS_VERSION, packageBytes:bytes });
  // Somente campos selecionados: nunca token, chave publica do item ou erro bruto.
  console.log(JSON.stringify(result, null, 2));
  const output = process.env.CWS_RESULT_PATH;
  if (output) { await mkdir(path.dirname(output), { recursive:true }); await writeFile(output, JSON.stringify(result,null,2) + '\n'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    const safe = /^[A-Z][A-Za-z0-9_]+$/.test(error.message || '') ? error.message : 'CWS_EXECUTION_FAILED';
    console.error(safe); process.exitCode = 1;
  });
}
