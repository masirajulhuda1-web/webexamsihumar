// js/auth.js
const KUNCI_STORAGE_LOGIN =
  typeof KUNCI_PENYIMPANAN !== "undefined" && KUNCI_PENYIMPANAN
    ? KUNCI_PENYIMPANAN
    : "cbt_ma_sihu_sesi_v1";

let timerDeteksiJadwal = null;
let kunciPencarianTerakhir = "";
let sedangCekJadwal = false;

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

function setInfoJadwalSiswa(pesan, tipe = "info") {
  const elInfo = document.getElementById("info-jadwal-siswa");
  if (!elInfo) return;

  if (!pesan) {
    elInfo.style.display = "none";
    elInfo.textContent = "";
    return;
  }

  elInfo.style.display = "block";
  elInfo.textContent = pesan;

  if (tipe === "sukses") {
    elInfo.style.backgroundColor = "#dcfce7";
    elInfo.style.color = "#166534";
    elInfo.style.border = "1px solid #86efac";
  } else if (tipe === "peringatan") {
    elInfo.style.backgroundColor = "#fef3c7";
    elInfo.style.color = "#92400e";
    elInfo.style.border = "1px solid #fcd34d";
  } else {
    elInfo.style.backgroundColor = "#f1f5f9";
    elInfo.style.color = "#334155";
    elInfo.style.border = "1px solid #cbd5e1";
  }
}

async function deteksiMapelAktifSiswa(paksa = false) {
  const nis = document.getElementById("nis")?.value.trim() || "";
  const token = document.getElementById("token")?.value.trim().toUpperCase() || "";
  const grupMapel = document.getElementById("grup-pilih-mapel");
  const selectMapel = document.getElementById("mapel");

  if (!nis || !token) {
    kunciPencarianTerakhir = "";
    if (grupMapel) grupMapel.style.display = "none";
    if (selectMapel) selectMapel.value = "";
    setInfoJadwalSiswa("");
    return null;
  }

  const kunciSekarang = `${nis}__${token}`;
  if (!paksa && kunciSekarang === kunciPencarianTerakhir && selectMapel?.value) {
    return selectMapel.value;
  }

  if (typeof API_URL === "undefined" || !API_URL || API_URL.includes("TEMPEL_")) {
    return null;
  }

  sedangCekJadwal = true;
  setInfoJadwalSiswa("Memeriksa jadwal ujian aktif untuk kelas Anda...", "info");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getMapelAktif",
        nis,
        token
      })
    });
    const hasil = await res.json();

    if (hasil.status !== "success") {
      kunciPencarianTerakhir = "";
      if (grupMapel) grupMapel.style.display = "none";
      if (selectMapel) selectMapel.value = "";
      setInfoJadwalSiswa("");
      if (paksa) {
        tampilkanPesanLogin(hasil.message || "NIS atau Token ujian tidak valid.");
      }
      return null;
    }

    kunciPencarianTerakhir = kunciSekarang;
    sembunyikanPesanLogin();

    const daftarAktif = Array.isArray(hasil.mapelAktif) ? hasil.mapelAktif : [];
    const namaSiswa = hasil.peserta?.nama || nis;
    const kelasSiswa = hasil.peserta?.kelas || "-";

    if (!selectMapel) return null;
    selectMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';

    daftarAktif.forEach((namaMapel) => {
      const opt = document.createElement("option");
      opt.value = namaMapel;
      opt.textContent = namaMapel;
      selectMapel.appendChild(opt);
    });

    if (daftarAktif.length === 1) {
      selectMapel.value = daftarAktif[0];
      if (grupMapel) grupMapel.style.display = "none";
      setInfoJadwalSiswa(
        `Peserta: ${namaSiswa} (Kelas ${kelasSiswa}) • Mapel aktif otomatis: ${daftarAktif[0]}`,
        "sukses"
      );
      return daftarAktif[0];
    }

    if (daftarAktif.length > 1) {
      if (grupMapel) grupMapel.style.display = "block";
      setInfoJadwalSiswa(
        `Peserta: ${namaSiswa} (Kelas ${kelasSiswa}) • Ditemukan ${daftarAktif.length} jadwal aktif, silakan pilih mapel.`,
        "info"
      );
      return selectMapel.value || null;
    }

    if (grupMapel) grupMapel.style.display = "none";
    setInfoJadwalSiswa(
      `Peserta: ${namaSiswa} (Kelas ${kelasSiswa}) • Tidak ada jadwal ujian yang sedang aktif untuk kelas Anda saat ini.`,
      "peringatan"
    );
    return null;
  } catch (e) {
    setInfoJadwalSiswa("");
    return null;
  } finally {
    sedangCekJadwal = false;
  }
}

function jadwalkanCekMapel() {
  clearTimeout(timerDeteksiJadwal);
  timerDeteksiJadwal = setTimeout(() => {
    deteksiMapelAktifSiswa(false);
  }, 550);
}

document.getElementById("nis")?.addEventListener("input", jadwalkanCekMapel);
document.getElementById("token")?.addEventListener("input", jadwalkanCekMapel);
document.getElementById("token")?.addEventListener("blur", () => deteksiMapelAktifSiswa(false));

document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  sembunyikanPesanLogin();

  const nis = document.getElementById("nis")?.value.trim() || "";
  const token = document.getElementById("token")?.value.trim().toUpperCase() || "";
  const selectMapel = document.getElementById("mapel");
  const btn = document.getElementById("btn-masuk") || e.submitter;

  if (!nis || !token) {
    tampilkanPesanLogin("Mohon lengkapi NIS dan Token ujian terlebih dahulu.");
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
    let mapel = selectMapel?.value.trim() || "";
    if (!mapel || kunciPencarianTerakhir !== `${nis}__${token}`) {
      const hasilDeteksi = await deteksiMapelAktifSiswa(true);
      mapel = selectMapel?.value.trim() || hasilDeteksi || "";
    }

    if (!mapel) {
      const grupTerlihat = document.getElementById("grup-pilih-mapel")?.style.display === "block";
      if (grupTerlihat) {
        tampilkanPesanLogin("Silakan pilih salah satu mata pelajaran aktif terlebih dahulu.");
      }
      return;
    }

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
