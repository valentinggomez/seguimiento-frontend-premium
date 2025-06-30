// src/app/panel/dashboard/loading.tsx
export default function LoadingDashboard() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="h-8 w-64 bg-gray-300 rounded-lg" />

      <div className="bg-white p-6 rounded-2xl shadow space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-64 w-full bg-gray-100 rounded" />
      </div>
    </div>
  )
}
