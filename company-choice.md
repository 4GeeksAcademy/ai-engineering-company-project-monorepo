## 1. Elección

***TrackFlow***

## 2. Ejercicios
### 2.1 ¿Por qué?

Es la elección que para mí mejor se ajusta a lo que busco, "una empresa que resuelva problemas de la vida real". En este caso, con las opciones mencionadas ésta es la que más se ajusta a lo que yo considero entregar valor real. Conseguir que un paquete llegue a tiempo a la puerta de un cliente o resolver el dolor de cabeza de una devolución me parece un objetivo final que va por encima de los objetivos de Brasaland (Restaurante), Nexova (Consultora de RRHH). Sin embargo, las otras opciones son igualmente válidas.

### 2.2 Departamentos con problemas interesantes

**Logística Inversa:** Creo que es fundamental resolver este punto para que la empresa sea consistente en su desempeño. Un sistema que reduzca la subjetividad en la revisión de devoluciones y automatice los criterios de aprobación para que el proceso deje de depender enteramente de la revisión humana.

**Última Milla y Gestión de Transportistas:** Averiguar qué transportista es el óptimo según el destino o unificar el tracking de 8 compañías distintas entre EE.UU. y España seguro es un reto donde aprender lecciones para implementar una solución que englobe todos los casos.

### 2.3 Reto de automatización

Sistema de tracking unificado donde se puedan consultar los datos de EE.UU. y los de España. De manera que se puedan realizar comparaciones, filtrados, etc. Relacionado con Última Milla y Gestión de Transportistas.


## 3. Mi idea de Agente de IA

Debemos implementar un sistema de tracking indicado en el punto 2.3 (2.3 Reto de automatización), para ello debemos implementar 2 proyectos. 

1. Frontend (Interfaz): React + TypeScript (para asegurar que los datos de los paquetes tengan un tipado estricto y no haya errores de datos).
    1. Estilos: Tailwind CSS (permite maquetar rápido y crear diseños totalmente responsivos para los móviles de los operarios).

2. Backend / API: Node.js con Express para conectar con las APIs de los 8 transportistas (UPS, SEUR, etc.).