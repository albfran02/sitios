import { useEffect, useMemo, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'

const initialTasks = [
  {
    id: '1.1',
    fase: 'FASE 1: Instalación App Windows.',
    tarea: 'Pruebas de instalación Windows',
    descripcion:
      'Validación en diferentes equipos Windows (Dependencias, requerimientos mínimos, Certificado de seguridad)',
    fechaInicio: '2026-01-12',
    fechaFin: '2026-01-14',
  },
  {
    id: '1.2',
    fase: 'FASE 1: Instalación App Windows.',
    tarea: 'Pruebas de instalación Tablet (Windows)',
    descripcion:
      'Pruebas TABLET, dispositivo virtuales en Visual Studio - RAM mínima, espacio en disco, Certificado de seguridad, validación de instalación sin red, permisos necesarios.',
    fechaInicio: '2026-01-15',
    fechaFin: '2026-01-17',
  },
]

const normalizeDate = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const toGanttTask = (task) => ({
  id: task.id,
  name: `${task.id} ${task.tarea}`,
  start: task.fechaInicio,
  end: task.fechaFin,
  progress: 100,
})

function App() {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const ganttRef = useRef(null)
  const barsRef = useRef({})
  const ganttInstance = useRef(null)

  const groupedTasks = useMemo(
    () => tasks.reduce((acc, task) => {
      if (!acc[task.fase]) acc[task.fase] = []
      acc[task.fase].push(task)
      return acc
    }, {}),
    [tasks],
  )

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null

  const updateTaskDates = (taskId, fechaInicio, fechaFin) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, fechaInicio: normalizeDate(fechaInicio), fechaFin: normalizeDate(fechaFin) } : task,
      ),
    )
  }

  useEffect(() => {
    if (!ganttRef.current) return

    const chartTasks = tasks.map(toGanttTask)

    if (ganttInstance.current) {
      ganttInstance.current.refresh(chartTasks)
    } else {
      ganttInstance.current = new Gantt(ganttRef.current, chartTasks, {
        view_mode: 'Day',
        language: 'es',
        custom_popup_html: null,
        on_date_change: (ganttTask, start, end) => {
          updateTaskDates(ganttTask.id, start, end)
        },
      })
    }

    const wrappers = ganttRef.current.querySelectorAll('.bar-wrapper')
    barsRef.current = {}
    wrappers.forEach((wrapper) => {
      const id = wrapper.getAttribute('data-id')
      if (!id) return
      barsRef.current[id] = wrapper
      wrapper.ondblclick = () => setSelectedTaskId(id)
    })
  }, [tasks])

  const navigateToTask = (taskId) => {
    const bar = barsRef.current[taskId]
    if (bar) {
      bar.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }

  const handleFileLoad = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result)
        if (!Array.isArray(parsed)) throw new Error('Formato inválido')

        const normalized = parsed.map((item) => ({
          ...item,
          fechaInicio: normalizeDate(item.fechaInicio),
          fechaFin: normalizeDate(item.fechaFin),
        }))

        setTasks(normalized)
      } catch {
        alert('No se pudo cargar el JSON. Verifica el formato del archivo.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const exportJson = () => {
    const content = JSON.stringify(tasks, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cronograma_eOptics.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const saveModalDates = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (!selectedTaskId) return
    updateTaskDates(selectedTaskId, formData.get('fechaInicio'), formData.get('fechaFin'))
    setSelectedTaskId(null)
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
        <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Cargar JSON
          <input type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
        </label>
        <button className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700" onClick={exportJson}>
          Exportar JSON
        </button>
      </header>

      <main className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <aside className="rounded-lg bg-white p-4 shadow md:col-span-1">
          <h2 className="mb-3 text-lg font-semibold">Tareas por fase</h2>
          <div className="space-y-4">
            {Object.entries(groupedTasks).map(([fase, phaseTasks]) => (
              <section key={fase}>
                <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">{fase}</h3>
                <ul className="space-y-2">
                  {phaseTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-2 rounded border p-2">
                      <button
                        onClick={() => navigateToTask(task.id)}
                        className="text-left text-sm text-blue-700 hover:underline"
                      >
                        {task.id} {task.tarea}
                      </button>
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        title="Ver detalle"
                        className="rounded px-2 py-1 text-lg hover:bg-slate-200"
                      >
                        👁️
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </aside>

        <section className="overflow-auto rounded-lg bg-white p-4 shadow md:col-span-3">
          <h2 className="mb-3 text-lg font-semibold">Gráfica de Gantt</h2>
          <div ref={ganttRef} className="min-h-[420px]" />
        </section>
      </main>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold">{selectedTask.id} {selectedTask.tarea}</h3>
            <p className="mt-2 text-sm"><span className="font-semibold">Fase:</span> {selectedTask.fase}</p>
            <p className="mt-2 rounded bg-slate-100 p-2 text-sm">{selectedTask.descripcion}</p>

            <form onSubmit={saveModalDates} className="mt-4 space-y-3">
              <label className="block text-sm">
                Fecha de Inicio
                <input
                  type="date"
                  name="fechaInicio"
                  defaultValue={selectedTask.fechaInicio}
                  className="mt-1 w-full rounded border p-2"
                  required
                />
              </label>
              <label className="block text-sm">
                Fecha de Fin
                <input
                  type="date"
                  name="fechaFin"
                  defaultValue={selectedTask.fechaFin}
                  className="mt-1 w-full rounded border p-2"
                  required
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedTaskId(null)} className="rounded border px-3 py-2">
                  Cancelar
                </button>
                <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
                  Guardar y cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
