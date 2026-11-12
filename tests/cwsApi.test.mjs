import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, compareVersions } from '../tools/loja/cws-api.mjs';

const ids = { publisherId:'publisher-model', itemId:'a'.repeat(32), token:'temporary-test-token' };
const zip = new Uint8Array([0x50,0x4b,3,4]);
const published = version => ({ publishedItemRevisionStatus:{ state:'PUBLISHED', distributionChannels:[{crxVersion:version}] } });
const status = published('1.0.0');
function fixture(responses, extra = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url, ...options});
    const next = responses.shift();
    assert.ok(next, 'nenhuma chamada adicional esperada');
    return { ok:next.http == null || next.http === 200, status:next.http || 200, json:async () => next.body || next };
  };
  return { calls, client:createClient({ ...ids, fetchImpl, sleep:async () => {}, ...extra }) };
}

test('CWS: status e padrao somente leitura nao enviam pacote ou submissao', async () => {
  const {client,calls} = fixture([{...status, publicKey:'ignored'}]);
  const result = await client.execute({});
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'GET');
  assert.match(calls[0].url, /:fetchStatus$/);
  assert.deepEqual(result.status.published,{state:'PUBLISHED',versions:['1.0.0']});
  assert.ok(!JSON.stringify(result).includes(ids.token));
  assert.ok(!JSON.stringify(result).includes('publicKey'));
});

test('CWS: envio usa corpo ZIP binario e aguarda processamento assincrono', async () => {
  const {client,calls} = fixture([status,{uploadState:'IN_PROGRESS'}, {...status,lastAsyncUploadState:'IN_PROGRESS'},
    {...status,lastAsyncUploadState:'SUCCEEDED'},status]);
  const result = await client.execute({operation:'upload',version:'1.2.0',packageBytes:zip});
  assert.equal(result.result,'uploaded');
  const uploads = calls.filter(c=>c.url.endsWith(':upload'));
  assert.equal(uploads.length,1);
  assert.equal(uploads[0].body,zip);
  assert.match(uploads[0].url,/\/upload\/v2\//);
  assert.equal(calls.filter(c=>c.method==='POST').length,1);
});

test('CWS: submissao pede revisao e mantem publicacao posterior manual', async () => {
  const pending = {submittedItemRevisionStatus:{state:'PENDING_REVIEW',distributionChannels:[{crxVersion:'1.2.0'}]}};
  const {client,calls} = fixture([status,{uploadState:'SUCCEEDED',crxVersion:'1.2.0'},{state:'PENDING_REVIEW'},pending]);
  const result = await client.execute({operation:'submit',version:'1.2.0',packageBytes:zip});
  const request = calls.find(c=>c.url.endsWith(':publish'));
  assert.deepEqual(JSON.parse(request.body),{publishType:'STAGED_PUBLISH',skipReview:false,blockOnWarnings:true});
  assert.equal(result.submissionState,'PENDING_REVIEW');
});

test('CWS: versao ja em revisao ou aprovada nao e reenviada nem publicada', async () => {
  for(const state of ['PENDING_REVIEW','STAGED']) {
    const {client,calls} = fixture([{submittedItemRevisionStatus:{state,distributionChannels:[{crxVersion:'1.2.0'}]}}]);
    const result = await client.execute({operation:'submit',version:'1.2.0',packageBytes:zip});
    assert.equal(result.result,'already-submitted');
    assert.equal(calls.length,1);
  }
});

test('CWS: nao substitui outra versao em revisao', async () => {
  const {client,calls} = fixture([{submittedItemRevisionStatus:{state:'STAGED',distributionChannels:[{crxVersion:'1.1.0'}]}}]);
  await assert.rejects(client.execute({operation:'submit',version:'1.2.0',packageBytes:zip}),/ANOTHER_REVIEW_IN_PROGRESS/);
  assert.equal(calls.length,1);
});

test('CWS: rejeita downgrade, pacote invalido e versao divergente', async () => {
  for(const version of ['1.0.0','0.9.0']) {
    const {client,calls} = fixture([status]);
    await assert.rejects(client.execute({operation:'upload',version,packageBytes:zip}),/VERSION_NOT_NEWER/);
    assert.equal(calls.length,1);
  }
  const a=fixture([status]);
  await assert.rejects(a.client.execute({operation:'upload',version:'1.2.0',packageBytes:new Uint8Array([1])}),/INVALID_ZIP/);
  const b=fixture([status,{uploadState:'SUCCEEDED',crxVersion:'1.3.0'}]);
  await assert.rejects(b.client.execute({operation:'submit',version:'1.2.0',packageBytes:zip}),/UPLOADED_VERSION_MISMATCH/);
  assert.equal(b.calls.length,2);
});

test('CWS: erro ou timeout de upload impedem submissao', async () => {
  const failed=fixture([status,{uploadState:'FAILED'}]);
  await assert.rejects(failed.client.execute({operation:'submit',version:'1.2.0',packageBytes:zip}),/UPLOAD_FAILED/);
  const timeout=fixture([status,{uploadState:'IN_PROGRESS'},{lastAsyncUploadState:'IN_PROGRESS'}],{maxPolls:1});
  await assert.rejects(timeout.client.execute({operation:'submit',version:'1.2.0',packageBytes:zip}),/UPLOAD_TIMEOUT/);
  assert.equal(timeout.calls.filter(c=>c.method==='POST').length,1);
});

test('CWS: erros nao propagam token ou corpo bruto da API', async () => {
  const {client} = fixture([{http:403,body:{message:ids.token}}]);
  await assert.rejects(client.execute({}),error=>error.message==='CWS_HTTP_403_fetchStatus');
  const connection=createClient({...ids,fetchImpl:async()=>{throw new Error(ids.token)}});
  await assert.rejects(connection.execute({}),error=>error.message==='CWS_CONNECTION_FAILED_fetchStatus');
});

test('CWS: compara versoes numericamente e rejeita formatos nao estaveis', () => {
  assert.equal(compareVersions('1.10.0','1.2.0'),1);
  for(const value of ['v1.2.0','1.2.0-Snapshot','01.2.0','1.2.0.1','1.2.65536']) assert.throws(()=>compareVersions(value,'1.0.0'),/INVALID_VERSION/);
  assert.throws(()=>createClient({...ids,itemId:'../item'}),/INVALID_ITEM_ID/);
});
