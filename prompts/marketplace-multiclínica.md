# Spec: Marketplace y Multi-Clínica

**Estado:** Confirmado v1.0 · Pendiente de implementación  
**Fecha:** 23 de abril de 2026  
**Rama destino:** Develop · `prompts/marketplace-multiclínica.md`  
**Tipo:** Contexto de producto — NO generar código hasta confirmar el plan técnico  
**Relacionado con:** `PRODUCT.md`, `skills-ai/security-invitation-flow/SKILL.md`

---

## Aviso antes de leer este documento

Este spec describe un módulo nuevo (marketplace) que **afecta lógica de negocio existente** fuera de su propio scope:

- El modelo de datos de `profiles` cambia estructuralmente
- El middleware de autenticación cambia
- Todas las API routes actuales de scoping por `clinic_id` cambian
- Las RLS policies de Supabase cambian
- El flujo de invitaciones actual se extiende

Antes de implementar cualquier parte, leer el plan técnico de coste cuando esté disponible. **Los cambios deben ser calculados para no generar deuda técnica.**

---

## El cambio de modelo

Petfhans pasa de ser **clínica-céntrico** a **usuario-céntrico**.

Hoy un usuario nace dentro de una clínica y muere con ella. En el nuevo modelo el usuario existe de forma autónoma y se conecta a las clínicas que necesita. Una mascota tiene un perfil propio que la acompaña — la clínica ve el historial que ella misma generó, no el de otras clínicas.

---

## Decisiones de producto — todas confirmadas

| Decisión | Respuesta |
|----------|-----------|
| ¿El marketplace es público? | No. Solo usuarios con cuenta activa |
| ¿Quién verifica clínicas? | El superadmin manualmente |
| ¿Cómo solicita verificación una clínica? | Por soporte técnico |
| ¿Hay privacidad de datos entre clínicas? | Sí. Cada clínica ve solo su propio historial |
| ¿Las mascotas llevan su perfil entre clínicas? | Sí. Perfil base del dueño, historial privado por clínica |
| ¿Aparecen vets sin clínica en el marketplace? | No. Todo vet debe pertenecer a al menos una clínica |
| ¿El dueño puede desvincular su mascota? | Sí, si no hay citas pendientes — el historial se borra |
| ¿Puede exportar antes de desvincular? | Sí. La exportación es el paso previo recomendado |
| ¿Puede exportar después de desvincular? | No. Una vez desvinculada, el historial ya no existe |
| ¿Hay período de vigencia en solicitudes? | No. Permanecen abiertas hasta que la clínica responda |
| ¿Qué pasa si la clínica rechaza? | El dueño recibe motivo, puede reintentar en 1 hora |
| ¿La clínica puede bloquear al dueño? | Sí, en el rechazo o desde el panel |
| ¿El bloqueo es visible para otras clínicas? | No. Es privado entre esa clínica y ese dueño |
| ¿El dueño bloqueado ve el perfil de la clínica? | Sí, pero no puede interactuar |
| ¿Cuándo se puede dejar una valoración? | Solo después de la primera cita completada |
| ¿El PDF incluye atribución a clínicas? | No. Es una línea de tiempo sin responsabilizar a ninguna clínica |

---

## Roles y permisos

### Dueño de mascota
- Cuenta única en Petfhans, independiente de cualquier clínica
- Puede pertenecer a múltiples clínicas simultáneamente
- Controla el perfil base de sus mascotas: nombre, especie, raza, foto, fecha de nacimiento, peso, microchip, seguro
- Ve todas sus mascotas agrupadas por clínica en su dashboard
- Puede buscar clínicas y vets en el marketplace y solicitar atención
- Puede exportar el historial médico en PDF solo mientras esté vinculada a esa clínica
- Puede desvincular una mascota si no hay citas pendientes — el historial se borra permanentemente
- Puede dejar una valoración después de su primera cita completada en la clínica

### Veterinario / Vet Admin
- Puede pertenecer a múltiples clínicas
- Ve únicamente pacientes de la clínica activa seleccionada en el sidebar
- Puede solicitar unirse a una segunda clínica desde su perfil
- El vet_admin gestiona solicitudes de atención y solicitudes de incorporación de vets
- El vet_admin puede rechazar con motivo, o bloquear a un dueño
- El vet_admin puede revertir un bloqueo en cualquier momento

### Superadmin
- Gestiona clínicas, planes y verificaciones
- Otorga el badge `verified` manualmente

---

## El marketplace

Módulo nuevo bajo `/marketplace`. Todas las rutas requieren sesión activa.

```
/marketplace
  └── /clinicas
        ├── Búsqueda: nombre, ciudad, especialidad
        ├── Filtros: verificada, especialidad, especie que atiende
        └── Card: logo, nombre, ciudad, especialidades, rating, badge verificada

  └── /clinicas/[slug]
        ├── Perfil público: cover, logo, descripción, especialidades, equipo, horarios
        ├── Equipo de vets con perfil público activado
        ├── Valoraciones (solo de dueños con primera cita completada)
        └── CTA: "Solicitar atención"
             → deshabilitado + "Esta clínica no está disponible para ti" si bloqueado

  └── /veterinarios
        ├── Búsqueda por nombre, especialidad, clínica
        └── Card: foto, nombre, especialidades, clínica(s), rating

  └── /veterinarios/[id]
        ├── Bio, especialidades, formación
        ├── Clínicas donde atiende
        └── CTA: "Solicitar atención con este vet"
```

