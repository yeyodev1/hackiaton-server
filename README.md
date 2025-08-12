# 🚀 Workspace - Plataforma de Análisis de Documentos con IA

**Sistema Avanzado de Análisis de Documentos Gubernamentales y Contratos con Inteligencia Artificial**

Una plataforma integral que automatiza el análisis de documentos legales (pliegos, propuestas, contratos) con insights potenciados por IA, evaluación de riesgos y capacidades de comparación inteligente.

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Modelos de Datos](#-modelos-de-datos)
- [Servicios](#-servicios)
- [Variables de Entorno](#-variables-de-entorno)
- [Scripts Disponibles](#-scripts-disponibles)
- [Uso](#-uso)
- [Documentación Técnica](#-documentación-técnica)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

## 🌟 Características Principales

### 📄 Análisis de Documentos
- **Procesamiento Automático**: Carga y análisis de documentos PDF
- **Soporte Multi-Tipo**: Pliegos, propuestas, contratos y documentos personalizados
- **Análisis por País**: Análisis especializado para Ecuador, Perú, Colombia, México
- **Análisis por Secciones**: Secciones legales, técnicas y económicas
- **Validación RUC**: Validación automática de números de identificación tributaria

### 🤖 Agente Potenciado por IA
- **Interfaz Conversacional**: Interacción en lenguaje natural con insights de documentos
- **Soporte Dual de IA**: OpenAI GPT-4 y Google Gemini con failover automático
- **Respuestas Contextuales**: Comprende el contexto del workspace y documentos
- **Evaluación de Riesgos**: Puntuación de riesgos e identificación potenciada por IA
- **Análisis Comparativo**: Comparación multi-documento con recomendaciones estratégicas

### 🔍 Analíticas Avanzadas
- **Puntuación de Riesgos**: Evaluación integral de riesgos en múltiples dimensiones
- **Verificación de Cumplimiento**: Verificación automática contra marcos legales
- **Análisis de Brechas**: Identificación de requisitos faltantes e inconsistencias
- **Motor de Recomendaciones**: Insights accionables para mejora de documentos

## 🛠 Tecnologías

### Backend
- **Node.js** con **TypeScript**
- **Express.js** - Framework web
- **MongoDB** con **Mongoose** - Base de datos
- **OpenAI GPT-4** - Procesamiento de lenguaje natural
- **Google Gemini** - Proveedor alternativo de IA
- **PDF-Parse** - Extracción de texto de PDF
- **JWT** - Autenticación
- **Multer** - Manejo de archivos
- **Resend** - Servicio de email
- **Google Drive API** - Almacenamiento de documentos

### Herramientas de Desarrollo
- **TypeScript** - Tipado estático
- **ts-node-dev** - Desarrollo con hot reload
- **ESLint & Prettier** - Linting y formateo de código
- **Node-cron** - Tareas programadas

## 📦 Instalación

### Prerrequisitos
- Node.js (v18 o superior)
- MongoDB (v5.0 o superior)
- Claves API de OpenAI y/o Google Gemini

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd hackiaton-server
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Iniciar MongoDB**
```bash
# Usando Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# O iniciar servicio local
sudo systemctl start mongod
```

5. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

Copia `.env.example` a `.env` y configura las siguientes variables:

```env
# Configuración del Servidor
PORT=8100
NODE_ENV=development

# Base de Datos
MONGO_URI=mongodb://localhost:27017/hackathon-db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Servicios de IA
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro
PREFERRED_LLM_PROVIDER=openai

# Configuración de Archivos
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## 📁 Estructura del Proyecto

```
src/
├── app.ts                 # Configuración principal de Express
├── index.ts              # Punto de entrada de la aplicación
├── config/
│   └── mongo.ts          # Configuración de MongoDB
├── controllers/          # Controladores de rutas
│   ├── agent.controller.ts
│   ├── analysis.controller.ts
│   ├── auth.controller.ts
│   ├── conversation.controller.ts
│   ├── document.controller.ts
│   └── workspace.controller.ts
├── models/               # Modelos de Mongoose
│   ├── analysis.model.ts
│   ├── conversation.model.ts
│   ├── user.model.ts
│   └── workspace.model.ts
├── routes/               # Definición de rutas
│   ├── agent.route.ts
│   ├── analysis.route.ts
│   ├── auth.route.ts
│   ├── conversation.route.ts
│   ├── document.route.ts
│   └── workspace.route.ts
├── services/             # Servicios de negocio
│   ├── googleDrive.service.ts
│   ├── llm.service.ts
│   └── resend.service.ts
├── middlewares/          # Middlewares personalizados
│   ├── auth.middleware.ts
│   ├── globalErrorHandler.middleware.ts
│   └── upload.middleware.ts
├── utils/                # Utilidades por país
│   ├── colombia/
│   ├── ecuador/
│   ├── mexico/
│   └── peru/
└── types/                # Definiciones de tipos TypeScript
```

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/refresh` - Renovar token

### Gestión de Workspace
- `GET /api/workspace/my-workspace` - Obtener workspace del usuario
- `PUT /api/workspace/country` - Actualizar país del workspace
- `POST /api/workspace/upload-document` - Subir documento de empresa
- `PUT /api/workspace/complete-setup` - Completar configuración

### Análisis de Documentos
- `POST /api/analysis/document` - Analizar documento individual
- `GET /api/analysis/workspace/:workspaceId` - Obtener análisis del workspace
- `GET /api/analysis/:analysisId` - Obtener análisis específico
- `DELETE /api/analysis/:analysisId` - Eliminar análisis

### Agente IA
- `POST /api/agent/chat` - Chat con el agente
- `GET /api/agent/insights/document/:analysisId` - Insights de documento
- `POST /api/agent/insights/comparison/:workspaceId` - Comparación de documentos
- `GET /api/agent/health` - Estado de salud de servicios IA

### Conversaciones
- `GET /api/conversations/:workspaceId` - Obtener conversaciones
- `POST /api/conversations` - Crear nueva conversación
- `DELETE /api/conversations/:conversationId` - Eliminar conversación

## 📊 Modelos de Datos

### DocumentAnalysis
```typescript
interface IDocumentAnalysis {
  workspaceId: ObjectId
  documentName: string
  documentType: 'pliego' | 'propuesta' | 'contrato'
  documentUrl?: string
  analysisDate: Date
  aiAnalysis: string // Respuesta IA en formato markdown
  rucValidation?: IRucValidation
  status: 'processing' | 'completed' | 'failed'
  processingTime?: number
  createdBy: ObjectId
}
```

### Workspace
```typescript
interface IWorkspace {
  userId: ObjectId
  name: string
  country: 'ecuador' | 'peru' | 'colombia' | 'mexico' | 'others'
  settings: {
    legalFramework: string
    complianceRules: string[]
    riskFactors: string[]
  }
  usage: {
    documentCount: number
    analysisCount: number
  }
  isActive: boolean
}
```

### User
```typescript
interface IUser {
  email: string
  password: string
  firstName: string
  lastName: string
  isEmailVerified: boolean
  role: 'user' | 'admin'
}
```

## 🔧 Servicios

### LLMService
Servicio principal para integración con proveedores de IA:

- **generateDocumentInsights()** - Genera insights de documentos
- **generateComparisonInsights()** - Compara múltiples documentos
- **chatWithAgent()** - Maneja conversaciones del agente
- **healthCheck()** - Verifica estado de proveedores IA

### GoogleDriveService
Manejo de almacenamiento de documentos en Google Drive.

### ResendService
Servicio de envío de emails para notificaciones.

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor con hot reload
npm run compile      # Compila TypeScript en modo watch

# Producción
npm run build        # Compila TypeScript
npm start           # Inicia servidor de producción

# Utilidades
npm run format      # Formatea código con Prettier
```

## 🚀 Uso

### 1. Análisis de Documento
```bash
curl -X POST "http://localhost:8100/api/analysis/document" \
  -H "Authorization: Bearer <token>" \
  -F "workspaceId=<workspace_id>" \
  -F "documentType=pliego" \
  -F "file=@document.pdf"
```

### 2. Chat con Agente
```bash
curl -X POST "http://localhost:8100/api/agent/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "<workspace_id>",
    "message": "¿Cuáles son los principales riesgos en este contrato?"
  }'
```

### 3. Obtener Insights de Documento
```bash
curl -X GET "http://localhost:8100/api/agent/insights/document/<analysis_id>?question=¿Cuáles son los términos de pago?" \
  -H "Authorization: Bearer <token>"
```

## 📚 Documentación Técnica

El proyecto incluye documentación técnica detallada:

- **AI_INTEGRATION_FLOW.md** - Flujo de integración con IA
- **API_DOCUMENTATION.md** - Documentación completa de API
- **AI_AGENT_README.md** - Guía del agente IA
- **TECHNICAL_ANALYSIS_API.md** - API de análisis técnico
- **HACKATHON_COMPLIANCE.md** - Cumplimiento de requisitos del hackathon

## 🔒 Seguridad

- **Autenticación JWT** con tokens de acceso y renovación
- **Validación de entrada** en todos los endpoints
- **Rate limiting** para prevenir abuso
- **CORS configurado** para dominios específicos
- **Sanitización de datos** antes de procesamiento IA
- **Manejo seguro de archivos** con validación de tipos

## 🧪 Testing

Para probar la integración:

1. **Subir Documento**
2. **Verificar Resultados de Análisis**
3. **Chatear con Agente**
4. **Verificar Estado de Salud de IA**

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

---

**Desarrollado para automatizar y optimizar el análisis de documentos gubernamentales y contratos mediante inteligencia artificial avanzada.**