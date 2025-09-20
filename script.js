/** =========================
 *  CONFIG & HELPERS
 *  ========================= */
const API_BASE = "https://damayanti-api.vercel.app";

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Generic fetch with JSON
async function api(url, opts = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.status === 204 ? null : res.json();
}

// Normalize array or {data:[]}
function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

// ================= STATE =================
const state = {
  step: 1, // 1..5
  student: null, // {id, name} -> ambil dari students
  container: null, // {id, name}
  input: { temperature: "", humidity: "", gas: "", ph: "" },
  status: null, // "Merah" | "Kuning" | "Hijau"
};

// ================= STEP INDICATOR =================
function markStep() {
  for (let i = 1; i <= 5; i++) {
    const el = $(`#st${i}`);
    if (!el) continue;
    el.classList.toggle("active", i === state.step);
  }
}

// ================= RENDER SWITCH =================
async function render() {
  markStep();
  const host = $("#stepContent");
  host.innerHTML = "";

  if (state.step === 1) return renderSelectStudent(host);
  if (state.step === 2) return renderSelectContainer(host);
  if (state.step === 3) return renderInputTHG(host);
  if (state.step === 4) return renderPickStatus(host);
  if (state.step === 5) return renderRiwayat(host);
}

/** ================= STEP 1: PROFIL (pakai STUDENTS) ================= */
async function fetchStudents() {
  // GET /api/students (pagination allowed); fallback {data,meta}
  const students = unwrapList(await api("/api/students?limit=200"));
  return students.map((s) => ({ id: s.id, name: s.full_name || s.name || "Tanpa Nama" }));
}
async function renderSelectStudent(host) {
  let list = [];
  try {
    list = await fetchStudents();
  } catch (e) {
    console.error(e);
    // fallback terakhir: pakai sheeps kalau students gagal
    try {
      const sheeps = unwrapList(await api("/api/sheeps?limit=200"));
      list = sheeps.map((s) => ({ id: s.id, name: s.name || "Tanpa Nama" }));
    } catch (_) {}
  }

  const grid = document.createElement("div");
  grid.className = "bg-white rounded-2xl shadow p-6";
  grid.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">Pilih Profil Siswa</h3>
      ${state.student ? `<div class="text-sm text-gray-600">Terpilih: <b>${state.student.name}</b></div>` : ""}
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="studentGrid">
      ${
        list.length
          ? list.map((s) => `
              <button class="card border rounded-xl p-4 text-center ${state.student?.id===s.id?'ring-2 ring-blue-500':''}"
                      data-id="${s.id}" data-name="${s.name}">
                <div class="text-2xl mb-1">🎓</div>
                <div class="font-medium">${s.name}</div>
              </button>
            `).join("")
          : `<div class="col-span-4 text-gray-500">Data siswa kosong.</div>`
      }
    </div>
    <div class="mt-4 text-right">
      <button id="toDrum" class="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" ${state.student?'':'disabled'}>Lanjut ke Drum</button>
    </div>
  `;
  host.appendChild(grid);

  grid.querySelector("#studentGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    state.student = { id: btn.dataset.id, name: btn.dataset.name };
    render();
  });
  grid.querySelector("#toDrum").onclick = () => { state.step = 2; render(); };
}

/** ================= STEP 2: DRUM (containers) ================= */
async function fetchContainers() {
  const arr = unwrapList(await api("/api/containers?limit=200"));
  return arr.map((c) => ({ id: c.id, name: c.name || c.code || "Tanpa Nama" }));
}
async function renderSelectContainer(host) {
  let list = [];
  try { list = await fetchContainers(); } catch (e) { console.error(e); }

  const wrap = document.createElement("div");
  wrap.className = "bg-white rounded-2xl shadow p-6";
  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button class="px-3 py-2 bg-gray-600 text-white rounded-lg" id="back1">Kembali</button>
      <div class="text-sm text-gray-600">Siswa: <b>${state.student?.name || "-"}</b></div>
      <button id="toInput" class="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" ${state.container?'':'disabled'}>Lanjut ke Input THG</button>
    </div>
    <h3 class="font-semibold mb-3">Pilih Drum Fermentasi</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="drumGrid">
      ${
        list.length
          ? list.map((d) => `
              <button class="card border rounded-xl p-4 text-center ${state.container?.id===d.id?'ring-2 ring-blue-500':''}"
                      data-id="${d.id}" data-name="${d.name}">
                <div class="text-2xl mb-1">🛢️</div>
                <div class="font-medium">${d.name}</div>
                <div class="text-xs text-gray-500 mt-1">Detail</div>
              </button>
            `).join("")
          : `<div class="col-span-4 text-gray-500">Data drum kosong.</div>`
      }
    </div>
  `;
  host.appendChild(wrap);

  const grid = wrap.querySelector("#drumGrid");
  grid.onclick = (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    state.container = { id: btn.dataset.id, name: btn.dataset.name };
    render();
  };
  wrap.querySelector("#back1").onclick = () => { state.step = 1; render(); };
  wrap.querySelector("#toInput").onclick = () => { state.step = 3; render(); };
}

