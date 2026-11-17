# ShipNow — Pre-entrega Módulo 7 Backend III

API de ShipNow con carga de documentos y comprobantes mediante Multer y una suite de tests funcionales de los Módulos 6 y 7, implementada con Mocha, Chai y Supertest. Cubre usuarios, productos, pedidos, entregas, mocks, logger y Swagger, con casos exitosos y errores esperados. Las pruebas utilizan una instancia temporal de MongoDB, datos controlados y limpieza automática. La API conserva la documentación OpenAPI 3.0.3, Swagger UI, Winston y el manejo centralizado de errores.


## Carga de archivos del Módulo 7

- POST /api/users/:uid/documents: campo de archivo `file` y campo de texto obligatorio `documentType`: IDENTITY, LICENSE u OTHER.
- POST /api/deliveries/:did/receipts: campo de archivo `file`; el tipo se asigna como RECEIPT. Primero crear un pedido y su entrega.
- Ambos usan multipart/form-data y devuelven 201 con `{ status: 'success', payload: entidadActualizada }`.
- Se permite un archivo por solicitud: PDF (.pdf), JPEG (.jpg/.jpeg) o PNG (.png), de hasta 5 MiB (5242880 bytes). Se validan extensión, MIME y firma inicial; esto no sustituye un análisis antivirus.
- Usuario o entrega deben existir antes de recibir el archivo. Se rechazan campos desconocidos, tipos inválidos y archivos adicionales. El orden de los campos multipart es indiferente.

### Ejemplos en PowerShell

Reemplazar USER_ID y DELIVERY_ID por IDs creados en la API, y las rutas por archivos existentes:

```powershell
curl.exe -X POST "http://localhost:8080/api/users/USER_ID/documents" -F "file=@C:/archivos/dni.pdf" -F "documentType=IDENTITY"
curl.exe -X POST "http://localhost:8080/api/users/USER_ID/documents" -F "documentType=LICENSE" -F "file=@C:/archivos/licencia.png"
curl.exe -X POST "http://localhost:8080/api/deliveries/DELIVERY_ID/receipts" -F "file=@C:/archivos/comprobante.pdf"
```

Swagger permite seleccionar el archivo en Try it out. Los metadatos se consultan mediante GET de usuario o entrega: documents o receipts. Incluyen originalName, filename generado con UUID, path relativo, mimeType, size en bytes, documentType y uploadedAt. Las contraseñas no se devuelven.

La configuración central está en src/config/upload.config.js; controladores, servicio y repositorio separan recepción, validación y persistencia. Se usa uploads/pending durante la recepción; al validar se mueve a uploads/documents, uploads/licenses o uploads/receipts. Las carpetas se crean automáticamente respecto de la raíz del proyecto. No se sirven públicamente. MongoDB solo almacena metadatos. Si falla la validación o la asociación se elimina el archivo recibido; Multer elimina las cargas parciales que rechaza. Una interrupción abrupta del proceso puede dejar archivos pendientes, que deben revisarse operativamente.

Errores centralizados: FILE_REQUIRED (400), FILE_TYPE_INVALID (400), FILE_FIELD_INVALID (400), DOCUMENT_TYPE_INVALID (400), UPLOAD_INVALID (400), FILE_TOO_LARGE (413), FILE_SAVE_FAILED (500), USER_NOT_FOUND o DELIVERY_NOT_FOUND (404). Un ID mal formado devuelve INVALID_INPUT (400). Los errores conservan el formato status/error.code/error.message. Winston registra cargas exitosas, asociaciones y errores; en desarrollo aparecen por consola y los errores de servidor en logs/error.log.

Pruebas: `npm test` incluye cargas reales multipart, consulta de metadatos, faltantes, tipos inválidos, límites, entidades inexistentes y limpieza ante fallo de persistencia. Las pruebas de carga eliminan solo los archivos que ellas crean. No requieren una base externa.

La carpeta uploads/ está excluida del repositorio junto con node_modules/. Para entregar, publicar el código en GitHub y compartir el enlace. No incluir archivos subidos ni credenciales.

## Instalación y ejecución

Requisitos: Node.js >= 20.19 y npm. Para ejecutar la aplicación se requiere MongoDB local o Atlas. Para los tests funcionales no hace falta configurar una base externa: la suite inicia su propia instancia temporal de MongoDB.

