export default function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-[#003466] mb-4">🔐 Sesión requerida</h1>
        <p className="text-gray-600 mb-6">
          No pudimos validar tu sesión. Es posible que haya expirado o no tengas acceso a esta sección.
        </p>
        <p className="text-sm text-gray-500">
          Si el problema persiste, comunicate con el administrador de tu clínica.
        </p>
      </div>
    </div>
  );
}