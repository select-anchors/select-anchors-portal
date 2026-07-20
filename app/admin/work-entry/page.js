// app/admin/work-entry/page.js

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NotLoggedIn from "../../components/NotLoggedIn";
import { hasPermission } from "../../../lib/permissions";

const POSITIONS = ["NW", "NE", "SE", "SW"];

const NEW_COMPANY_VALUE = "__new_company__";
const NEW_CONTACT_VALUE = "__new_contact__";

function addYears(dateString, years = 2) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setFullYear(date.getFullYear() + years);

  return date.toISOString().slice(0, 10);
}

function isTestService(serviceType) {
  return (
    serviceType === "test" ||
    serviceType === "install_test"
  );
}

function blankAnchor(position) {
  return {
    anchor_position: position,
    inches_out_of_ground: "",
    pull_result_lbs: "",
    pass_fail: "not_tested",
    red_bagged: false,
    needs_new_anchor: false,
    notes: "",
  };
}

function blankCompanyFields() {
  return {
    company_id: "",
    company_name: "",
    company_phone: "",
    company_email: "",
    company_address: "",

    company_contact_id: "",
    company_man_name: "",
    company_man_email: "",
    company_man_phone: "",
  };
}

function blankWell(defaults = {}) {
  return {
    api: "",
    lease_well_name: "",

    company_id: defaults.company_id || "",
    company_name: defaults.company_name || "",
    company_phone: defaults.company_phone || "",
    company_email: defaults.company_email || "",
    company_address: defaults.company_address || "",

    company_contact_id:
      defaults.company_contact_id || "",

    company_man_name:
      defaults.company_man_name || "",

    company_man_email:
      defaults.company_man_email || "",

    company_man_phone:
      defaults.company_man_phone || "",

    service_type:
      defaults.service_type || "test",

    service_date:
      defaults.service_date || "",

    technician_name:
      defaults.technician_name || "",

    county:
      defaults.county || "",

    state:
      defaults.state || "NM",

    previous_anchor_company:
      defaults.previous_anchor_company || "",

    previous_anchor_work:
      defaults.previous_anchor_work || "",

    directions_other_notes: "",
    notes: "",

    anchors: POSITIONS.map(blankAnchor),
  };
}

function getExpiration(serviceType, serviceDate) {
  if (!isTestService(serviceType)) {
    return "";
  }

  return addYears(serviceDate, 2);
}

