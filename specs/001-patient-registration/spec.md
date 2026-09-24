# Feature Specification: Registro e Identificación del Paciente (HIS)

**Feature Branch**: `001-patient-registration`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Módulo de Registro e Identificación del Paciente del Sistema de Información de Gestión Hospitalaria (HIS), aplicando Spec-Driven Development (SDD). Cubre tres capacidades: (3.1) registro e identificación del paciente con datos personales y número de seguro/mutua, asignando una identidad única reutilizable por el resto de módulos del HIS; (3.2) búsqueda y verificación de identidad por documento de identidad o código de historia clínica, para evitar registros duplicados; (3.3) modificación y actualización de datos personales y de contacto de un paciente ya registrado. Fuera de alcance: resto de módulos del HIS, gestión de especialidades/centros/permisos, integración real con aseguradoras, inicio de sesión y control de acceso por rol (un único perfil administrativo). Entregable: spec.md, plan.md, tasks.md e implementación trazable, asumiendo arquitectura Node.js con Express.js y base de datos relacional para la fase técnica."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alta de paciente con identidad única (Priority: P1)

Como personal administrativo, quiero registrar a un nuevo paciente capturando sus datos personales y su número de seguro o mutua, para que el sistema le asigne una identidad única que el resto de módulos del HIS (citas, historia clínica, facturación) pueda reutilizar sin crear registros duplicados.

**Why this priority**: Es la capacidad fundacional del módulo y de todo el HIS: sin un registro fiable con identidad única, no es posible operar ningún otro módulo. Un MVP con solo esta historia ya permite dar de alta pacientes.

**Independent Test**: Puede probarse de forma independiente completando el formulario de alta con datos válidos y verificando que el sistema confirma el alta y devuelve un identificador único y un código de historia clínica.

**Acceptance Scenarios**:

1. **Given** no existe ningún paciente con el documento de identidad indicado, **When** el administrador envía un alta con todos los campos obligatorios correctos, **Then** el sistema crea el paciente, le asigna una identidad única y un código de historia clínica, y confirma el alta mostrando ambos identificadores.
2. **Given** no existe ningún paciente con el documento de identidad indicado, **When** el administrador envía un alta omitiendo un campo obligatorio o con un formato inválido (por ejemplo, email sin `@` o documento sin letra), **Then** el sistema rechaza el alta, no crea ningún registro y explica el error de validación.
3. **Given** ya existe un paciente con ese documento de identidad, **When** el administrador intenta registrar otro paciente con el mismo documento, **Then** el sistema rechaza el alta como duplicado y muestra el mensaje de duplicado (sin revelar datos sensibles del paciente existente más allá de lo necesario para identificar el conflicto).
4. **Given** un alta se completa correctamente, **When** se consulta la identidad recién creada, **Then** el identificador asignado es distinto del de cualquier otro paciente y permanece estable (no cambia con ediciones posteriores).

---

### User Story 2 - Búsqueda y verificación de identidad (Priority: P2)

Como personal administrativo (y, en el futuro completo del HIS, cualquier módulo que necesite reconocer a un paciente), quiero buscar a un paciente ya registrado por su documento de identidad o por su código de historia clínica, para verificar su identidad y reutilizar su registro en lugar de duplicarlo.

**Why this priority**: Es la capacidad que evita duplicados y habilita la integración con el resto del HIS; sin embargo, depende de que existan pacientes registrados (US1), por lo que su prioridad es P2.

**Independent Test**: Puede probarse de forma independiente registrando (o disponiendo de) un paciente y realizando búsquedas por documento y por código de historia clínica, comprobando que se localiza al paciente correcto y que las búsquedas sin coincidencia informan claramente del resultado.

**Acceptance Scenarios**:

1. **Given** existe un paciente registrado con documento `12345678Z`, **When** el administrador busca por ese documento de identidad, **Then** el sistema devuelve una única coincidencia con los datos de identificación del paciente (identidad única, código de historia clínica, nombre, documento y datos de contacto básicos).
2. **Given** existe un paciente registrado con código de historia clínica `HC-000001`, **When** el administrador busca por ese código, **Then** el sistema devuelve al mismo paciente que se obtendría buscando por su documento.
3. **Given** no existe ningún paciente con el valor buscado, **When** el administrador realiza la búsqueda, **Then** el sistema informa de que no se han encontrado coincidencias, sin error de sistema.
4. **Given** el campo de búsqueda se envía vacío o solo con espacios, **When** se intenta buscar, **Then** el sistema rechaza la petición indicando que debe indicarse un documento o un código de historia clínica.
5. **Given** se busca por un valor con formato inválido para el tipo de dato, **When** se envía la búsqueda, **Then** el sistema rechaza la petición con un mensaje de validación claro.

