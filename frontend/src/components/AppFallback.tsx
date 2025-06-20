import { Link } from "react-router-dom";

export default function AppFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Something went wrong</h1>
      <p className="text-gray-600 mb-6">
        The page you’re looking for doesn’t exist or failed to load.
      </p>
      <Link
        to="/"
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
      >
        Go back home
      </Link>
    </div>
  );
}
