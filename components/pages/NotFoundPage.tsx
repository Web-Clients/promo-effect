import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Pagina nu a fost găsită</h2>
        <p className="text-gray-600 mb-8">Pagina pe care o căutați nu există sau a fost mutată.</p>
        <Link
          to="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  );
}