---

### User Story 3 - Modificación y actualización de datos del paciente (Priority: P3)

Como personal administrativo, quiero modificar o completar los datos personales y de contacto de un paciente ya registrado (por ejemplo, cambio de domicilio, teléfono o email, o completar un dato que quedó vacío en el alta), para mantener la información del paciente actualizada y fiable.

**Why this priority**: Es importante para la calidad del dato, pero el sistema ya es operativo con el alta y la búsqueda; por eso se prioriza después de P1 y P2.

**Independent Test**: Puede probarse de forma independiente localizando un paciente existente, cambiando un dato de contacto, guardando y verificando que la nueva lectura del paciente muestra el valor actualizado y que su identidad única no ha cambiado.

**Acceptance Scenarios**:

1. **Given** existe un paciente registrado con teléfono antiguo, **When** el administrador actualiza el teléfono, el email y el domicilio, **Then** el sistema guarda los cambios, confirma la actualización y las siguientes consultas del paciente muestran los nuevos valores.
2. **Given** existe un paciente registrado con un campo opcional vacío (por ejemplo, email), **When** el administrador completa ese campo con un valor válido, **Then** el sistema guarda el dato y el paciente queda actualizado sin perder el resto de sus datos.
3. **Given** existe un paciente registrado, **When** el administrador intenta guardar una actualización con un valor inválido (por ejemplo, email sin `@`), **Then** el sistema rechaza el guardado, no modifica ningún dato y explica el error.
4. **Given** existe un paciente registrado, **When** se actualiza cualquiera de sus datos editables, **Then** su identidad única y su código de historia clínica permanecen inalterados.
5. **Given** se intenta modificar un paciente inexistente, **When** se envía la actualización, **Then** el sistema responde indicando que el paciente no existe.

---

### Edge Cases

- Intento de alta con un documento de identidad ya registrado (duplicado): el alta se rechaza sin crear un segundo registro.
- Intento de alta concurrente de dos pacientes con el mismo documento a la vez: solo uno de los altas puede tener éxito; el otro se rechaza como duplicado.
- Documento de identidad con formato inválido (longitud incorrecta o letra de control errónea): alta y búsqueda lo rechazan con mensaje de validación.
- Código de historia clínica inexistente o mal formado: la búsqueda informa de "no encontrado" o de formato inválido, según el caso.
- Búsqueda con valor ambiguo (por ejemplo, solo un prefijo corto sin resultado exacto): el sistema no devuelve coincidencias parciales no autorizadas; solo coincidencia exacta.
- Campos opcionales vacíos en el alta (teléfono, email, domicilio): se permiten si no son obligatorios, y pueden completarse después vía actualización.
- Cadenas con espacios iniciales/finales, mayúsculas/minúsculas o acentos en nombre y apellidos: el sistema normaliza espacios y respeta acentos; la comparación de identificadores no distingue mayúsculas de minúsculas.
- Actualización que vacía un dato previamente relleno: solo se permite para campos opcionales; los obligatorios no pueden quedar vacíos.
- Paciente intentado editar/eliminar de forma masiva o borrado físico: fuera de alcance; el módulo no ofrece baja ni borrado de pacientes.
- Valores extremos de longitud (nombres muy largos, teléfonos con prefijo internacional): se aceptan dentro de los límites definidos; fuera de límite, validación con mensaje claro.

## Requirements *(mandatory)*

### Functional Requirements

**Registro e identificación (capacidad 3.1)**