**Recomendaciones — sin algoritmos complejos:**
- Clínicas mejor valoradas en la ciudad del usuario
- Clínicas con especialidad en la especie de las mascotas del usuario
- Clínicas donde el usuario ya está vinculado no aparecen
- Clínicas donde el usuario está bloqueado no aparecen

---

## El handshake

### A — El dueño solicita atención

1. Encuentra una clínica o vet en el marketplace
2. Hace clic en "Solicitar atención"
3. Formulario mínimo: mascota (existente o nueva), motivo (opcional), preferencia de vet (opcional)
4. Se crea `care_request` en estado `pending`
5. El vet_admin recibe la solicitud en su panel
6. Puede aceptar, rechazar con motivo, o bloquear

**Al aceptar:** dueño vinculado, mascota aparece con perfil base, email a ambos.

**Al rechazar:** email con motivo. Puede reintentar pasada 1 hora.

**Al bloquear:** email al dueño. Perfil visible pero sin interacción. Privado para otras clínicas. Reversible.

### B — La clínica invita directamente

El flujo actual sigue funcionando. Si el dueño ya tiene cuenta, se vincula el existente.

### C — Un vet solicita unirse a una segunda clínica

1. Busca la clínica en el marketplace
2. "Quiero trabajar aquí" + mensaje de presentación (opcional)
3. El vet_admin acepta o rechaza
4. Al aceptar: aparece en el selector de clínica activa del sidebar

---

## Desvinculación de mascota

```
⚠  Si desvinculás a [nombre] de [clínica], el historial médico
   registrado en esta clínica se borrará permanentemente.
   Exportá el historial antes de continuar si querés conservarlo.

   [Exportar historial]   [Desvincular de todas formas]
```

- Bloqueado si hay citas `pending` o `confirmed`
- Al desvincular: historial borrado permanentemente, perfil base intacto en otras clínicas
- La clínica también puede desvincular con las mismas condiciones

---

## Exportación del historial médico

Disponible solo mientras la mascota esté vinculada a la clínica.

**El PDF incluye (línea de tiempo cronológica):**
- Vacunas (fecha, nombre, próxima dosis)
- Medicamentos (fecha, nombre, dosis, duración)
- Notas clínicas
- Recetas emitidas

**El PDF no incluye:**
- Nombre de ninguna clínica ni veterinario
- Diagnósticos formales
- Archivos adjuntos
- Ningún elemento que responsabilice a una institución o profesional

Generado bajo demanda, no almacenado. Exportable por clínica o consolidado de todas, siempre sin atribución.

---

## Perfil de mascota

**Propiedad del dueño — visible en todas las clínicas:**
Nombre, especie, raza, fecha de nacimiento, foto, peso, microchip, seguro, notas del dueño.

**Propiedad de cada clínica — privado entre clínicas, se borra al desvincular:**
Historial de consultas, diagnósticos, vacunas, medicamentos, archivos clínicos, citas.

---

## Valoraciones de clínicas

- Solo disponibles después de la primera cita en estado `completed`
- Una valoración por dueño por clínica, actualizable
- Visibles en el perfil de la clínica en el marketplace

---

## Selector de clínica activa (sidebar)

```
┌──────────────────────────────┐
│ 🐾 Petfhans                  │
│ ▾ Clínica Felina Barcelona ✓ │
│   Vetcenter Madrid            │
│   + Buscar otra clínica       │
└──────────────────────────────┘
```

Contexto de clínica activa determina qué datos muestra el panel vet.

---

## Verificación de clínicas

Solicitud por soporte técnico → superadmin decide → badge `verified` en marketplace y perfil.

---

## Fuera de alcance

Pagos dueño-clínica · Chat directo · Videollamadas · Valoraciones de vets individuales · Vets sin clínica · Diagnósticos en PDF.

---

## Lo que este módulo toca fuera de su scope

**No modificar ninguna de estas áreas hasta tener el plan técnico aprobado:**

| Área afectada | Naturaleza del cambio | Riesgo |
|---|---|---|
| `profiles.clinic_id` | Campo único → tabla `profile_clinics` | Crítico |
| Middleware de autenticación | `clinic_id` pasa de valor único a contexto activo | Alto |
| API routes con `.eq('clinic_id', ...)` | Cambiar a clínica activa del contexto | Alto |
| RLS policies de Supabase | Reescribir para `profile_clinics` | Alto |
| Flujo de invitaciones | Extender para vincular usuarios existentes | Medio |
| `pet_access` | Extender para multi-clínica | Medio |
| Dashboard del dueño | Nuevo agrupador por clínica | Medio |
| VetLayout sidebar | Añadir selector de clínica activa | Bajo |

---

## Estado del documento

- [x] Decisión de modelo — confirmada
- [x] Roles y permisos — confirmados
- [x] Flujos de handshake — confirmados
- [x] Comportamiento de rechazo y bloqueo — confirmados
- [x] Desvinculación de mascotas — confirmado
- [x] Exportación del historial PDF — confirmado
- [x] Valoraciones — confirmadas
- [ ] **Plan técnico de coste — pendiente**
- [ ] **Orden de implementación — pendiente del plan técnico**
- [ ] **Migraciones SQL — pendientes**
- [ ] **Aprobación final para implementación**
