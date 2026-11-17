import { expect } from 'chai';
import SwaggerParser from '@apidevtools/swagger-parser';
import { api, errorResponse } from './helpers.js';
describe('Logger, Swagger y errores generales', () => {
  it('logger devuelve sus seis niveles', async () => {
    const r = await api.get('/api/loggerTest');
    expect(r.status).to.equal(200);
    expect(r.body).to.deep.equal({
      status: 'success', message: 'Prueba de logging ejecutada',
      levels: ['debug', 'http', 'info', 'warning', 'error', 'fatal']
    });
  });
  it('Swagger sirve HTML, assets y OpenAPI válido', async () => {
    const r = await api.get('/api/docs/');
    expect(r.status).to.equal(200);
    expect(r.headers['content-type']).to.include('text/html');
    expect(r.text).to.include('swagger-ui');
    expect((await api.get('/api/docs/swagger-ui-bundle.js')).status).to.equal(200);
    const spec = await api.get('/api/docs/openapi.json');
    expect(spec.status).to.equal(200);
    expect(spec.body.openapi).to.equal('3.0.3');
    expect(spec.body.paths).to.have.property('/api/orders/{oid}');
    await SwaggerParser.validate(structuredClone(spec.body));
  });
  it('rutas y métodos inexistentes de logger y documentación usan error centralizado', async () => {
    for (const path of ['/no-existe', '/api/loggerTest/no-existe']) {
      errorResponse(await api.get(path), 'ROUTE_NOT_FOUND');
    }
    // Swagger UI sirve HTML para rutas hijas: el método POST sí queda fuera del contrato.
    errorResponse(await api.post('/api/docs/openapi.json'), 'ROUTE_NOT_FOUND');
    errorResponse(await api.post('/api/loggerTest'), 'ROUTE_NOT_FOUND');
  });
  it('rechaza JSON mal formado y cuerpos demasiado grandes', async () => {
    errorResponse(await api.post('/api/users').set('Content-Type', 'application/json').send('{'), 'INVALID_JSON');
    errorResponse(await api.post('/api/users').send({ firstName: 'x'.repeat(110000) }), 'PAYLOAD_TOO_LARGE');
  });
});