export default function AdminWorkEntryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    ...blankCompanyFields(),

    service_type: "test",
    service_date: "",
    tested_by_company: "Select Anchors",
    technician_name: "",

    county: "",
    state: "NM",

    previous_anchor_company: "",
    previous_anchor_work: "",

    notes: "",

    wells: [blankWell()],
  });

  const canUsePage =
    !!session &&
    (
      session.user?.role === "admin" ||
      hasPermission(session, "can_edit_wells") ||
      hasPermission(
        session,
        "can_view_all_wells"
      )
    );

  const batchContacts = useMemo(() => {
    if (!form.company_id) {
      return [];
    }

    return contacts.filter(
      (contact) =>
        contact.company_id === form.company_id
    );
  }, [contacts, form.company_id]);

  useEffect(() => {
    if (!canUsePage) {
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setError("");

      try {
        const response = await fetch(
          "/api/admin/work-entry/options",
          {
            cache: "no-store",
          }
        );

        const json = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.error ||
              "Failed to load companies."
          );
        }

        if (!cancelled) {
          setCompanies(
            Array.isArray(json.companies)
              ? json.companies
              : []
          );

          setContacts(
            Array.isArray(json.contacts)
              ? json.contacts
              : []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Failed to load company options."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [canUsePage]);

  function updateForm(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function selectBatchCompany(value) {
    if (value === NEW_COMPANY_VALUE) {
      setForm((previous) => ({
        ...previous,
        ...blankCompanyFields(),
      }));

      return;
    }

    const selected = companies.find(
      (company) => company.id === value
    );

    if (!selected) {
      return;
    }

    setForm((previous) => ({
      ...previous,

      company_id: selected.id,
      company_name: selected.name || "",
      company_phone: selected.phone || "",
      company_email: selected.email || "",
      company_address: selected.address || "",

      company_contact_id: "",
      company_man_name: "",
      company_man_email: "",
      company_man_phone: "",
    }));
  }

  function selectBatchContact(value) {
    if (value === NEW_CONTACT_VALUE) {
      setForm((previous) => ({
        ...previous,

        company_contact_id: "",
        company_man_name: "",
        company_man_email: "",
        company_man_phone: "",
      }));

      return;
    }

    const selected = contacts.find(
      (contact) => contact.id === value
    );

    if (!selected) {
      return;
    }

    setForm((previous) => ({
      ...previous,

      company_contact_id: selected.id,
      company_man_name: selected.name || "",
      company_man_email: selected.email || "",
      company_man_phone: selected.phone || "",
    }));
  }

  function updateWell(index, key, value) {
    setForm((previous) => {
      const wells = [...previous.wells];

      wells[index] = {
        ...wells[index],
        [key]: value,
      };

      return {
        ...previous,
        wells,
      };
    });
  }

  function selectWellCompany(index, value) {
    if (value === NEW_COMPANY_VALUE) {
      setForm((previous) => {
        const wells = [...previous.wells];

        wells[index] = {
          ...wells[index],
          ...blankCompanyFields(),
        };

        return {
          ...previous,
          wells,
        };
      });

      return;
    }

    const selected = companies.find(
      (company) => company.id === value
    );

    if (!selected) {
      return;
    }

    setForm((previous) => {
      const wells = [...previous.wells];

      wells[index] = {
        ...wells[index],

        company_id: selected.id,
        company_name: selected.name || "",
        company_phone: selected.phone || "",
        company_email: selected.email || "",
        company_address: selected.address || "",

        company_contact_id: "",
        company_man_name: "",
        company_man_email: "",
        company_man_phone: "",
      };

      return {
        ...previous,
        wells,
      };
    });
  }

  function selectWellContact(index, value) {
    if (value === NEW_CONTACT_VALUE) {
      setForm((previous) => {
        const wells = [...previous.wells];

        wells[index] = {
          ...wells[index],

          company_contact_id: "",
          company_man_name: "",
          company_man_email: "",
          company_man_phone: "",
        };

        return {
          ...previous,
          wells,
        };
      });

      return;
    }

    const selected = contacts.find(
      (contact) => contact.id === value
    );

    if (!selected) {
      return;
    }

    setForm((previous) => {
      const wells = [...previous.wells];

      wells[index] = {
        ...wells[index],

        company_contact_id: selected.id,
        company_man_name: selected.name || "",
        company_man_email: selected.email || "",
        company_man_phone: selected.phone || "",
      };

      return {
        ...previous,
        wells,
      };
    });
  }

  function updateAnchor(
    wellIndex,
    anchorIndex,
    key,
    value
  ) {
    setForm((previous) => {
      const wells = [...previous.wells];
      const anchors = [
        ...wells[wellIndex].anchors,
      ];

      anchors[anchorIndex] = {
        ...anchors[anchorIndex],
        [key]: value,
      };

      if (
        key === "red_bagged" &&
        value === true
      ) {
        anchors[anchorIndex].pass_fail = "fail";
        anchors[anchorIndex].needs_new_anchor =
          true;
      }

      wells[wellIndex] = {
        ...wells[wellIndex],
        anchors,
      };

      return {
        ...previous,
        wells,
      };
    });
  }

  function currentDefaults() {
    return {
      company_id: form.company_id,
      company_name: form.company_name,
      company_phone: form.company_phone,
      company_email: form.company_email,
      company_address: form.company_address,

      company_contact_id:
        form.company_contact_id,

      company_man_name:
        form.company_man_name,

      company_man_email:
        form.company_man_email,

      company_man_phone:
        form.company_man_phone,

      service_type: form.service_type,
      service_date: form.service_date,
      technician_name: form.technician_name,

      county: form.county,
      state: form.state,

      previous_anchor_company:
        form.previous_anchor_company,

      previous_anchor_work:
        form.previous_anchor_work,
    };
  }

  function addWell() {
    setForm((previous) => ({
      ...previous,

      wells: [
        ...previous.wells,
        blankWell(currentDefaults()),
      ],
    }));
  }

  function applyDefaultsToAllWells() {
    const defaults = currentDefaults();

    setForm((previous) => ({
      ...previous,

      wells: previous.wells.map((well) => ({
        ...well,
        ...defaults,
      })),
    }));
  }

  function removeWell(index) {
    setForm((previous) => {
      if (previous.wells.length === 1) {
        return previous;
      }

      return {
        ...previous,

        wells: previous.wells.filter(
          (_, wellIndex) => wellIndex !== index
        ),
      };
    });
  }

  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/admin/work-entry",
        {
          method: "POST",

          headers: {
            "content-type": "application/json",
          },

          body: JSON.stringify(form),
        }
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.error ||
            "Failed to save work entry."
        );
      }

      setMessage(
        [
          "Saved successfully.",
          `${json.createdWells || 0} well(s) created.`,
          `${json.updatedWells || 0} well(s) updated.`,
          `${json.servicesCreated || 0} service record(s) added.`,
          `${json.testsCreated || 0} test record(s) added.`,
          `${json.anchorRowsCreated || 0} anchor measurement(s) added.`,
        ].join(" ")
      );

      setForm((previous) => ({
        ...previous,
        wells: [blankWell(currentDefaults())],
      }));

      const refreshResponse = await fetch(
        "/api/admin/work-entry/options",
        {
          cache: "no-store",
        }
      );

      const refreshJson = await refreshResponse
        .json()
        .catch(() => ({}));

      if (refreshResponse.ok) {
        setCompanies(
          Array.isArray(refreshJson.companies)
            ? refreshJson.companies
            : []
        );

        setContacts(
          Array.isArray(refreshJson.contacts)
            ? refreshJson.contacts
            : []
        );
      }
    } catch (submitError) {
      setError(
        submitError?.message ||
          "Failed to save work entry."
      );
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="container py-8">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <NotLoggedIn />;
  }

  if (!canUsePage) {
    return (
      <div className="container py-8">
        Not authorized.
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">
            Master Work Entry
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Enter shared defaults once, then override the
            company, company man, date, or work type for
            individual wells.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="space-y-6"
      >
        <div className="bg-white border rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Batch Defaults
            </h2>

            <p className="text-sm text-gray-600 mt-1">
              New wells inherit these settings. Every well
              can still be changed individually.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Existing Company
              </label>

              <select
                className="w-full border rounded-xl px-3 py-2"
                value={
                  form.company_id ||
                  NEW_COMPANY_VALUE
                }
                onChange={(event) =>
                  selectBatchCompany(
                    event.target.value
                  )
                }
                disabled={loadingOptions}
              >
                <option value={NEW_COMPANY_VALUE}>
                  + Add New Company
                </option>

                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Company Man
              </label>

              <select
                className="w-full border rounded-xl px-3 py-2"
                value={
                  form.company_contact_id ||
                  NEW_CONTACT_VALUE
                }
                onChange={(event) =>
                  selectBatchContact(
                    event.target.value
                  )
                }
                disabled={
                  loadingOptions ||
                  !form.company_name
                }
              >
                <option value={NEW_CONTACT_VALUE}>
                  + Add New Company Man
                </option>

                {batchContacts.map((contact) => (
                  <option
                    key={contact.id}
                    value={contact.id}
                  >
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              required
              className="border rounded-xl px-3 py-2"
              placeholder="Company / Customer"
              value={form.company_name}
              onChange={(event) =>
                updateForm(
                  "company_name",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company phone"
              value={form.company_phone}
              onChange={(event) =>
                updateForm(
                  "company_phone",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company email"
              value={form.company_email}
              onChange={(event) =>
                updateForm(
                  "company_email",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company address"
              value={form.company_address}
              onChange={(event) =>
                updateForm(
                  "company_address",
                  event.target.value
                )
              }
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man name"
              value={form.company_man_name}
              onChange={(event) =>
                updateForm(
                  "company_man_name",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man email"
              value={form.company_man_email}
              onChange={(event) =>
                updateForm(
                  "company_man_email",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Company man phone"
              value={form.company_man_phone}
              onChange={(event) =>
                updateForm(
                  "company_man_phone",
                  event.target.value
                )
              }
            />
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Service Type
              </label>

              <select
                className="w-full border rounded-xl px-3 py-2"
                value={form.service_type}
                onChange={(event) =>
                  updateForm(
                    "service_type",
                    event.target.value
                  )
                }
              >
                <option value="test">
                  Anchor Test
                </option>

                <option value="install_test">
                  Install + Test
                </option>

                <option value="install">
                  New Anchor Install
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Service Date
              </label>

              <input
                type="date"
                required
                className="w-full border rounded-xl px-3 py-2"
                value={form.service_date}
                onChange={(event) =>
                  updateForm(
                    "service_date",
                    event.target.value
                  )
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Default Expiration
              </label>

              <input
                type="date"
                readOnly
                className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                value={getExpiration(
                  form.service_type,
                  form.service_date
                )}
              />

              <p className="text-xs text-gray-500 mt-1">
                Only test services receive a two-year
                expiration.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Technician
              </label>

              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.technician_name}
                onChange={(event) =>
                  updateForm(
                    "technician_name",
                    event.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="County"
              value={form.county}
              onChange={(event) =>
                updateForm(
                  "county",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="State"
              value={form.state}
              onChange={(event) =>
                updateForm(
                  "state",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Previous Anchor Company"
              value={form.previous_anchor_company}
              onChange={(event) =>
                updateForm(
                  "previous_anchor_company",
                  event.target.value
                )
              }
            />

            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Previous Work — Permian 2023-08"
              value={form.previous_anchor_work}
              onChange={(event) =>
                updateForm(
                  "previous_anchor_work",
                  event.target.value
                )
              }
            />
          </div>

          <textarea
            className="w-full border rounded-xl px-3 py-2"
            rows={3}
            placeholder="Default service notes"
            value={form.notes}
            onChange={(event) =>
              updateForm(
                "notes",
                event.target.value
              )
            }
          />

          <button
            type="button"
            onClick={applyDefaultsToAllWells}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Apply Defaults to Every Well
          </button>
        </div>

        <div className="space-y-4">
          {form.wells.map(
            (well, wellIndex) => {
              const wellContacts =
                contacts.filter(
                  (contact) =>
                    contact.company_id ===
                    well.company_id
                );

              const expirationDate =
                getExpiration(
                  well.service_type,
                  well.service_date
                );

              return (
                <div
                  key={wellIndex}
                  className="bg-white border rounded-2xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Well #{wellIndex + 1}
                      </h2>

                      <p className="text-xs text-gray-500">
                        This well may override any batch
                        default.
                      </p>
                    </div>

                    {form.wells.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          removeWell(wellIndex)
                        }
                        className="px-3 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-sm"
                      >
                        Remove Well
                      </button>
                    ) : null}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <input
                      required
                      className="border rounded-xl px-3 py-2"
                      placeholder="API"
                      value={well.api}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "api",
                          event.target.value
                        )
                      }
                    />

                    <input
                      required
                      className="border rounded-xl px-3 py-2"
                      placeholder="Lease / Well Name"
                      value={well.lease_well_name}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "lease_well_name",
                          event.target.value
                        )
                      }
                    />

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Company
                      </label>

                      <select
                        className="w-full border rounded-xl px-3 py-2"
                        value={
                          well.company_id ||
                          NEW_COMPANY_VALUE
                        }
                        onChange={(event) =>
                          selectWellCompany(
                            wellIndex,
                            event.target.value
                          )
                        }
                      >
                        <option
                          value={NEW_COMPANY_VALUE}
                        >
                          + Add New Company
                        </option>

                        {companies.map(
                          (company) => (
                            <option
                              key={company.id}
                              value={company.id}
                            >
                              {company.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Company Man
                      </label>

                      <select
                        className="w-full border rounded-xl px-3 py-2"
                        value={
                          well.company_contact_id ||
                          NEW_CONTACT_VALUE
                        }
                        onChange={(event) =>
                          selectWellContact(
                            wellIndex,
                            event.target.value
                          )
                        }
                        disabled={!well.company_name}
                      >
                        <option
                          value={NEW_CONTACT_VALUE}
                        >
                          + Add New Company Man
                        </option>

                        {wellContacts.map(
                          (contact) => (
                            <option
                              key={contact.id}
                              value={contact.id}
                            >
                              {contact.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <input
                      required
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company"
                      value={well.company_name}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_name",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Phone"
                      value={well.company_phone}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_phone",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Email"
                      value={well.company_email}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_email",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Address"
                      value={well.company_address}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_address",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Man Name"
                      value={well.company_man_name}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_man_name",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Man Email"
                      value={well.company_man_email}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_man_email",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Company Man Phone"
                      value={well.company_man_phone}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "company_man_phone",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Service Type
                      </label>

                      <select
                        className="w-full border rounded-xl px-3 py-2"
                        value={well.service_type}
                        onChange={(event) =>
                          updateWell(
                            wellIndex,
                            "service_type",
                            event.target.value
                          )
                        }
                      >
                        <option value="test">
                          Anchor Test
                        </option>

                        <option value="install_test">
                          Install + Test
                        </option>

                        <option value="install">
                          New Anchor Install
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Service Date
                      </label>

                      <input
                        type="date"
                        required
                        className="w-full border rounded-xl px-3 py-2"
                        value={well.service_date}
                        onChange={(event) =>
                          updateWell(
                            wellIndex,
                            "service_date",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Expiration
                      </label>

                      <input
                        type="date"
                        readOnly
                        className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                        value={expirationDate}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Technician
                      </label>

                      <input
                        className="w-full border rounded-xl px-3 py-2"
                        value={well.technician_name}
                        onChange={(event) =>
                          updateWell(
                            wellIndex,
                            "technician_name",
                            event.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="County"
                      value={well.county}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "county",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="State"
                      value={well.state}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "state",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Previous Anchor Company"
                      value={
                        well.previous_anchor_company
                      }
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "previous_anchor_company",
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="border rounded-xl px-3 py-2"
                      placeholder="Previous Work — Permian 2023-08"
                      value={
                        well.previous_anchor_work
                      }
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "previous_anchor_work",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      inputMode="decimal"
                      className="border rounded-xl px-3 py-2"
                      placeholder="Latitude"
                      value={well.latitude}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "latitude",
                          event.target.value
                        )
                      }
                    />

                    <input
                      inputMode="decimal"
                      className="border rounded-xl px-3 py-2"
                      placeholder="Longitude"
                      value={well.longitude}
                      onChange={(event) =>
                        updateWell(
                          wellIndex,
                          "longitude",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <input
                    readOnly
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    placeholder="GPS coordinates generate automatically"
                    value={
                      well.latitude &&
                      well.longitude
                        ? `${well.latitude}, ${well.longitude}`
                        : ""
                    }
                  />

                  <textarea
                    className="w-full border rounded-xl px-3 py-2"
                    rows={2}
                    placeholder="Directions / other notes"
                    value={
                      well.directions_other_notes
                    }
                    onChange={(event) =>
                      updateWell(
                        wellIndex,
                        "directions_other_notes",
                        event.target.value
                      )
                    }
                  />

                  <textarea
                    className="w-full border rounded-xl px-3 py-2"
                    rows={2}
                    placeholder="Service notes for this well"
                    value={well.notes}
                    onChange={(event) =>
                      updateWell(
                        wellIndex,
                        "notes",
                        event.target.value
                      )
                    }
                  />

                  <div className="rounded-2xl border bg-gray-50 p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">
                        Anchor Measurements
                      </h3>

                      <p className="text-sm text-gray-600">
                        Enter current measurements for each
                        anchor head.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-gray-600">
                          <tr>
                            <th className="text-left p-2">
                              Position
                            </th>

                            <th className="text-left p-2">
                              Inches Out
                            </th>

                            <th className="text-left p-2">
                              Pull Result
                            </th>

                            <th className="text-left p-2">
                              Pass / Fail
                            </th>

                            <th className="text-left p-2">
                              Red Bagged
                            </th>

                            <th className="text-left p-2">
                              Needs New Anchor
                            </th>

                            <th className="text-left p-2">
                              Notes
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {well.anchors.map(
                            (
                              anchor,
                              anchorIndex
                            ) => (
                              <tr
                                key={
                                  anchor.anchor_position
                                }
                                className="border-t"
                              >
                                <td className="p-2 font-medium">
                                  {
                                    anchor.anchor_position
                                  }
                                </td>

                                <td className="p-2">
                                  <input
                                    inputMode="decimal"
                                    className="w-28 border rounded-lg px-2 py-1"
                                    value={
                                      anchor.inches_out_of_ground
                                    }
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "inches_out_of_ground",
                                        event.target.value
                                      )
                                    }
                                  />
                                </td>

                                <td className="p-2">
                                  <input
                                    inputMode="decimal"
                                    className="w-28 border rounded-lg px-2 py-1"
                                    value={
                                      anchor.pull_result_lbs
                                    }
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "pull_result_lbs",
                                        event.target.value
                                      )
                                    }
                                  />
                                </td>

                                <td className="p-2">
                                  <select
                                    className="border rounded-lg px-2 py-1"
                                    value={
                                      anchor.pass_fail
                                    }
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "pass_fail",
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="not_tested">
                                      Not Tested
                                    </option>

                                    <option value="pass">
                                      Pass
                                    </option>

                                    <option value="fail">
                                      Fail
                                    </option>
                                  </select>
                                </td>

                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      !!anchor.red_bagged
                                    }
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "red_bagged",
                                        event.target.checked
                                      )
                                    }
                                  />
                                </td>

                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      !!anchor.needs_new_anchor
                                    }
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "needs_new_anchor",
                                        event.target.checked
                                      )
                                    }
                                  />
                                </td>

                                <td className="p-2">
                                  <input
                                    className="w-48 border rounded-lg px-2 py-1"
                                    value={anchor.notes}
                                    onChange={(event) =>
                                      updateAnchor(
                                        wellIndex,
                                        anchorIndex,
                                        "notes",
                                        event.target.value
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }
          )}

          <button
            type="button"
            onClick={addWell}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            + Add Another Well
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-3 rounded-xl bg-[#2f4f4f] text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : `Submit ${form.wells.length} Well${
                form.wells.length === 1
                  ? ""
                  : "s"
              }`}
        </button>
      </form>
    </div>
  );
}
