// js/auth.js
const KUNCI_STORAGE_LOGIN =
  typeof KUNCI_PENYIMPANAN !== "undefined" && KUNCI_PENYIMPANAN
    ? KUNCI_PENYIMPANAN
    : "cbt_ma_sihu_sesi_v1";

function tampilkanPesanLogin(pesan) {
  const elError = document.getElementById("pesan-error");
  if (elError) {
    elError.textContent = pesan;
    elError.style.display = "block";
    elError.style.color = "#b91c1c";
    return;
  }
  alert(pesan);
}

function sembunyikanPesanLogin() {
  const elError = document.getElementById("pesan-error");
  if (elError) {
    elError.textContent = "";
    elError.style.display = "none";
  }
}

async function muatDaftarMapelLogin() {
  const selectMapel = document.getElementById("mapel");
  if (!selectMapel || typeof API_URL === "undefined" || !API_URL || API_URL.includes("TEMPEL_")) {
    return;
  }

  const opsiAwal = Array.from(selectMapel.options)
    .filter((opt) => opt.value !== "")
    .map((opt) => opt.value);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getMapel" })
    });
    const hasil = await res.json();
    if (hasil.status !== "success" || !Array.isArray(hasil.data)) return;

    const gabungan = [];
    const cek = new Set();

    [...hasil.data, ...opsiAwal].forEach((m) => {
      const bersih = String(m || "").trim();
      if (!bersih) return;
      const key = bersih.toLowerCase();
      if (!cek.has(key)) {
        cek.add(key);
        gabungan.push(bersih);
      }
    });

    if (gabungan.length > 0) {
      selectMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
      gabungan.forEach((namaMapel) => {
        const opt = document.createElement("option");
        opt.value = namaMapel;
        opt.textContent = namaMapel;
        selectMapel.appendChild(opt);
      });
    }
  } catch (e) {
    // Pertahankan opsi bawaan HTML jika jaringan gagal
  }
}

document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  sembunyikanPesanLogin();

  const nis = document.getElementById("nis")?.value.trim() || "";
  const token = document.getElementById("token")?.value.trim().toUpperCase() || "";
  const mapel = document.getElementById("mapel")?.value.trim() || "";
  const btn = document.getElementById("btn-masuk") || e.submitter;

  if (!nis || !token) {
    tampilkanPesanLogin("Mohon lengkapi NIS dan Token ujian terlebih dahulu.");
    return;
  }

  if (!mapel) {
    tampilkanPesanLogin("Silakan pilih mata pelajaran terlebih dahulu.");
    return;
  }

  if (typeof API_URL === "undefined" || !API_URL || API_URL.includes("TEMPEL_")) {
    tampilkanPesanLogin("URL API Google Apps Script belum diatur di js/config.js.");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Memeriksa...";
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        nis,
        token,
        mapel
      })
    });

    const hasil = await res.json();
    if (hasil.status !== "success") {
      throw new Error(hasil.message || "Login ujian gagal.");
    }

    const durasiMenit = Number(hasil.durasiMenit) > 0 ? Number(hasil.durasiMenit) : 90;
    const soalDariServer = Array.isArray(hasil.soal) ? hasil.soal : [];
    const namaAsli = hasil.peserta?.nama || nis;
    const kelasAsli = hasil.peserta?.kelas || "-";

    const sesiBaru = {
      nis: hasil.peserta?.nis || nis,
      nama: namaAsli,
      kelas: kelasAsli,
      namaPeserta: `${namaAsli} (${hasil.peserta?.nis || nis})`,
      mapel: mapel,
      durasiMenit: durasiMenit,
      waktuSelesai: Date.now() + durasiMenit * 60 * 1000,
      soalList: soalDariServer,
      indeksAktif: 0,
      jawaban: hasil.savedAnswers && typeof hasil.savedAnswers === "object" ? hasil.savedAnswers : {},
      pelanggaran: 0
    };

    localStorage.setItem(KUNCI_STORAGE_LOGIN, JSON.stringify(sesiBaru));
    window.location.href = "exam.html";
  } catch (err) {
    tampilkanPesanLogin(err.message || "Terjadi kesalahan saat menghubungi server.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Masuk Ujian";
    }
  }
});

muatDaftarMapelLogin();