- **FR-001**: El sistema MUST permitir registrar un nuevo paciente capturando, como mínimo: nombre, apellidos, documento de identidad, número de seguro o mutua (número de póliza/asegurado) y los datos de contacto disponibles (domicilio, teléfono, email).
- **FR-002**: El sistema MUST asignar al registrarse una identidad única e inmutable al paciente, compuesta al menos por un identificador interno de paciente y un código de historia clínica, ambos reutilizables por cualquier módulo del HIS.
- **FR-003**: El sistema MUST validar el formato del documento de identidad y de los datos de contacto antes de aceptar el alta.
- **FR-004**: El sistema MUST impedir el alta de un segundo paciente con un documento de identidad ya registrado (unicidad del documento).
- **FR-005**: El sistema MUST registrar la fecha/hora de alta del paciente.
- **FR-006**: El sistema MUST confirmar al administrador el alta exitosa mostrando la identidad única y el código de historia clínica asignados.

**Búsqueda y verificación de identidad (capacidad 3.2)**

- **FR-007**: El sistema MUST permitir buscar un paciente por su documento de identidad exacto.
- **FR-008**: El sistema MUST permitir buscar un paciente por su código de historia clínica exacto.
- **FR-009**: El sistema MUST devolver, como resultado de una verificación exitosa, los datos de identificación mínimos del paciente: identidad única, código de historia clínica, nombre y apellidos, documento y contacto básico.
- **FR-010**: El sistema MUST distinguir claramente entre "paciente encontrado" y "paciente no encontrado", sin error de sistema en el segundo caso.
- **FR-011**: El sistema MUST rechazar búsquedas con criterio vacío o con formato inválido, con mensaje de validación.
- **FR-012**: La búsqueda MUST responder exactamente con un único paciente por criterio (la identidad garantiza una coincidencia única).

**Modificación y actualización (capacidad 3.3)**

- **FR-013**: El sistema MUST permitir modificar datos personales y de contacto de un paciente ya registrado (nombre, apellidos, domicilio, teléfono, email, fecha de nacimiento y datos de seguro/mutua).
- **FR-014**: El sistema MUST permitir completar campos opcionales que quedaron vacíos en el alta.
- **FR-015**: El sistema MUST validar los datos en la actualización con los mismos criterios que en el alta; una actualización inválida no debe alterar los datos existentes.
- **FR-016**: El sistema MUST preservar la identidad única y el código de historia clínica en cualquier actualización: nunca se reasignan ni se editan.
- **FR-017**: El sistema MUST rechazar actualizaciones dirigidas a un paciente inexistente.
- **FR-018**: El sistema MUST rechazar vaciar campos obligatorios en una actualización.

**Transversal**

- **FR-019**: El sistema MUST operar con un único perfil de usuario administrativo (sin inicio de sesión ni control de acceso por rol) para esta práctica.
- **FR-020**: El sistema MUST exponer la funcionalidad de la forma más reutilizable posible por otros módulos del HIS (alta, búsqueda por identidad y actualización), aunque dichos módulos estén fuera de alcance.

### Key Entities

- **Paciente**: Persona dada de alta en el sistema. Atributos clave: identidad única (identificador interno), código de historia clínica, nombre, apellidos, documento de identidad (DNI/NIE u otro documento admitido), fecha de nacimiento, sexo (opcional), número de seguro o mutua (póliza/asegurado), aseguradora/mutua (opcional), domicilio, teléfono, email, fecha de alta. Relación: es la entidad raíz referida por todos los módulos futuros del HIS.
- **Identidad del paciente**: Valor único e inmutable compuesto por el identificador interno y el código de historia clínica; es el contrato de integración con el resto del HIS.
- **Dato de seguro/mutua**: Atributo del paciente (número de póliza o de asegurado y, opcionalmente, nombre de la entidad aseguradora); no existe integración real con aseguradoras.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El personal administrativo puede completar el alta de un paciente con todos los campos obligatorios en menos de 3 minutos, incluida la confirmación con la identidad única.
- **SC-002**: El 100% de los altas duplicadas (mismo documento de identidad) son rechazadas; la tasa de pacientes duplicados por documento en el sistema es 0.
- **SC-003**: El 100% de los pacientes registrados reciben una identidad única y un código de historia clínica que no cambian tras cualquier actualización.
- **SC-004**: El 95% de las búsquedas por documento o por código de historia clínica sobre pacientes existentes devuelven el resultado correcto en menos de 2 segundos desde la petición del usuario.
- **SC-005**: El 100% de las búsquedas sin coincidencia informan al usuario de "no encontrado" sin mostrar errores de sistema.
- **SC-006**: El 95% de las tareas de actualización de un dato de contacto se completan con éxito en menos de 1 minuto, con el nuevo valor visible en la siguiente consulta.
- **SC-007**: El 100% de las actualizaciones inválidas son rechazadas sin modificar ningún dato previo del paciente.
- **SC-008**: Tras el alta, búsqueda y actualización, cualquier módulo futuro del HIS puede identificar al paciente únicamente con la identidad única o el código de historia clínica (verificación de trazabilidad entre capacidades).

