# Implementation Plan: Gestión de Citas Médicas

**Branch**: `002-gestion-citas` | **Date**: 2026-09-24 | **Spec**: [spec.md](file:///c:/Users/adria/Desktop/UNIVERSIDAD/4%C2%BA%20A%C3%91O/INGENIER%C3%8DA%20DE%20REQUISITOS%20%28IR%29/PR%C3%81CTICAS/ejercicio2_24509047V/specs/002-gestion-citas/spec.md)

**Input**: Feature specification from `/specs/002-gestion-citas/spec.md`

## Summary

El módulo de programación de citas permite a los pacientes reservar, cancelar o reprogramar citas de manera segura, y a los especialistas o personal administrativo gestionar su agenda. Se integrará con el sistema existente, reutilizando estrictamente la identidad única del paciente obtenida en el módulo de registro previo.

## Technical Context

**Language/Version**: JavaScript (Node.js, Vanilla JS)

**Primary Dependencies**: Express.js (presumiblemente para el backend en `app.js`).

**Storage**: Base de datos SQL (presumiblemente SQLite/MySQL/PostgreSQL basándonos en `schema.sql`).

**Testing**: Framework de pruebas estándar JS (e.g. Jest) [NEEDS CLARIFICATION].

**Target Platform**: Navegadores Web y Contenedores Docker (multi-stage).

**Project Type**: Aplicación Web (Frontend + Backend API).

**Performance Goals**: Resultados de disponibilidad precisos en menos de 2 segundos.

**Constraints**: Las operaciones de reprogramación deben ser estrictamente atómicas (transacciones DB).

**Scale/Scope**: Módulo de gestión para HIS integrado en entorno local o de desarrollo.

## Constitution Check

*GATE: Passed. No violations found.*

## Project Structure

### Documentation (this feature)

```text
specs/002-gestion-citas/
├── spec.md
├── plan.md              # This file
├── tasks.md             # Task breakdown
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app.js               # Backend API Server / Express Entry point
├── db/
│   └── schema.sql       # Definición de tablas de Citas y Agendas
├── controllers/
│   ├── appointmentController.js
│   └── scheduleController.js
├── models/
│   ├── appointmentModel.js
│   └── scheduleModel.js
├── routes/
│   ├── appointmentRoutes.js
│   └── scheduleRoutes.js
└── public/
    ├── index.html       # UI Integrada
    ├── css/
    │   └── styles.css
    └── js/
        ├── appointments.js
        └── schedules.js
```

**Structure Decision**: Arquitectura simple Modelo-Vista-Controlador (MVC) adaptada a Node.js + Express, sirviendo el cliente web estático desde la carpeta `/public` e interactuando mediante una API RESTful estructurada en el backend.

## Deployment & Containerization

El proyecto cuenta con un despliegue contenerizado mediante **Docker**, configurado a través de los archivos en la raíz del proyecto:
- **`Dockerfile`**: Multi-stage, basado en `node:22-alpine` para minimizar dependencias y peso.
- **`.dockerignore`**: Previene sobreescribir directorios locales y archivos no deseados (ej. base de datos local).
- **`docker-compose.yml`**: Configuración unificada que gestiona la red, el montaje de volúmenes persistentes (`/app/data`) y las variables de entorno sin pasos manuales.

Para desplegar simplemente ejecuta `docker compose up`, el cual ejecutará las migraciones SQL localmente antes de escuchar conexiones en el puerto 3000.
