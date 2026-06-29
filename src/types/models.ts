export type PaisOperacion = 'Estados Unidos' | 'España' | 'Ambos' | 'Otro';

export type TipoProducto = 'Moda' | 'Electrónica' | 'Cosmética' | 'Alimentación' | 'Otro';

export type VolumenMensual =
  | '0-100'
  | '101-500'
  | '501-2000'
  | '2000+'
  | 'No estoy seguro';

export type ServicioInteres = 'Almacenaje' | 'Última milla' | 'Logística inversa';

export type TrabajaCon3PL = 'Sí' | 'No' | 'Estoy evaluando opciones';

export interface Lead {
  nombreEmpresa: string;
  personaContacto: string;
  emailCorporativo: string;
  telefono: string;
  sitioWeb?: string;
  paisOperacion: PaisOperacion;
  tipoProducto: TipoProducto;
  volumenMensual: VolumenMensual;
  serviciosInteres: ServicioInteres[];
  trabajaCon3PL: TrabajaCon3PL;
  comentarios?: string;
  aceptaPrivacidad: boolean;
}
