📝 Notas de Actualización del Proyecto

🚀 Novedades e Implementaciones

Analizador de Incidencias:

Script: Desarrollo del script base para el procesamiento y análisis de incidencias.

Panel de Control: Creación de la interfaz/dashboard para la visualización y gestión del analizador.

🛑 Bloqueo Actual

Alucinaciones del Agente: El progreso principal se encontraba bloqueado debido a desviaciones e inconsistencias (alucinaciones) en las respuestas y contexto del agente, esto ya era más un bar que una web.

🛠️ Solución e Historial

Creación de la carpeta history:

Se ha añadido el directorio /history dentro de la estructura del MemoryBank.

Propósito: Funcionar como un punto de salvaguarda (backup de contexto) para todo lo generado.

Objetivo: Mitigar y prevenir futuras alucinaciones garantizando la persistencia de la información de referencia.

📌 Próximos Pasos

Una vez verificado y estabilizado el comportamiento del agente con el nuevo sistema de historial, mantener el desarrollo habitual del proyecto.

Actualización 22/10 Flujo reestablecimiento contraseña.

Aquí aprendí la importancia de donde van las keys y sus archivos.
La semana pasada intenté abordar este proyecto sin conseguir que funcionara y el problema fue poner el archivo
.env en raiz en vez de en la carpeta API para que esta reconociera los keys.