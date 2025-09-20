const API_BASE = "https://damayanti-api.vercel.app";
const $$ = (s) => document.querySelector(s);

const Pstate = {
  step: 1,
  dateKey: new Date().toISOString().slice(0, 10),
  selectedSheep: null, // {id, name}
};

// helpers
async function api(url, opts = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.status === 204 ? null : res.json();
}
function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}
function markStep() {
  for (let i = 1; i <= 3; i++) {
    const el = $$("#p" + i);
    if (!el) continue;
    el.classList.toggle("active", i === Pstate.step);
  }
}
async function Prender() {
  markStep();
  const host = $$("#panganContent");
  host.innerHTML = "";

  if (Pstate.step === 1) return renderSheepSelect(host);
  if (Pstate.step === 2) return renderCentangMakan(host);
  if (Pstate.step === 3) return renderRiwayatPangan(host);
}

/** STEP 1: PILIH KAMBING (sheeps) */
async function getSheeps() {
  const arr = unwrapList(await api("/api/sheeps?limit=200"));
  return arr.map((s) => ({ id: s.id, name: s.name }));
}
async function renderSheepSelect(host) {
  const list = await getSheeps();
  const box = document.createElement("div");
  box.className = "bg-white rounded-2xl shadow p-6";
  box.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div></div>
      <button id="toCentang" class="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" ${Pstate.selectedSheep?'':'disabled'}>Lanjut ke Centang Makan</button>
    </div>
    <h3 class="text-center font-semibold mb-4">Pilih Kambing</h3>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4" id="sheepGrid"></div>

    <div class="mt-8 bg-white rounded-2xl border p-4">
      <h4 class="text-center font-semibold mb-3">Keterangan Warna Status</h4>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="border-2 border-red-300 bg-red-50 rounded-xl p-4 text-center"><div class="font-bold text-red-600">MERAH</div><div class="text-sm">Belum makan</div></div>
        <div class="border-2 border-yellow-300 bg-yellow-50 rounded-xl p-4 text-center"><div class="font-bold text-yellow-600">KUNING</div><div class="text-sm">Sudah makan 1x</div></div>
        <div class="border-2 border-amber-400 bg-amber-50 rounded-xl p-4 text-center"><div class="font-bold text-amber-600">OREN</div><div class="text-sm">Sudah makan 2x</div></div>
        <div class="border-2 border-emerald-400 bg-emerald-50 rounded-xl p-4 text-center"><div class="font-bold text-emerald-600">HIJAU</div><div class="text-sm">Sudah makan 3x</div></div>
      </div>
    </div>
  `;
  host.appendChild(box);

  const grid = box.querySelector("#sheepGrid");
  grid.innerHTML = list.map((k) => `
    <button class="card border rounded-xl p-4 text-center ${Pstate.selectedSheep?.id===k.id?'ring-2 ring-blue-500':''}"
            data-id="${k.id}" data-name="${k.name}">
      <div class="text-2xl mb-1">🐑</div>
      <div class="font-medium">${k.name}</div>
      <div class="text-xs text-gray-500">Belum makan</div>
    </button>
  `).join("");

  grid.onclick = (e) => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;
    Pstate.selectedSheep = { id: btn.dataset.id, name: btn.dataset.name };
    Prender();
  };
  box.querySelector("#toCentang").onclick = () => { Pstate.step = 2; Prender(); };
}

/** STEP 2: CENTANG MAKAN (POST sheep-reports) */
async function renderCentangMakan(host) {
  const box = document.createElement("div");
  box.className = "bg-white rounded-2xl shadow p-6";
  box.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button id="back1" class="px-3 py-2 bg-gray-700 text-white rounded-lg">Kembali</button>
      <div class="text-sm text-gray-600">Kambing: <b>${Pstate.selectedSheep?.name}</b></div>
      <button id="toRiwayat" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Riwayat Data</button>
    </div>
    <h3 class="text-center font-semibold mb-4">Centang Makan Kambing</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <button id="btnBelum" class="border-2 border-red-300 bg-red-50 rounded-2xl p-10 text-center">
        <div class="text-4xl mb-4">❌</div>
        <div class="font-semibold text-red-700">Belum Diberi Makan</div>
      </button>
      <button id="btnSudah" class="border-2 border-emerald-300 bg-emerald-50 rounded-2xl p-10 text-center">
        <div class="text-4xl mb-4">✅</div>
        <div class="font-semibold text-emerald-700">Sudah Diberi Makan</div>
      </button>
    </div>
  `;
  host.appendChild(box);

  box.querySelector("#back1").onclick = () => { Pstate.step = 1; Prender(); };
  box.querySelector("#toRiwayat").onclick = () => { Pstate.step = 3; Prender(); };

  async function simpan(status) {
    try {
      await api("/api/sheep-reports", {
        method: "POST",
        body: JSON.stringify({
          sheep_id: Pstate.selectedSheep.id,
          feeding_time: new Date().toISOString(),
          status, // "Sudah Diberi Makan" | "Belum Diberi Makan"
        }),
      });
      // modal ok
      const modal = $$("#okModal");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      $$("#okBtn").onclick = () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      };
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  }
  box.querySelector("#btnBelum").onclick = () => simpan("Belum Diberi Makan");
  box.querySelector("#btnSudah").onclick = () => simpan("Sudah Diberi Makan");
}

