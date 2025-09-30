export default function Login(){
  return (
    <section className="max-w-md mx-auto">
      <div className="card">
        <div className="card-body">
          <h1 className="h2 text-2xl text-center">Log in</h1>
          <div className="mt-6 space-y-3">
            <label className="label">Email</label>
            <input className="input" />
            <label className="label mt-2">Password</label>
            <input type="password" className="input" />
            <button className="btn btn-primary w-full mt-4">Sign in</button>
            <div className="text-center text-xs underline mt-2" style={{color:"var(--muted)"}}>Forgot password?</div>
          </div>
        </div>
        <div className="divider" />
        <div className="p-4 text-center text-xs" style={{color:"var(--muted)"}}>
          By signing in you agree to allow SMS notifications.
        </div>
      </div>
    </section>
  );
}
