export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f9fbff] to-[#e6eef8] px-4">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 border-4 border-[#003466] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 text-sm font-medium tracking-wide">
          Iniciando el sistema médico...
        </p>
      </div>
    </div>
  )
}