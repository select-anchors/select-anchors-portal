export default function Login() {
  return (
    <div className="container flex justify-center">
      <div className="card w-full max-w-md">
        <div className="card-section">
          <h1 className="text-2xl font-bold text-center">Log in</h1>
          <div className="mt-6 space-y-3">
            <label className="label">Email</label>
            <input className="input" />
            <label className="label mt-2">Password</label>
            <input type="password" className="input" />
            <button className="btn btn-primary w-full mt-4">Sign in</button>
            <div className="text-center text-xs text-gray-600 mt-2 link">Forgot password?</div>
          </div>
        </div>
        <div className="divider"></div>
        <div className="card-section text-center text-xs text-gray-600">
          By signing in you agree to allow SMS notifications.
        </div>
      </div>
    </div>
  );
}
