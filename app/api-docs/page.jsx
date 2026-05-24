import { getApiDocs } from '../../lib/swagger';
import ReactSwagger from './react-swagger';

export const metadata = {
  title: 'API Documentation | PriceHawk',
  description: 'Interactive API documentation for PriceHawk.',
};

export default async function ApiDocsPage() {
  const spec = await getApiDocs();

  return (
    <div className="container mx-auto px-4 py-8 bg-white dark:bg-zinc-900 rounded-lg shadow-md my-8">
      <h1 className="text-3xl font-bold mb-4 text-center text-violet-600 dark:text-violet-400">PriceHawk API Documentation</h1>
      <p className="text-zinc-600 dark:text-zinc-300 text-center mb-8">
        Use this interactive Swagger UI to explore and test the available API endpoints.
      </p>
      <div className="bg-white dark:bg-white rounded p-4">
        <ReactSwagger spec={spec} />
      </div>
    </div>
  );
}
