export default function NewWellStub() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">New Well</h1>
      <p className="text-gray-600">
        Form coming next. For now, create via DevTools:
      </p>
      <pre className="mt-4 rounded-xl bg-gray-50 p-4 text-xs overflow-auto">
{`fetch('/api/wells', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
  body: JSON.stringify({ api: '30-000-00000', company_name: 'Demo' })
}).then(r => r.json()).then(console.log)`}
      </pre>
    </div>
  );
}
