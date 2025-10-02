
export default function Login() {
  return (
    <div className="container flex justify-center">
      <div className="card w-full max-w-md">
        <div className="card-section">
          <h1 className="text-2xl font-bold text-center">Log in</h1>
          <div className="mt-6 space-y-3">
            <label className="block text-sm">Email</label>
            <input className="w-full border rounded-xl p-2" />
            <label className="block text-sm mt-2">Password</label>
            <input type="password" className="w-full border rounded-xl p-2" />
            <button className="btn btn-primary w-full mt-4">Sign in</button>
            <div className="text-center text-xs text-gray-600 mt-2 underline cursor-pointer">Forgot password?</div>
          </div>
        </div>
        <div className="border-t" />
        <div className="card-section text-center text-xs text-gray-600">
          By signing in you agree to allow SMS notifications.
        </div>
      </div>
    </div>
  );
}