/** ================= STEP 3: INPUT THG + pH ================= */
async function renderInputTHG(host) {
  const box = document.createElement("div");
  box.className = "bg-white rounded-2xl shadow p-6";
  box.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button class="px-3 py-2 bg-gray-600 text-white rounded-lg" id="back2">Kembali</button>
      <div class="text-sm text-gray-600">Siswa: <b>${state.student?.name}</b> • Drum: <b>${state.container?.name}</b></div>
      <button class="px-4 py-2 rounded-lg bg-blue-600 text-white" id="toWarna">Lanjut</button>
    </div>
    <h3 class="font-semibold mb-3">Input Data THG + pH</h3>
    <form id="thgForm" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <input required type="number" step="0.1" name="temperature" placeholder="Suhu (°C)" class="border rounded-lg p-3">
      <input required type="number" step="0.1" name="humidity" placeholder="Kelembapan (%)" class="border rounded-lg p-3">
      <input required type="number" step="0.1" name="gas" placeholder="Gas (ppm)" class="border rounded-lg p-3">
      <input required type="number" step="0.1" name="ph" placeholder="pH" class="border rounded-lg p-3">
    </form>
    <p class="text-xs text-gray-500 mt-3">Tips: Isi semua kolom, lalu klik "Lanjut" untuk memilih status warna.</p>
  `;
  host.appendChild(box);

  $("#back2").onclick = () => { state.step = 2; render(); };
  $("#toWarna").onclick = () => {
    const fd = new FormData($("#thgForm"));
    state.input = Object.fromEntries(fd.entries());
    state.step = 4; render();
  };
}

/** ================= STEP 4: PILIH WARNA (status) ================= */
async function renderPickStatus(host) {
  const wrap = document.createElement("div");
  wrap.className = "bg-white rounded-2xl shadow p-6";
  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button class="px-3 py-2 bg-gray-600 text-white rounded-lg" id="back3">Kembali</button>
      <div class="text-sm text-gray-600">Suhu ${state.input.temperature}°C • Kelembapan ${state.input.humidity}% • Gas ${state.input.gas} • pH ${state.input.ph}</div>
      <button class="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50" id="btnSimpan" ${state.status?'':'disabled'}>Buat Laporan</button>
    </div>
    <h3 class="font-semibold mb-5">Pilih Status LED</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="warnaGrid">
      ${["Merah", "Kuning", "Hijau"].map((w) => `
        <button class="card border rounded-xl p-6 text-center" data-val="${w}">
          <div class="sensor-dot mx-auto mb-3 ${w==="Merah"?"bg-red-500":w==="Kuning"?"bg-yellow-400":"bg-emerald-500"}"></div>
          <div class="font-semibold">${w==="Merah"?"Belum Siap":w==="Kuning"?"Hampir Siap":"Sudah Siap"}</div>
        </button>
      `).join("")}
    </div>
  `;
  host.appendChild(wrap);

  $("#back3").onclick = () => { state.step = 3; render(); };

  $("#warnaGrid").onclick = (e) => {
    const btn = e.target.closest("button[data-val]");
    if (!btn) return;
    state.status = btn.dataset.val;
    [...$$("button[data-val]")].forEach((b) => b.classList.remove("ring", "ring-blue-500"));
    btn.classList.add("ring", "ring-blue-500");
    $("#btnSimpan").disabled = false;
  };

  // Simpan: POST sensor-data + (opsional) POST reports
  $("#btnSimpan").onclick = async () => {
    try {
      const payload = {
        container_id: state.container.id,
        temperature: +state.input.temperature,
        humidity: +state.input.humidity,
        gas: +state.input.gas,
        ph: +state.input.ph,
        status: state.status,
        recorded_at: new Date().toISOString(),
      };
      await api("/api/sensor-data", { method: "POST", body: JSON.stringify(payload) });

      // (opsional) catat ringkas ke reports untuk rekam jejak
      try {
        await api("/api/reports", {
          method: "POST",
          body: JSON.stringify({
            container_id: state.container.id,
            report_date: new Date().toISOString(),
            notes: `By:${state.student?.name ?? "-"} | T:${payload.temperature} H:${payload.humidity} G:${payload.gas} pH:${payload.ph} Status:${payload.status}`,
          }),
        });
      } catch (_) {}

      alert("Berhasil: data sensor tersimpan.");
      state.step = 5; render();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };
}

/** ================= STEP 5: RIWAYAT DATA per drum ================= */
// Ambil sensor-data dan filter client-side berdasarkan container_id
async function fetchSensorDataByContainer(containerId) {
  const all = unwrapList(await api("/api/sensor-data?limit=500"));
  return all.filter((x) => x.container_id === containerId);
}

async function renderRiwayat(host) {
  const box = document.createElement("div");
  box.className = "bg-white rounded-2xl shadow p-6";
  box.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button class="px-3 py-2 bg-gray-600 text-white rounded-lg" id="back4">Kembali</button>
      <div class="text-sm text-gray-600">Lihat riwayat drum: <b>${state.container?.name}</b></div>
      <button class="px-4 py-2 rounded-lg bg-indigo-600 text-white" id="btnDetail">Detail</button>
    </div>
    <div id="summary" class="text-gray-700 text-sm">Memuat data terbaru…</div>
  `;
  host.appendChild(box);

  $("#back4").onclick = () => { state.step = 4; render(); };
  $("#btnDetail").onclick = async () => { await openDetailModal(); };

  // Ringkasan: latest
  try {
    const latest = await api(`/api/sensor-data/latest/${encodeURIComponent(state.container.id)}`);
    const s = $("#summary");
    if (!latest || Object.keys(latest).length === 0) {
      s.textContent = "Belum ada data.";
    } else {
      s.innerHTML = `
        Terakhir: <b>${new Date(latest.recorded_at || latest.created_at || Date.now()).toLocaleString()}</b> • 
        Suhu <b>${latest.temperature ?? "-"}°C</b> • 
        Kelembapan <b>${latest.humidity ?? "-"}%</b> • 
        Gas <b>${latest.gas ?? "-"}</b> • 
        pH <b>${latest.ph ?? "-"}</b> • 
        Status <b>${latest.status ?? "-"}</b>
      `;
    }
  } catch {
    $("#summary").textContent = "Tidak bisa mengambil data terbaru.";
  }
}

// ===== Modal detail riwayat =====
async function openDetailModal() {
  let list = [];
  try { list = await fetchSensorDataByContainer(state.container.id); } catch (e) { console.error(e); }

  $("#detailTitle").textContent = `Detail Drum ${state.container.name}`;
  const body = $("#detailBody");
  body.innerHTML = list.length
    ? list.map((d, i) => `
        <tr class="odd:bg-white even:bg-gray-50">
          <td class="border p-2">${i + 1}</td>
          <td class="border p-2">${d.recorded_at ? new Date(d.recorded_at).toLocaleString() : "-"}</td>
          <td class="border p-2">${state.student?.name || "-"}</td>
          <td class="border p-2">${state.container?.name || "-"}</td>
          <td class="border p-2">${d.temperature ?? "-"}</td>
          <td class="border p-2">${d.humidity ?? "-"}</td>
          <td class="border p-2">${d.gas ?? "-"}</td>
          <td class="border p-2">${d.ph ?? "-"}</td>
          <td class="border p-2 ${d.status==='Sudah Siap'?'text-emerald-600':d.status==='Hampir Siap'?'text-yellow-600':'text-red-600'} font-semibold">${d.status ?? "-"}</td>
          <td class="border p-2">
            <button data-id="${d.id}" class="px-2 py-1 bg-red-600 text-white rounded">Hapus</button>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="10" class="p-4 text-gray-500">Belum ada data</td></tr>`;

  // Open modal
  const modal = $("#modalDetail");
  modal.classList.remove("hidden", "opacity-0");
  modal.classList.add("flex");

  // Delete row handler (sensor-data only)
  body.onclick = async (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!confirm("Hapus baris ini?")) return;
    try {
      await fetch(`${API_BASE}/api/sensor-data/${id}`, { method: "DELETE" });
      await openDetailModal(); // reload isi modal
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
  };
}
$("#btnCloseDetail").onclick = () => {
  const modal = $("#modalDetail");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
};

// init
render();
