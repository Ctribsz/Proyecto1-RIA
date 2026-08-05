export interface Medico {
  nombre: string;
  especialidad: string;
  direccion: string;
  telefono: string;
  sitio_web: string;
  zona: string;
  place_id: string;
  fecha_recoleccion: string | null;
  keyword_usado: string;
  tipo_principal_google: string;
  tipos_google: string[];
}

export interface MedicoFirestore extends Omit<Medico, "fecha_recoleccion"> {
  especialidad_busqueda: string;
  nombre_busqueda: string;
  zona_busqueda: string;
}
