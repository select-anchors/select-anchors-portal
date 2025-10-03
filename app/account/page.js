export default function Account() {
  // Demo user values — swap with real data later
  const user = {
    name: "Chris Haggard",
    email: "selectanchors@gmail.com",
    phone: "575-552-1733",
    smsOptIn: true,
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-sm text-gray-600 mt-1">
        Update your profile and notification preferences.
      </p>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6 overflow-hidden">
        {/* Profile */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700">Name</label>
            <input
              defaultValue={user.name}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Email</label>
            <input
              type="email"
              defaultValue={user.email}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Phone</label>
            <input
              type="tel"
              defaultValue={user.phone}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {/* SMS opt-in */}
            <label className="flex items-start gap-2 mt-3 select-none">
              <input
                type="checkbox"
                defaultChecked={user.smsOptIn}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-800 leading-5">
                Allow SMS notifications
              </span>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Actions */}
        <div className="p-6 flex flex-wrap gap-2">
          {/* White-outline buttons keep readable text on hover */}
          <button className="px-4 py-2 rounded-xl border border-gray-400 bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-800">
            Cancel
          </button>
          <button className="px-4 py-2 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90">
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