```sh
npm ci
```

Copiar `.env.example` a `.env` y completar:

```dotenv
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_modulo5
NODE_ENV=development
```

El nombre `shipnow_modulo5` se conserva del archivo `.env.example` como nombre de la base de desarrollo; no identifica el módulo de esta entrega. Podés elegir otra base actualizando `MONGODB_URI` en tu `.env`. Los tests no utilizan esta base.

En PowerShell: `Copy-Item .env.example .env`. Si ya existe un `.env`, conservarlo y revisar sus valores. Usar una base de prueba: seed inserta datos reales.

```sh
npm start
# Durante desarrollo:
npm run dev
```

El arranque requiere conexión a MongoDB. Abre el servidor solo después de conectar y crear los índices únicos de usuarios y entregas.

## Swagger

- Interfaz interactiva: http://localhost:8080/api/docs/
- Especificación JSON: http://localhost:8080/api/docs/openapi.json
- Si cambiás PORT, usá ese puerto en las URLs. El servidor seleccionado por defecto en Swagger usa el mismo origen.

Swagger UI se sirve desde la dependencia instalada, sin depender de un CDN al abrir la página. Abrí un módulo, seleccioná una operación, pulsá **Try it out**, completá los campos y **Execute**. La API no implementa autenticación: no requiere token ni documenta respuestas 401/403.

La configuración está en `src/config/swagger.config.js`; la especificación, separada de la lógica de rutas, en `src/docs/openapi.json`. Define schemas reutilizables User, Product, Order, OrderItem, Delivery, SuccessResponse, ErrorResponse, entradas, estados y respuestas mock.

## Módulos documentados

| Tag | Operaciones |
| --- | --- |
| Users | GET/POST `/api/users`; GET/PUT/DELETE `/api/users/{uid}` |
| Products | GET/POST `/api/products`; GET/PUT/DELETE `/api/products/{pid}` |
| Orders | GET/POST `/api/orders`; GET `/api/orders/{oid}`; PATCH `/api/orders/{oid}/status` |
| Deliveries | GET/POST `/api/deliveries`; GET `/api/deliveries/{did}`; PATCH `/api/deliveries/{did}/status` |
| Mocks | GET `/api/mocks/users`, `/drivers`, `/orders`, `/deliveries`, `/lote`; POST `/api/mocks/seed` |
| Logger | GET `/api/loggerTest` |
| Health | GET `/health` |

Los PUT de usuarios y productos admiten actualización parcial con al menos un campo permitido. Los IDs son ObjectId de 24 caracteres hexadecimales. El alta pública de usuarios asigna USER; role no es un campo modificable por esta API. Las contraseñas se guardan como hash y no se devuelven. El estado de productos depende del stock.

Pedidos requieren user, address y description. priority admite LOW, NORMAL o HIGH (NORMAL por defecto). items es opcional y contiene objetos con name y quantity entera positiva. Este campo se incorpora de forma compatible con los pedidos del módulo anterior, que no tenían items.

Entregas requieren order existente; solo puede haber una por pedido. driver es opcional o null; si se envía debe referenciar un usuario con rol DELIVERY_DRIVER. El estado inicial de ambos recursos es PENDING. PATCH admite cualquier estado enumerado, sin secuencia obligatoria ni sincronización automática entre pedido y entrega.

- Pedidos: PENDING, IN_TRANSIT, DELIVERED, CANCELLED.
- Entregas: PENDING, ASSIGNED, DELIVERED, CANCELLED.

## Recorrido de prueba

1. Crear un usuario con POST `/api/users`: `{"firstName":"Ana","lastName":"Pérez","email":"ana@example.com","password":"Clave12345"}`. Copiar `payload._id`.
2. Crear un pedido con POST `/api/orders`, reemplazando USER_ID: `{"user":"USER_ID","address":"Av. Siempre Viva 123","description":"Entrega de libros","items":[{"name":"Libro","quantity":2}]}`.
3. Copiar el ID del pedido y crear una entrega con POST `/api/deliveries`: `{"order":"ORDER_ID"}`.
4. Consultar los listados y cambiar un estado con PATCH, usando `{"status":"DELIVERED"}`.
5. Probar un estado como `UNKNOWN`: devuelve 400 y el código de estado inválido del módulo. Probar un ID bien formado que no exista: devuelve 404.

