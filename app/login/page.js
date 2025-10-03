export default function Login() {
  return (
<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-brand-green">
          Client Login
        </h1>
        <p className="text-center text-gray-600 text-sm mt-2">
          Access your well and anchor test records
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-green text-white py-2 rounded-lg font-semibold hover:bg-green-700"
          >
            Sign in
          </button>

          <p className="text-xs text-gray-600 text-center mt-3">
            By signing in, you agree to allow SMS notifications.
          </p>
        </form>
      </div>
    </div>
  )
}
