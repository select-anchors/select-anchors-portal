export default function Login() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        <div className="mt-6 space-y-3">
          <label className="block text-sm">Email</label>
          <input className="w-full border rounded-xl p-2" />
          <label className="block text-sm mt-2">Password</label>
          <input type="password" className="w-full border rounded-xl p-2" />
          <button className="inline-flex items-center justify-center w-full px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{background:'#2f4f4f'}}>Sign in</button>
          <div className="text-center text-xs text-gray-600 mt-2 underline cursor-pointer">Forgot password?</div>
        </div>
      </div>
    </main>
  );
}
