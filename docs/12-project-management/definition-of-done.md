# Definition of Done

Un ítem de backlog está **terminado** cuando:

1. Código mergeado a rama principal con revisión.
2. Pruebas automáticas relevantes añadidas/actualizadas y pasan en CI.
3. Migraciones Alembic incluidas si hay cambio de esquema.
4. Documentación API/OpenAPI refleja contrato (o actualización docs si solo spec).
5. RBAC verificado en endpoints nuevos.
6. Sin regresiones conocidas en flujos ciudadano/admin afectados.
7. Criterios de aceptación vinculados marcados como verificables en PR.

Excepción Fase 1: solo salud contenedores y lint sin features.