Los IDs de los ejemplos en Swagger son ilustrativos: reemplazarlos por IDs de tu base. Para obtener repartidores persistidos, ejecutar seed con collection=all y usar un usuario con role DELIVERY_DRIVER.

## Mocks y carga de datos

Los GET generan datos sin escribir en MongoDB y devuelven JSON directo, sin status/payload. Cada llamada genera IDs nuevos: sus referencias no son registros persistidos. Para comprobar relaciones usar una sola respuesta de lote.

`qty` va en la URL, vale 10 por defecto y acepta enteros de 1 a 100, sin ceros iniciales ni valores repetidos. Se rechazan parámetros desconocidos.

```sh
curl "http://localhost:8080/api/mocks/orders?qty=2"
curl "http://localhost:8080/api/mocks/lote?qty=2"
curl -X POST "http://localhost:8080/api/mocks/seed?qty=2&collection=all"
```

En PowerShell usar `curl.exe`. Seed se invoca **sin body**; también acepta `{}`. Un body con campos como `{"qty":2}` devuelve 400 INVALID_INPUT: qty y collection se envían en la URL, conservando el contrato del módulo anterior.

- `collection=users` (predeterminado) inserta qty usuarios y devuelve 201 con `{"insertados":2,"coleccion":"usuarios"}` para qty=2.
- `collection=all` inserta qty clientes, qty repartidores, qty pedidos y qty entregas. Devuelve 201 con insertados, colecciones y datos, sin contraseñas. Para qty=2 son 8 registros.
- Los previews users/drivers generan qty usuarios; orders genera qty clientes y qty pedidos. deliveries/lote generan qty clientes, qty repartidores, qty pedidos y qty entregas.
- Repetir seed agrega nuevos datos. La carga intenta compensar inserciones parciales; no constituye una transacción MongoDB.

## Respuestas y errores

CRUD devuelve `{"status":"success","payload":...}`; mocks, logger y health conservan su propio formato, especificado en Swagger. Los errores centralizados son `{"status":"error","error":{"code":"...","message":"..."}}`.

| HTTP | Casos |
| --- | --- |
| 400 | INVALID_INPUT, INVALID_JSON, INVALID_STATUS (productos), INVALID_ORDER_STATUS, INVALID_DELIVERY_STATUS, INVALID_MOCK_QUANTITY, INVALID_MOCK_COLLECTION |
| 404 | USER_NOT_FOUND, PRODUCT_NOT_FOUND, ORDER_NOT_FOUND, DELIVERY_NOT_FOUND, ROUTE_NOT_FOUND |
| 409 | DUPLICATE_RESOURCE: email duplicado o entrega repetida para un pedido |
| 413 | PAYLOAD_TOO_LARGE: cuerpo superior al límite JSON de 100 KB |
| 500 | INTERNAL_ERROR; MOCK_GENERATION_FAILED durante la generación de seed |
| 503 | MOCK_LOAD_FAILED al fallar la persistencia de seed |

Swagger documenta los errores aplicables a cada operación. Un fallo de conexión en consultas normales se normaliza a 500; en la carga seed se informa 503. Health comprueba que HTTP responde, no la salud de MongoDB.

## Logger

GET `/api/loggerTest` es una herramienta técnica de validación, no una función de negocio. Emite debug, http, info, warning, error y fatal. En desarrollo se muestran todos; en producción se muestran info y niveles de mayor gravedad. Solo error y fatal se guardan en `logs/error.log`, con rotación. Es esperable que esta prueba genere mensajes de error y fatal.

## Testing funcional Módulos 6 y 7

### Herramientas y ejecución

Mocha organiza y ejecuta los casos, Chai valida las respuestas y Supertest realiza peticiones HTTP sobre la app Express importada desde `src/app.js`. La aplicación está separada del arranque de `src/server.js`: no hay que ejecutar `npm start` ni elegir manualmente un puerto para correr los tests.

Desde la raíz del proyecto:

```sh
npm ci
npm test
npm test
```

