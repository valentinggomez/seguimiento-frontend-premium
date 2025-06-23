// src/components/SeccionAdminClinicas.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
  Tooltip as TooltipWrapper,
} from "@/components/ui/Tooltip"
import { toast } from "sonner"
import { Plus, Trash2, X, Info, Save } from "lucide-react"

const CAMPOS_DISPONIBLES = [
  "fecha", "nombre_paciente", "edad", "sexo", "peso", "altura", "imc",
  "dolor", "dolor_6h", "dolor_24h", "nausea", "vomitos", "somnolencia",
  "satisfaccion", "observaciones", "extremidades_horas"
]

const OPCIONES_TIPO_CAMPO = ["text", "number", "select", "textarea"]

export default function SeccionAdminClinicas() {
  const [clinicas, setClinicas] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [camposForm, setCamposForm] = useState<{ nombre: string; tipo: string }[]>([])
  const [camposAvanzados, setCamposAvanzados] = useState<string>("")
  const [errores, setErrores] = useState<{ [key: string]: string }>({})
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([])
  const [cargandoHojas, setCargandoHojas] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  useEffect(() => {
    const cargarClinicas = async () => {
      try {
        const res = await fetch("https://seguimiento-backend-premium-production.up.railway.app/api/clinicas", {
          headers: {
            "x-clinica-host": window.location.hostname,
            "rol": localStorage.getItem("rol") || ""
          }
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          setClinicas(json.data);
        } else {
          setClinicas([]); // ← defensa extra
          console.error("❌ Error al cargar clínicas:", json);
          toast.error("Error al cargar clínicas");
        }
      } catch (e) {
        console.error("❌ Error inesperado al cargar clínicas:", e);
        toast.error("Error inesperado al cargar clínicas");
      }
    };

    cargarClinicas();
  }, []);


  useEffect(() => {
    if (!selected) return
    const campos = Array.isArray(selected.campos_formulario)
      ? selected.campos_formulario
      : typeof selected.campos_formulario === 'string'
        ? selected.campos_formulario.split(',')
        : []
    const convertidos = campos.map((c: string) => {
      const [nombre, tipo = 'text'] = c.split(':')
      return { nombre: nombre.trim(), tipo: tipo.trim() }
    })
    setCamposForm(convertidos)
    setCamposAvanzados(selected.campos_avanzados || "")
    setErrores({})
  }, [selected])
  
  useEffect(() => {
    if (selected && !Array.isArray(selected.columnas_exportables)) {
      const corregido = typeof selected.columnas_exportables === "string"
        ? selected.columnas_exportables.split(",").map((s: string) => s.trim())
        : []

      setSelected((prev: typeof selected) => ({
        ...prev!,
        columnas_exportables: corregido
      }))
    }
  }, [selected])


  const fetchHojas = async (spreadsheetId: string) => {
    setCargandoHojas(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hojas?spreadsheet_id=${spreadsheetId}`)
      const data = await res.json()
      if (Array.isArray(data.hojas)) {
        console.log("✅ Hojas recibidas:", data.hojas)
        setHojasDisponibles(data.hojas)
      } else {
        setHojasDisponibles([])
      }
    } catch (error) {
      console.error("Error al obtener hojas:", error)
      setHojasDisponibles([])
    } finally {
      setCargandoHojas(false)
    }
  }

  useEffect(() => {
    const cleanId = selected?.spreadsheet_id?.trim()
    if (!cleanId || !/^[a-zA-Z0-9-_]{30,}$/.test(cleanId)) {
      setHojasDisponibles([])
      return
    }
    const fetchHojas = async () => {
      setCargandoHojas(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hojas?spreadsheet_id=${cleanId}`)
        const data = await res.json()
        if (Array.isArray(data.hojas)) {
          console.log("✅ Hojas recibidas:", data.hojas)
          setHojasDisponibles(data.hojas)
        } else {
          setHojasDisponibles([])
        }
      } catch (error) {
        console.error("Error al obtener hojas:", error)
        setHojasDisponibles([])
      } finally {
        setCargandoHojas(false)
      }
    }
    fetchHojas()
  }, [selected?.spreadsheet_id])

  const validarCampos = () => {
    const nuevosErrores: { [key: string]: string } = {}
    if (!/^[a-zA-Z0-9-_]{30,}$/.test(selected?.spreadsheet_id || "")) {
      nuevosErrores.spreadsheet_id = "ID inválido. Asegurate de copiarlo completo desde Google Sheets."
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(selected?.color_primario || "")) {
      nuevosErrores.color_primario = "Color inválido. Usa formato #RRGGBB."
    }
    if (selected?.horario_inicio && !/^\d{2}:\d{2}$/.test(selected.horario_inicio)) {
      nuevosErrores.horario_inicio = "Formato inválido. Usa HH:mm."
    }
    if (selected?.horario_fin && !/^\d{2}:\d{2}$/.test(selected.horario_fin)) {
      nuevosErrores.horario_fin = "Formato inválido. Usa HH:mm."
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSave = async () => {
    if (!selected || !validarCampos()) return;

    // 🔒 Seguridad extra: normalizamos columnas_exportables si viene mal
    if (!Array.isArray(selected.columnas_exportables)) {
      selected.columnas_exportables = typeof selected.columnas_exportables === "string"
        ? selected.columnas_exportables.split(",").map((s: string) => s.trim())
        : [];
    }

    const campos_formulario = camposForm.map(c => `${c.nombre}:${c.tipo}`);

    try {
      const endpoint = selected?.id
        ? "https://seguimiento-backend-premium-production.up.railway.app/api/clinicas/editar"
        : "https://seguimiento-backend-premium-production.up.railway.app/api/clinicas/nueva";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinica-host": window.location.hostname,
        },
        body: JSON.stringify({
          ...selected,
          campos_formulario,
          campos_avanzados: camposAvanzados,
          telefono: selected.telefono || "",
          columnas_exportables: selected.columnas_exportables,
        }),
      });

      if (res.ok) {
        toast.success("Clínica guardada correctamente");
        setSelected(null);

        const nuevas = await fetch("https://seguimiento-backend-premium-production.up.railway.app/api/clinicas", {
          headers: {
            "x-clinica-host": window.location.hostname,
            "rol": localStorage.getItem("rol") || ""
          }
        }).then(r => r.json());

        setClinicas(nuevas);
      } else {
        const data = await res.json();
        toast.error(`Error: ${data.error || "No se pudo guardar"}`);
        console.error("Error al guardar:", data);
      }
    } catch (err) {
      toast.error("Error inesperado al guardar");
      console.error("Error inesperado:", err);
    }
  };


  const InputValidado = ({ name, ...props }: any) => (
    <div className="relative">
      <Input
        {...props}
        className={errores[name] ? "border-red-500" : ""}
        onChange={(e) => {
          setSelected({ ...selected!, [name]: e.target.value })
        }}
        value={selected?.[name] || ""}
      />
      {errores[name] && (
        <span className="text-red-500 text-xs absolute mt-1">{errores[name]}</span>
      )}
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">⚙️</span>
          <h2 className="text-3xl font-bold text-[#003366]">Administración de Clínicas</h2>
        </div>
        <Dialog open={selected !== null && selected.id === null} onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#003366] hover:bg-[#004080] text-white px-4 py-2 rounded-xl shadow transition"
              onClick={() => {
                setSelected({
                  id: null,
                  nombre_clinica: "",
                  dominio: "",
                  spreadsheet_id: "",
                  nombre_hoja: "",
                  telefono: "",
                  color_primario: "#1E90FF",
                  horario_inicio: "",
                  horario_fin: "",
                  campos_formulario: [],
                  columnas_exportables: [],
                  campos_avanzados: ""
                })
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Crear nueva clínica
            </Button>
          </DialogTrigger>

          <DialogContent className="fixed top-1/2 left-1/2 z-50 w-full max-w-3xl transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl bg-white overflow-hidden max-h-[95vh]">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 z-10 p-1.5 bg-white shadow-md rounded-full hover:bg-gray-100">
              <X size={18} />
            </button>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-8 pb-24 bg-gradient-to-br from-white via-slate-50 to-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <DialogTitle className="text-3xl font-bold text-[#003366]">
                    ➕ Crear nueva clínica
                  </DialogTitle>
                  <DialogDescription className="text-gray-500 text-sm">
                    Completá los datos institucionales, campos clínicos y configuración personalizada.
                  </DialogDescription>
                </div>
                <Button
                  onClick={() => setMostrarConfirmacion(true)}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg shadow transition duration-150"
                >
                  <Save className="w-5 h-5" />
                  Guardar cambios
                </Button>
              </div>

              {/* 🔁 Contenido unificado del modal */}
              <div className="mt-4 border-t pt-6 space-y-4">
                <h3 className="text-xl font-semibold text-[#003366]">🔹 Datos institucionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <InputValidado name="spreadsheet_id" placeholder="Spreadsheet ID de Google Sheets" />
                    <div className="absolute top-2.5 right-3">
                      <TooltipProvider>
                        <TooltipWrapper>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            ID de tu hoja de cálculo de Google Sheets. Tiene 44 caracteres.
                          </TooltipContent>
                        </TooltipWrapper>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Input value={selected?.nombre_clinica || ""} placeholder="Nombre de la clínica" onChange={e => setSelected({ ...selected!, nombre_clinica: e.target.value })} />
                  <Input value={selected?.dominio || ""} placeholder="Dominio (ej: miclinica.local)" onChange={e => setSelected({ ...selected!, dominio: e.target.value })} />
                  {hojasDisponibles.length > 0 ? (
                    <select
                      className="border rounded px-3 py-2"
                      value={selected?.nombre_hoja || ""}
                      onChange={e => setSelected({ ...selected!, nombre_hoja: e.target.value })}
                    >
                      <option value="">Seleccionar hoja...</option>
                      {hojasDisponibles.map(hoja => (
                        <option key={hoja} value={hoja}>{hoja}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={selected?.nombre_hoja || ""}
                      placeholder="Nombre de hoja (opcional)"
                      onChange={e => setSelected({ ...selected!, nombre_hoja: e.target.value })}
                    />
                  )}
                  <InputValidado name="color_primario" placeholder="Color primario (ej: #1E90FF)" />
                  <Input value={selected?.telefono || ""} placeholder="Teléfono institucional (opcional)" onChange={e => setSelected({ ...selected!, telefono: e.target.value })} />
                  <InputValidado name="horario_inicio" placeholder="Horario de inicio (HH:mm)" />
                  <InputValidado name="horario_fin" placeholder="Horario de fin (HH:mm)" />
                </div>

                <h3 className="text-xl font-semibold text-[#003366] mt-8">🧪 Campos clínicos avanzados</h3>
                <Textarea value={camposAvanzados} onChange={e => setCamposAvanzados(e.target.value)} placeholder="Ej: frecuencia_respiratoria, presion_sistolica" />

                <h3 className="text-xl font-semibold text-[#003366] mt-8">🧾 Campos del paciente (formulario)</h3>
                <div className="space-y-4">
                  {camposForm.map((campo, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-5" value={campo.nombre} onChange={e => {
                        const updated = [...camposForm]
                        updated[index].nombre = e.target.value
                        setCamposForm(updated)
                      }} placeholder="Nombre del campo" />
                      <select className="col-span-4 border rounded px-3 py-2" value={campo.tipo} onChange={e => {
                        const updated = [...camposForm]
                        updated[index].tipo = e.target.value
                        setCamposForm(updated)
                      }}>
                        {OPCIONES_TIPO_CAMPO.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <button onClick={() => {
                        const updated = [...camposForm]
                        updated.splice(index, 1)
                        setCamposForm(updated)
                      }} className="col-span-1 text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" className="mt-2" onClick={() => setCamposForm([...camposForm, { nombre: "", tipo: "text" }])}>
                    <Plus size={16} className="mr-1" /> Agregar campo
                  </Button>
                </div>

                <h3 className="text-xl font-semibold text-[#003366] mt-8">📊 Columnas exportables</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    ...new Set([
                      "fecha", "paciente_id", "nombre", "edad", "sexo", "peso", "altura", "imc", "telefono", "cirugia", "fecha_cirugia", "nombre_medico",
                      ...camposForm.map(c => c.nombre),
                      ...camposAvanzados.split(',').map(c => c.trim()).filter(c => !!c)
                    ])
                  ].map(campo => (
                    <TooltipProvider key={campo}>
                      <TooltipWrapper>
                        <TooltipTrigger asChild>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={(selected?.columnas_exportables || []).includes(campo)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                const columnas = new Set(selected?.columnas_exportables || [])
                                if (checked) columnas.add(campo)
                                else columnas.delete(campo)
                                setSelected({ ...selected!, columnas_exportables: Array.from(columnas) })
                              }}
                            />
                            {campo}
                          </label>
                        </TooltipTrigger>
                        <TooltipContent>
                          Incluir esta columna al exportar respuestas.
                        </TooltipContent>
                      </TooltipWrapper>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
        {Array.isArray(clinicas) && clinicas.map(clinica => (
          <Card key={clinica.id} className="shadow-xl border border-gray-300">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-[#003366]">{clinica.nombre_clinica}</p>
                <p className="text-sm text-gray-600">{clinica.dominio}</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const cleanId = clinica?.spreadsheet_id?.trim()

                      // Aseguramos que columnas_exportables siempre sea array
                      let columnasExportables: string[] = []

                      if (Array.isArray(clinica.columnas_exportables)) {
                        columnasExportables = clinica.columnas_exportables
                      } else if (typeof clinica.columnas_exportables === "string") {
                        columnasExportables = (clinica.columnas_exportables as string).split(",").map((s: string) => s.trim())
                      } else {
                        columnasExportables = []
                      }

                      setSelected({ ...clinica, columnas_exportables: columnasExportables })

                      if (cleanId && /^[a-zA-Z0-9-_]{30,}$/.test(cleanId)) {
                        await fetchHojas(cleanId)
                      } else {
                        setHojasDisponibles([])
                      }
                    }}
                  >
                    ✏️ Editar
                  </Button>
                </DialogTrigger>
                <DialogContent className="fixed top-1/2 left-1/2 z-50 w-full max-w-3xl transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl bg-white overflow-hidden max-h-[95vh]">
                  <button onClick={() => setSelected(null)} className="absolute top-4 right-4 z-10 p-1.5 bg-white shadow-md rounded-full hover:bg-gray-100">
                    <X size={18} />
                  </button>

                  <div className="max-h-[75vh] overflow-y-auto px-6 py-8 pb-24 bg-gradient-to-br from-white via-slate-50 to-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                      <div>
                        <DialogTitle className="text-3xl font-bold text-[#003366]">
                          {selected?.id ? "🏥 Editar Clínica" : "➕ Crear nueva clínica"}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-sm">
                          Modificá los datos institucionales, campos clínicos y configuración personalizada.
                        </DialogDescription>
                      </div>
                      <Button
                        onClick={() => setMostrarConfirmacion(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl shadow-md transition-all"
                      >
                        <Save className="w-4 h-4 stroke-white" />
                        <span className="text-base font-medium">Guardar</span>
                      </Button>
                    </div>
                    <div className="mt-4 border-t pt-6 space-y-4">
                      <h3 className="text-xl font-semibold text-[#003366]">🔹 Datos institucionales</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <InputValidado name="spreadsheet_id" placeholder="Spreadsheet ID de Google Sheets" />
                          <div className="absolute top-2.5 right-3">
                            <TooltipProvider>
                              <TooltipWrapper>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-gray-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  ID de tu hoja de cálculo de Google Sheets. Tiene 44 caracteres.
                                </TooltipContent>
                              </TooltipWrapper>
                            </TooltipProvider>
                          </div>
                        </div>
                        <Input value={selected?.nombre_clinica || ""} placeholder="Nombre de la clínica" onChange={e => setSelected({ ...selected!, nombre_clinica: e.target.value })} />
                        <Input value={selected?.dominio || ""} placeholder="Dominio (ej: miclinica.local)" onChange={e => setSelected({ ...selected!, dominio: e.target.value })} />
                        {hojasDisponibles.length > 0 ? (
                          <select
                            className="border rounded px-3 py-2"
                            value={selected?.nombre_hoja || ""}
                            onChange={e => setSelected({ ...selected!, nombre_hoja: e.target.value })}
                          >
                            <option value="">Seleccionar hoja...</option>
                            {hojasDisponibles.map(hoja => (
                              <option key={hoja} value={hoja}>{hoja}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            value={selected?.nombre_hoja || ""}
                            placeholder="Nombre de hoja (opcional)"
                            onChange={e => setSelected({ ...selected!, nombre_hoja: e.target.value })}
                          />
                        )}
                        <InputValidado name="color_primario" placeholder="Color primario (ej: #1E90FF)" />
                        <Input value={selected?.telefono || ""} placeholder="Teléfono institucional (opcional)" onChange={e => setSelected({ ...selected!, telefono: e.target.value })} />
                        <InputValidado name="horario_inicio" placeholder="Horario de inicio (HH:mm)" />
                        <InputValidado name="horario_fin" placeholder="Horario de fin (HH:mm)" />
                      </div>

                      <h3 className="text-xl font-semibold text-[#003366] mt-8">🧪 Campos clínicos avanzados</h3>
                      <Textarea value={camposAvanzados} onChange={e => setCamposAvanzados(e.target.value)} placeholder="Ej: frecuencia_respiratoria, presion_sistolica" />

                      <h3 className="text-xl font-semibold text-[#003366] mt-8">🧾 Campos del paciente (formulario)</h3>
                      <h3 className="text-xl font-semibold text-[#003366] mt-8">🔎 Previsualización del formulario</h3>
                      <div className="space-y-4">
                        {camposForm.map((campo, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <Input className="col-span-5" value={campo.nombre} onChange={e => {
                              const updated = [...camposForm]
                              updated[index].nombre = e.target.value
                              setCamposForm(updated)
                            }} placeholder="Nombre del campo" />
                            <select className="col-span-4 border rounded px-3 py-2" value={campo.tipo} onChange={e => {
                              const updated = [...camposForm]
                              updated[index].tipo = e.target.value
                              setCamposForm(updated)
                            }}>
                              {OPCIONES_TIPO_CAMPO.map(op => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>
                            <button onClick={() => {
                              const updated = [...camposForm]
                              updated.splice(index, 1)
                              setCamposForm(updated)
                            }} className="col-span-1 text-red-500 hover:text-red-700">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                        <Button variant="outline" className="mt-2" onClick={() => setCamposForm([...camposForm, { nombre: "", tipo: "text" }])}>
                          <Plus size={16} className="mr-1" /> Agregar campo
                        </Button>
                        <h3 className="text-xl font-semibold text-[#003366] mt-8">🔎 Previsualización del formulario</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-blue-100 rounded-xl p-4 bg-white shadow-inner">
                          {camposForm.length === 0 ? (
                            <p className="text-gray-500">Agregá campos al formulario para ver la vista previa.</p>
                          ) : (
                            camposForm.map((campo, i) => (
                              <div key={i} className="flex flex-col">
                                <label className="text-sm font-medium text-[#003366] mb-1 capitalize">
                                  {campo.nombre || 'Campo sin nombre'}
                                </label>

                                {campo.tipo === 'textarea' ? (
                                  <textarea
                                    disabled
                                    className="border rounded px-3 py-2 resize-none text-sm bg-gray-50"
                                    placeholder="Respuesta del paciente"
                                    rows={3}
                                  />
                                ) : campo.tipo === 'select' ? (
                                  <select disabled className="border rounded px-3 py-2 text-sm bg-gray-50">
                                    <option>Opción 1</option>
                                    <option>Opción 2</option>
                                  </select>
                                ) : (
                                  <input
                                    disabled
                                    type={campo.tipo === 'number' ? 'number' : 'text'}
                                    className="border rounded px-3 py-2 text-sm bg-gray-50"
                                    placeholder="Respuesta del paciente"
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>

                      </div>

                      <h3 className="text-xl font-semibold text-[#003366] mt-8">📊 Columnas exportables</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[...new Set([
                            ...camposForm.map(c => c.nombre),
                            ...camposAvanzados.split(',').map(c => c.trim()).filter(c => !!c)
                          ])].map(campo => (
                            <TooltipProvider key={campo}>
                              <TooltipWrapper>
                                <TooltipTrigger asChild>
                                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <Checkbox
                                      checked={(selected?.columnas_exportables || []).includes(campo)}
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        const columnas = new Set(selected?.columnas_exportables || [])
                                        if (checked) columnas.add(campo)
                                        else columnas.delete(campo)
                                        setSelected({ ...selected!, columnas_exportables: Array.from(columnas) })
                                      }}
                                    />
                                    {campo}
                                  </label>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Incluir esta columna al exportar respuestas.
                                </TooltipContent>
                              </TooltipWrapper>
                            </TooltipProvider>
                          ))}
                        </div>
                    </div>
                  </div>
                {mostrarConfirmacion && (
                  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md text-center">
                      <h2 className="text-2xl font-bold text-[#003366] mb-2">¿Confirmar guardado?</h2>
                      <p className="text-sm text-gray-600 mb-6">Se guardarán los cambios de la clínica en el sistema.</p>
                      <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setMostrarConfirmacion(false)}>
                          ❌ Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            setMostrarConfirmacion(false)
                            handleSave()
                          }}
                        >
                          ✅ Confirmar y guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
  )
}