/** STEP 3: RIWAYAT PANGAN (GET sheep-reports) */
async function getSheepReports() {
  return unwrapList(await api("/api/sheep-reports?limit=500"));
}
async function renderRiwayatPangan(host) {
  const box = document.createElement("div");
  box.className = "bg-white rounded-2xl shadow p-6";
  box.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <button id="back2" class="px-3 py-2 bg-gray-700 text-white rounded-lg">Kembali ke Pilih Kambing</button>
      <div></div>
    </div>
    <h3 class="font-semibold mb-4">Riwayat</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="historyList"></div>
  `;
  host.appendChild(box);
  box.querySelector("#back2").onclick = () => { Pstate.step = 1; Prender(); };

  const items = await getSheepReports();
  const sheeps = await getSheeps();

  // kelompokkan by sheep
  const bySheep = {};
  items.forEach((it) => { (bySheep[it.sheep_id] ||= []).push(it); });

  const sheepName = (id) => sheeps.find((s) => s.id === id)?.name || "Kambing";

  const listEl = box.querySelector("#historyList");
  const cards = Object.entries(bySheep).map(([id, arr]) => {
    const today = arr.filter((a) => new Date(a.feeding_time).toISOString().slice(0, 10) === Pstate.dateKey);
    const count = today.filter((x) => x.status === "Sudah Diberi Makan").length;
    let color = "border-red-300 bg-red-50";
    if (count === 1) color = "border-yellow-300 bg-yellow-50";
    if (count === 2) color = "border-amber-300 bg-amber-50";
    if (count >= 3) color = "border-emerald-300 bg-emerald-50";

    return `
      <div class="border-2 ${color} rounded-xl p-4">
        <div class="font-semibold mb-1">🐑 ${sheepName(id)}</div>
        <div class="text-sm text-gray-600">
          ${count ? `Sudah diberi makan <b>${count}</b> kali hari ini` : `Belum diberi makan hari ini`}
        </div>
        <div class="mt-3">
          <button class="px-3 py-1 bg-blue-600 text-white rounded" data-detail="${id}">Detail</button>
        </div>
      </div>
    `;
  }).join("");

  listEl.innerHTML = cards || `<div class="text-gray-500">Belum ada data.</div>`;

  listEl.onclick = (e) => {
    const btn = e.target.closest("button[data-detail]");
    if (!btn) return;
    const id = btn.dataset.detail;
    const rows = (bySheep[id] || []).sort((a, b) => new Date(b.feeding_time) - new Date(a.feeding_time));
    const text = rows.map((r, i) => `${i + 1}. ${new Date(r.feeding_time).toLocaleString()} — ${r.status}`).join("\n");
    alert(`Detail ${sheepName(id)}:\n\n${text || "Belum ada catatan."}`);
  };
}

// init
Prender();