Las dos ejecuciones permiten comprobar que la suite no depende de datos de una corrida anterior. La primera ejecución puede necesitar internet para descargar el binario de MongoDB. El equipo debe permitir ejecutar ese proceso y abrir los puertos locales temporales utilizados por MongoDB y Supertest.

### Entorno y base de datos de testing

El archivo `.env.test` contiene únicamente valores de prueba y se incluye en el repositorio:

```dotenv
NODE_ENV=test
PORT=8081
TEST_DB_NAME=shipnow_test
```

`mongodb-memory-server` inicia una instancia real y descartable de MongoDB. La suite genera su `MONGODB_URI` y no utiliza la URI de desarrollo ni requiere Atlas o un MongoDB iniciado a mano. `PORT` es un valor del entorno de prueba; Supertest y MongoDB utilizan puertos temporales asignados automáticamente.

Los hooks de `tests/setup.js` conectan a esa instancia, limpian sus colecciones antes de cada caso y cierran la conexión y el proceso al terminar. Cada test crea sus datos y la suite se ejecuta sin paralelismo. Los fallos controlados de infraestructura usan dobles que se restauran después de cada caso. Los logs del entorno de testing se guardan en `logs/test/` y no se muestran por consola.

### Cobertura

- **Usuarios:** listado vacío y con datos, creación, consulta, actualización y eliminación; datos incompletos, ID inválido, usuario inexistente y email duplicado. Se comprueba que no se exponga la contraseña.
- **Pedidos y entregas:** listado, creación, consulta por ID y actualización persistida de estados; datos incompletos, referencias inexistentes, IDs y estados inválidos.
- **Productos:** creación, listado, consulta, actualización y eliminación; validación de datos, estados e IDs y recursos inexistentes.
- **Mocks:** previews de usuarios, repartidores, pedidos, entregas y lotes; cantidades y relaciones, cantidades inválidas, seed de usuarios y de todas las colecciones, y errores de entrada.
- **Logger:** respuesta con los seis niveles, rutas y métodos no admitidos y fallo controlado de escritura.
- **Swagger:** interfaz HTML, recurso JavaScript y especificación JSON validada con Swagger Parser. Los métodos distintos de GET y HEAD devuelven el error centralizado 404.
- **Errores generales:** formato `status/error/code/message`, status HTTP, JSON inválido, cuerpo demasiado grande, ruta inexistente, fallos de consulta (500) y fallo de persistencia de seed (503).

Las respuestas se validan por su estructura y propiedades importantes, además del status HTTP. Se comprueban los errores de entrada y recursos inexistentes documentados para los flujos cubiertos; no se afirma cobertura exhaustiva de todas las combinaciones de campos y fallos internos de OpenAPI.

La verificación del Módulo 7 realizada el 16 de noviembre de 2026 aprobó **84 pruebas funcionales**, incluidas 13 de archivos, y **5 pruebas anteriores**.

### Pruebas anteriores

La carpeta `test/` conserva las pruebas previas de logging y Swagger, ejecutadas con `node:test`. Se mantienen separadas de `tests/`, que utiliza Mocha:

```sh
npm run test:legacy
```

En la verificación del 16 de noviembre de 2026 también aprobaron las 5 pruebas anteriores. Este comando es independiente de `npm test`.

Ver [documentación complementaria del Módulo 6](docs/modulo-6.md).

## Estructura

- `src/config`: entorno, logger y montaje de Swagger.
- `src/docs/openapi.json`: contrato de todas las operaciones.
- `src/routes`, `controllers`, `services`, `repositories`, `models`: arquitectura existente; las nuevas rutas de envío delegan en shipping.service y reutilizan modelos y validadores.
- `src/errors` y `src/middlewares`: diccionario y manejo centralizado de errores.
- `tests/`: suite funcional del Módulo 6, helpers y hooks de conexión y limpieza (Mocha, Chai y Supertest).
- `test/`: pruebas anteriores de logging y Swagger (node:test).
- `.env.test`: valores del entorno de pruebas.
- `docs/modulo-6.md`: evaluación de la base, guía de testing y cambios del Módulo 6.

## Entrega en GitHub

Entregar el enlace al repositorio con el código, la suite integrada, `package-lock.json`, `.env.example` y `.env.test`. Excluir `node_modules/`, `.env`, `logs/` y `coverage/` mediante `.gitignore`. No publicar credenciales.
