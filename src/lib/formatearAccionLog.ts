export function formatearAccionLog(accion: string): string {
  const traducciones: Record<string, string> = {
    registro_paciente: 'Registro de paciente',
    edicion_paciente: 'Edición de paciente',
    eliminacion_paciente: 'Eliminación de paciente',
    registro_respuesta: 'Registro de respuesta',
    respuesta_guardada: 'Respuesta guardada',
    envio_whatsapp: 'Envío por WhatsApp',
    login_usuario: 'Inicio de sesión',
    logout_usuario: 'Cierre de sesión',
  }

  return traducciones[accion] || accion
}