## Business Rules

- **RN-001**: Cada paciente tiene exactamente una identidad única e inmutable; el identificador interno y el código de historia clínica no se reutilizan entre pacientes ni cambian nunca.
- **RN-002**: El documento de identidad es único en el sistema: no puede haber dos pacientes con el mismo documento (comparación sin distinguir mayúsculas de minúsculas y sin espacios sobrantes).
- **RN-003**: El alta requiere como mínimo: nombre, apellidos, documento de identidad válido y número de seguro o mutua; el resto de campos de contacto pueden ser opcionales y completarse después.
- **RN-004**: Solo se admiten búsquedas por coincidencia exacta del documento o del código de historia clínica; no se realizan búsquedas difusas por nombre.
- **RN-005**: Un paciente localizado por documento y localizado por código de historia clínica devuelve siempre la misma identidad única.
- **RN-006**: Los campos obligatorios no pueden quedar vacíos tras una actualización; los campos opcionales pueden vaciarse o completarse libremente.
- **RN-007**: La identidad única y el código de historia clínica no son editables por el usuario en ninguna operación.
- **RN-008**: No existe operación de baja ni borrado de pacientes en este módulo.
- **RN-009**: El número de seguro o mutua se almacena como dato del paciente, sin validación ni comunicación con aseguradoras externas.
- **RN-010**: Un único perfil administrativo opera el módulo; no hay roles ni permisos diferenciados.

## Out of Scope

- Resto de módulos del HIS: citas, historia clínica, prescripción, facturación y notificaciones.
- Gestión de especialidades, centros, servicios o permisos (responsabilidad del administrador del sistema).
- Integración real con aseguradoras o mutuas: solo se captura el número de póliza/mutua como dato.
- Inicio de sesión, autenticación y control de acceso por rol (se asume un único perfil administrativo).
- Borrado o baja de pacientes y fusión/desduplicación manual de registros existentes.
- Búsqueda difusa por nombre, apellidos u otros criterios distintos de documento o código de historia clínica.
- Historial de cambios / auditoría avanzada de modificaciones (más allá de la fecha de alta).
- Interfaz multiidioma, exportación de datos y notificaciones al paciente.

## Assumptions

- **Perfil de usuario**: un único usuario administrativo opera el módulo; no hay autenticación ni roles (según el enunciado).
- **Formato de documento**: se asume como documento principal el DNI español (8 dígitos + letra) y se admite también NIE; la validación de letra de control es obligatoria para estos formatos. Otros documentos (pasaporte, etc.) podrían admitirse como alfanuméricos libres si se documenta en el plan.
- **Código de historia clínica**: generado automáticamente por el sistema con un formato secuencial y legible (por ejemplo, prefijo `HC-` más número correlativo); no lo introduce el usuario.
- **Identificador interno**: valor único generado por el sistema (por ejemplo, UUID o numérico); nunca editable.
- **Número de seguro/mutua**: campo obligatorio en el alta (según el enunciado), de validación alfanumérica libre sin verificación externa.
- **Campos opcionales por defecto**: email, teléfono, domicilio, fecha de nacimiento, sexo y nombre de aseguradora son opcionales; nombre, apellidos, documento y número de seguro son obligatorios.
- **Idioma de la interfaz y mensajes**: español.
- **Volumen esperado**: hospital de tamaño medio; decenas de miles de pacientes, sin requisito de alta concurrencia más allá de evitar duplicados por carrera.
- **Rendimiento**: las operaciones interactivas deben sentirse inmediatas al usuario (búsquedas y guardados en menos de 2 segundos percibidos).
- **Sin integraciones**: no se conecta con sistemas externos (aseguradoras, otros HIS, despachos de citas).
- **Trazabilidad mínima**: se conserva la fecha de alta; un historial completo de cambios queda fuera de alcance.
