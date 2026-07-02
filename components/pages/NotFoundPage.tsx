import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050608] text-white">
      <div className="text-center p-8">
        <h1 className="text-7xl font-black italic text-primary-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">{t('errors.pageNotFound')}</h2>
        <p className="text-neutral-400 mb-8">{t('errors.pageNotFoundDesc')}</p>
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 text-white rounded-full font-bold uppercase tracking-wider text-sm hover:bg-primary-500 transition-colors"
        >
          {t('errors.backToHome')}
        </Link>
      </div>
    </div>
  );
}
