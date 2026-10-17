import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Config, apply } from '../index.js'
import { Context } from '@deepseek-ai/cordis'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'

export { Config }
export const name = 'image2-offline-smoke'
export const inject = ['tools']
export function applySmoke() {}

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const runRoot = await mkdtemp(path.join(project, 'imagegen-output/harness-smoke-'))
const sessionRoot = path.join(runRoot, 'session-project')
await mkdir(sessionRoot)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHAAAAABJRU5ErkJggg==', 'base64')
const requests = []
const edits = []
const downloads = []
let behavior = 'base64'
const server = createServer(async (req, res) => {
  if (req.url === '/image') {
    downloads.push(req.headers.authorization)
    res.writeHead(200, { 'Content-Type': 'image/png' })
    res.end(png)
    return
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks)
  if (req.url === '/v1/images/edits') {
    edits.push({ url: req.url, raw, contentType: req.headers['content-type'], authorization: req.headers.authorization })
  } else {
    requests.push({ url: req.url, body: JSON.parse(raw.toString()), authorization: req.headers.authorization })
  }
  res.setHeader('Content-Type', 'application/json')
  if (behavior === 'slow-body') {
    res.writeHead(200)
    res.write('{')
    return
  }
  if (behavior === 'error') {
    res.writeHead(401)
    res.end(JSON.stringify({ error: { message: 'Rejected image2-offline-test-key' } }))
  } else if (behavior === 'invalid-json') {
    res.writeHead(503)
    res.end('<html>Service unavailable</html>')
  } else if (behavior === 'empty') {
    res.end(JSON.stringify({ data: [] }))
  } else if (behavior === 'invalid') {
    res.end(JSON.stringify({ data: [{ b64_json: Buffer.from('not an image').toString('base64') }] }))
  } else if (behavior === 'url') {
    res.end(JSON.stringify({ data: [{ url: 'http://127.0.0.1:' + server.address().port + '/image' }] }))
  } else {
    res.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }))
  }
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
process.env.IMAGE2_OFFLINE_TEST_KEY = 'image2-offline-test-key'
const relayUrl = 'http://127.0.0.1:' + server.address().port
// `Config()` resolves every `.volatile()` field into a live reference, so a resolved
// result cannot be fed back into `Config()`; build each tool from the raw values.
const config = Config({ baseUrl: relayUrl, apiKeyEnv: 'IMAGE2_OFFLINE_TEST_KEY' })
function toolFor(overrides = {}) {
  let tool
  apply({ tools: { register(value) { tool = value } } }, Config({ baseUrl: relayUrl, apiKeyEnv: 'IMAGE2_OFFLINE_TEST_KEY', ...overrides }))
  assert.equal(tool.name, 'image2_generate')
  return tool
}
const exec = () => ({ signal: new AbortController().signal, agent: { session: { header: { cwd: sessionRoot } } } })
// A `.volatile()` field is a live reference on hosts whose settings service publishes
// an editable form, so defaults have to be read through `get()`.
const plain = value => (value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value)
// Read one multipart field straight out of the raw body: enough to prove what the
// relay would have received without pulling in a multipart parser.
function part(raw, field) {
  const text = raw.toString('latin1')
  const start = text.indexOf(`name="${field}"`)
  if (start < 0) return null
  const from = text.indexOf('\r\n\r\n', start) + 4
  return text.slice(from, text.indexOf('\r\n--', from))
}
const results = []
async function check(label, fn) {
  await fn()
  results.push(label)
}
try {
  await check('actual Cordis tool registration and model-facing schema', async () => {
    const ctx = new Context()
    let wire
    ctx.provide('systemPrompt')
    ctx.set('systemPrompt', { tools(callback) { wire = callback } })
    new ToolRuntime(ctx)
    apply(ctx, config)
    const schemas = await wire({ scope: undefined })
    assert.ok(schemas.schemas.some(schema => schema.name === 'image2_generate'))
    assert.deepEqual(schemas.schemas[0].parameters.required, ['prompt'])
    await ctx.fiber.dispose()
  })
  await check('defaults and actual host tool parameter validation', async () => {
    assert.equal(plain(Config({}).autoGenerateAssets), false)
    assert.equal(plain(Config({}).outputDir), 'imagegen-output')
    assert.equal(plain(Config({}).responseFormat), 'b64_json')
    await assert.rejects(toolFor().execute({}, exec()), /prompt/)
  })
  await check('base64 saved in session cwd and original preserved on duplicate', async () => {
    const tool = toolFor()
    const first = await tool.execute({ prompt: 'offline fixture', filename: 'asset.png' }, exec())
    const second = await tool.execute({ prompt: 'offline fixture', filename: 'asset.png' }, exec())
    assert.ok(first.includes(path.join(sessionRoot, 'imagegen-output', 'asset.png')))
    assert.ok(second.includes('asset-2.png'))
    assert.deepEqual(await readFile(path.join(sessionRoot, 'imagegen-output/asset.png')), png)
    assert.equal(requests[0].url, '/v1/images/generations')
    assert.equal(requests[0].body.n, 1)
    assert.equal(requests[0].body.response_format, 'b64_json')
    assert.equal(requests[0].authorization, 'Bearer image2-offline-test-key')
  })
  await check('URL download without forwarding relay credentials', async () => {
    behavior = 'url'
    await toolFor().execute({ prompt: 'offline fixture', filename: '../../url.png' }, exec())
    assert.deepEqual(await readFile(path.join(sessionRoot, 'imagegen-output/url.png')), png)
    assert.deepEqual(downloads, [undefined])
  })
  await check('API error reports status and redacts key', async () => {
    behavior = 'error'
    await assert.rejects(toolFor().execute({ prompt: 'offline fixture' }, exec()), error => /HTTP 401/.test(error.message) && !error.message.includes('image2-offline-test-key'))
    behavior = 'invalid-json'
    await assert.rejects(toolFor().execute({ prompt: 'offline fixture' }, exec()), /invalid JSON \(HTTP 503\)/)
  })
  await check('no-image and invalid-image responses fail without saving', async () => {
    const before = await readdir(path.join(sessionRoot, 'imagegen-output'))
    for (behavior of ['empty', 'invalid']) await assert.rejects(toolFor().execute({ prompt: 'offline fixture' }, exec()), /no image|no supported/)
    assert.deepEqual(await readdir(path.join(sessionRoot, 'imagegen-output')), before)
  })
  await check('outside output and junction escape rejected before API request', async () => {
    const count = requests.length
    await assert.rejects(toolFor({ outputDir: '../outside' }).execute({ prompt: 'offline fixture' }, exec()), /inside the active project/)
    await symlink(runRoot, path.join(sessionRoot, 'escape'), 'junction')
    await assert.rejects(toolFor({ outputDir: 'escape/other' }).execute({ prompt: 'offline fixture' }, exec()), /inside the active project/)
    assert.equal(requests.length, count)
  })
  await check('timeout covers stalled response body', async () => {
    behavior = 'slow-body'
    const started = Date.now()
    await assert.rejects(toolFor({ timeoutMs: 100 }).execute({ prompt: 'offline fixture' }, exec()))
    assert.ok(Date.now() - started < 3000)
  })
  await check('cancellation aborts stalled body', async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 100)
    try {
      await assert.rejects(toolFor().execute({ prompt: 'offline fixture' }, { ...exec(), signal: controller.signal }))
    } finally { clearTimeout(timer) }
  })
  await check('missing key fails before request', async () => {
    const count = requests.length
    await assert.rejects(toolFor({ apiKeyEnv: 'IMAGE2_TEST_MISSING_KEY' }).execute({ prompt: 'offline fixture' }, exec()), /environment variable/)
    assert.equal(requests.length, count)
  })
  await check('image-to-image posts multipart to /v1/images/edits with the source bytes', async () => {
    behavior = 'base64'
    await writeFile(path.join(sessionRoot, 'reference.png'), png)
    const result = await toolFor().execute({ prompt: 'offline fixture', image: 'reference.png', filename: 'edited.png', aspectRatio: '3:4' }, exec())
    const sent = edits.at(-1)
    assert.equal(sent.url, '/v1/images/edits')
    assert.match(sent.contentType, /^multipart\/form-data; boundary=/)
    assert.equal(sent.authorization, 'Bearer image2-offline-test-key')
    assert.equal(part(sent.raw, 'model'), 'gpt-image-1')
    assert.equal(part(sent.raw, 'prompt'), 'offline fixture')
    assert.equal(part(sent.raw, 'aspect_ratio'), '3:4')
    assert.equal(part(sent.raw, 'response_format'), 'b64_json')
    assert.deepEqual(Buffer.from(part(sent.raw, 'image'), 'latin1'), png)
    assert.ok(result.includes('image-to-image result'))
    assert.deepEqual(await readFile(path.join(sessionRoot, 'imagegen-output/edited.png')), png)
  })
  await check('responseFormat override applies to both modes', async () => {
    behavior = 'base64'
    const before = requests.length
    await toolFor({ responseFormat: '' }).execute({ prompt: 'offline fixture' }, exec())
    assert.equal(requests.length, before + 1)
    assert.equal('response_format' in requests.at(-1).body, false)
    await toolFor({ responseFormat: '' }).execute({ prompt: 'offline fixture', image: 'reference.png' }, exec())
    assert.equal(part(edits.at(-1).raw, 'response_format'), null)
    await toolFor().execute({ prompt: 'offline fixture', aspectRatio: '16:9' }, exec())
    assert.equal(requests.at(-1).body.aspect_ratio, '16:9')
  })
  await check('unusable source image fails before any request', async () => {
    const count = requests.length + edits.length
    await assert.rejects(toolFor().execute({ prompt: 'offline fixture', image: 'missing.png' }, exec()), /Source image not found/)
    await writeFile(path.join(sessionRoot, 'not-an-image.png'), Buffer.from('not an image'))
    await assert.rejects(toolFor().execute({ prompt: 'offline fixture', image: 'not-an-image.png' }, exec()), /Source image contained no supported/)
    await assert.rejects(toolFor().execute({ prompt: 'offline fixture', image: '..' }, exec()), /not a file/)
    assert.equal(requests.length + edits.length, count)
  })
  await writeFile(path.join(project, 'imagegen-output/harness-smoke-results.json'), JSON.stringify({ passed: results.length, tests: results, runRoot }, null, 2))
} finally {
  delete process.env.IMAGE2_OFFLINE_TEST_KEY
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
}
