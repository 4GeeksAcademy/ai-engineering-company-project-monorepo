import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT ?? 8080)
const maxUploadBytes = 10 * 1024 * 1024
const processorPath = fileURLToPath(new URL('../../../scripts/incidents_analysis.py', import.meta.url))
let latestExport = null

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

async function readRequestBody(req) {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > maxUploadBytes) {
      throw Object.assign(new Error('El archivo supera el límite de 10 MB.'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function parseMultipart(req, body) {
  const request = new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: { 'content-type': req.headers['content-type'] ?? '' },
    body,
    duplex: 'half',
  })
  return request.formData()
}

function analyzeCsv(csvText) {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON ?? 'python3'
    const worker = spawn(python, [processorPath, '--json-stdin'])
    let stdout = ''
    let stderr = ''

    worker.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    worker.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    worker.on('error', reject)
    worker.on('close', (code) => {
      if (code !== 0) {
        reject(Object.assign(new Error(stderr.trim() || 'No se pudo procesar el CSV.'), { statusCode: 422 }))
        return
      }

      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error('El procesador devolvió una respuesta no válida.'))
      }
    })
    worker.stdin.end(JSON.stringify({ csv: csvText }))
  })
}

async function handleIncidentAnalysis(req, res) {
  let body
  try {
    body = await readRequestBody(req)
  } catch (error) {
    sendJson(res, error.statusCode ?? 400, { error: error.message })
    return
  }

  let form
  try {
    form = await parseMultipart(req, body)
  } catch {
    sendJson(res, 400, { error: 'La solicitud debe usar multipart/form-data válido.' })
    return
  }

  const file = form.get('file')
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    sendJson(res, 400, { error: 'Falta el archivo CSV en el campo "file".' })
    return
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    sendJson(res, 400, { error: 'El archivo debe tener extensión .csv.' })
    return
  }

  let csvText
  try {
    csvText = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    sendJson(res, 422, { error: 'El archivo no contiene texto UTF-8 válido.' })
    return
  }

  try {
    const result = await analyzeCsv(csvText)
    latestExport = result.results_csv
    sendJson(res, 200, result.report)
  } catch (error) {
    sendJson(res, error.statusCode ?? 500, { error: error.statusCode ? error.message : 'Error interno del servidor.' })
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    })
    res.end()
    return
  }

  const incidentManagement = /^\/api\/incidents(?:\/|\?|$)/.test(req.url)
    && !/^\/api\/incidents\/(?:analyze|results\/export)(?:\?|$)/.test(req.url)
  if (/^\/suppliers(?:\/|\?|$)/.test(req.url) || incidentManagement) {
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: Number(process.env.SUPPLIERS_PORT ?? 8081),
      path: req.url,
      method: req.method,
      headers: req.headers,
    }, (response) => {
      res.writeHead(response.statusCode, {
        ...response.headers,
        'access-control-allow-origin': '*',
      })
      response.pipe(res)
    })
    upstream.on('error', () => {
      if (!res.headersSent) sendJson(res, 503, { error: incidentManagement ? 'El gestor de incidencias no está disponible.' : 'El directorio de proveedores no está disponible.' })
      else res.destroy()
    })
    req.on('aborted', () => upstream.destroy())
    req.pipe(upstream)
    return
  }

  if (req.url === '/health' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'trackflow-api',
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (req.url === '/api/incidents/analyze' && req.method === 'POST') {
    handleIncidentAnalysis(req, res).catch((error) => {
      sendJson(res, 500, { error: 'Error inesperado al analizar el archivo.' })
      console.error(error)
    })
    return
  }

  if (req.url === '/api/incidents/results/export' && req.method === 'GET') {
    if (!latestExport) {
      sendJson(res, 404, { error: 'Todavía no hay resultados para exportar.' })
      return
    }
    res.writeHead(200, {
      'access-control-allow-origin': '*',
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="results.csv"',
    })
    res.end(latestExport)
    return
  }

  sendJson(res, 404, { error: 'Ruta no encontrada.' })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`TrackFlow API running on http://0.0.0.0:${port}`)
})
