// js/guru.js
const KUNCI_SESI_GURU = "cbt_ma_sihu_guru_sesi";

let kredensialGuru = null;
let dataHasilTerakhir = [];
let daftarSoalCache = [];
let targetEditSoal = null;

function aktifkanTampilanGuru(infoGuruData) {
  const infoGuruEl = document.getElementById("info-guru");
  if (infoGuruEl && infoGuruData) {
    infoGuruEl.textContent = `Guru: ${infoGuruData.namaGuru} (${infoGuruData.mapelAmpu || "Semua Mapel"})`;
  }

  const panelLogin = document.getElementById("panel-login-guru");
  const areaKerja = document.getElementById("area-kerja-guru");
  if (panelLogin) panelLogin.style.display = "none";
  if (areaKerja) areaKerja.style.display = "flex";

  if (infoGuruData?.mapelAmpu && infoGuruData.mapelAmpu.toUpperCase() !== "SEMUA") {
    const sMapel = document.getElementById("s-mapel");
    const filterHasil = document.getElementById("filter-mapel-hasil");
    if (sMapel) sMapel.value = infoGuruData.mapelAmpu;
    if (filterHasil) filterHasil.value = infoGuruData.mapelAmpu;
  }
}

function aktifkanTabGuru(idTab) {
  document.querySelectorAll(".tab-guru").forEach((btn) => {
    btn.classList.toggle("aktif", btn.dataset.tab === idTab);
  });

  document.querySelectorAll(".konten-tab-guru").forEach((panel) => {
    const cocok = panel.id === idTab;
    panel.classList.toggle("aktif", cocok);
    panel.style.display = cocok ? (idTab === "tab-input-soal" ? "flex" : "block") : "none";
  });
}

document.querySelectorAll(".tab-guru").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab) {
      aktifkanTabGuru(btn.dataset.tab);
    }
  });
});

async function pulihkanSesiGuru() {
  try {
    const raw = sessionStorage.getItem(KUNCI_SESI_GURU);
    if (!raw) return;
    const tersimpan = JSON.parse(raw);
    if (tersimpan?.idGuru && tersimpan?.kodeAkses && tersimpan?.guru) {
      kredensialGuru = { idGuru: tersimpan.idGuru, kodeAkses: tersimpan.kodeAkses };
      aktifkanTampilanGuru(tersimpan.guru);
      await muatHasilSiswa();
      await muatDaftarSoal();
    }
  } catch (e) {
    sessionStorage.removeItem(KUNCI_SESI_GURU);
  }
}

document.getElementById("form-login-guru")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const idGuru = document.getElementById("id-guru").value.trim();
  const kodeAkses = document.getElementById("kode-akses").value.trim();
  const btn = document.getElementById("btn-login-guru");

  btn.disabled = true;
  btn.textContent = "Memeriksa...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "guruLogin", idGuru, kodeAkses })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") {
      throw new Error(hasil.message || "Login guru gagal.");
    }

    kredensialGuru = { idGuru, kodeAkses };
    sessionStorage.setItem(
      KUNCI_SESI_GURU,
      JSON.stringify({ idGuru, kodeAkses, guru: hasil.guru })
    );
    aktifkanTampilanGuru(hasil.guru);

    await muatHasilSiswa();
    await muatDaftarSoal();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk Panel Guru";
  }
});

async function muatDaftarSoal() {
  if (!kredensialGuru) return;
  const mapelFilter = document.getElementById("filter-mapel-soal")?.value.trim() || "";
  const tbody = document.getElementById("tbody-soal");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="padding:12px;text-align:center;">Memuat daftar soal...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getSoal",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        mapelFilter
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    daftarSoalCache = hasil.data || [];
    renderTabelSoal();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:12px;text-align:center;color:#b91c1c;">${err.message}</td></tr>`;
  }
}

function renderTabelSoal() {
  const tbody = document.getElementById("tbody-soal");
  if (!tbody) return;

  if (!daftarSoalCache.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:12px;text-align:center;">Belum ada soal tersimpan.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  daftarSoalCache.forEach((s, index) => {
    const opsiE = s.opsiE ? ` | E. ${s.opsiE}` : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${s.idSoal}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${s.mapel}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;max-width:380px;">
        <div style="font-weight:600;margin-bottom:4px;">${s.pertanyaan}</div>
        <div style="font-size:0.8rem;color:#475569;">
          A. ${s.opsiA} | B. ${s.opsiB} | C. ${s.opsiC} | D. ${s.opsiD}${opsiE}
        </div>
      </td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:700;">${s.kunci || "-"}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${s.bobot}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">
        <button type="button" class="btn-sekunder btn-edit-soal" data-index="${index}" style="padding:5px 9px;font-size:0.8rem;">Edit</button>
        <button type="button" class="btn-hapus-soal" data-index="${index}" style="padding:5px 9px;font-size:0.8rem;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer;">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-edit-soal").forEach((btn) => {
    btn.addEventListener("click", () => bukaFormEditSoal(Number(btn.dataset.index)));
  });

  tbody.querySelectorAll(".btn-hapus-soal").forEach((btn) => {
    btn.addEventListener("click", () => hapusSoalByIndex(Number(btn.dataset.index)));
  });
}

function bukaFormEditSoal(index) {
  const soal = daftarSoalCache[index];
  if (!soal) return;

  targetEditSoal = { idLama: soal.idSoal, mapelLama: soal.mapel };
  document.getElementById("edit-id").value = soal.idSoal;
  document.getElementById("edit-mapel").value = soal.mapel;
  document.getElementById("edit-tanya").value = soal.pertanyaan;
  document.getElementById("edit-a").value = soal.opsiA || "";
  document.getElementById("edit-b").value = soal.opsiB || "";
  document.getElementById("edit-c").value = soal.opsiC || "";
  document.getElementById("edit-d").value = soal.opsiD || "";

  const editE = document.getElementById("edit-e");
  if (editE) editE.value = soal.opsiE || "";

  document.getElementById("edit-kunci").value = soal.kunci || "A";
  document.getElementById("edit-bobot").value = soal.bobot || 1;

  const panelEdit = document.getElementById("panel-edit-soal");
  panelEdit.style.display = "block";
  panelEdit.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("btn-batal-edit")?.addEventListener("click", () => {
  targetEditSoal = null;
  document.getElementById("panel-edit-soal").style.display = "none";
});

document.getElementById("form-edit-soal")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!kredensialGuru || !targetEditSoal) return;

  const btn = document.getElementById("btn-simpan-edit");
  btn.disabled = true;
  btn.textContent = "Menyimpan perubahan...";

  const soalBaru = {
    idSoal: document.getElementById("edit-id").value.trim(),
    mapel: document.getElementById("edit-mapel").value.trim(),
    pertanyaan: document.getElementById("edit-tanya").value.trim(),
    opsiA: document.getElementById("edit-a").value.trim(),
    opsiB: document.getElementById("edit-b").value.trim(),
    opsiC: document.getElementById("edit-c").value.trim(),
    opsiD: document.getElementById("edit-d").value.trim(),
    opsiE: document.getElementById("edit-e")?.value.trim() || "",
    kunci: document.getElementById("edit-kunci").value,
    bobot: Number(document.getElementById("edit-bobot").value) || 1
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateSoal",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        idLama: targetEditSoal.idLama,
        mapelLama: targetEditSoal.mapelLama,
        soalBaru
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    document.getElementById("status-kelola-soal").textContent = hasil.message;
    document.getElementById("panel-edit-soal").style.display = "none";
    targetEditSoal = null;
    await muatDaftarSoal();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Perubahan Soal";
  }
});

async function hapusSoalByIndex(index) {
  const soal = daftarSoalCache[index];
  if (!soal || !kredensialGuru) return;

  const yakin = confirm(`Hapus soal "${soal.idSoal}" (${soal.mapel}) secara permanen dari BankSoal dan Kunci?`);
  if (!yakin) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "deleteSoal",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        idSoal: soal.idSoal,
        mapel: soal.mapel
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    document.getElementById("status-kelola-soal").textContent = hasil.message;
    await muatDaftarSoal();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById("btn-muat-soal")?.addEventListener("click", muatDaftarSoal);

document.getElementById("form-upload-soal")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!kredensialGuru) return;

  const btn = document.getElementById("btn-simpan-soal");
  btn.disabled = true;
  btn.textContent = "Menyimpan soal...";

  const item = {
    idSoal: document.getElementById("s-id").value.trim(),
    mapel: document.getElementById("s-mapel").value.trim(),
    pertanyaan: document.getElementById("s-tanya").value.trim(),
    opsiA: document.getElementById("s-a").value.trim(),
    opsiB: document.getElementById("s-b").value.trim(),
    opsiC: document.getElementById("s-c").value.trim(),
    opsiD: document.getElementById("s-d").value.trim(),
    opsiE: document.getElementById("s-e")?.value.trim() || "",
    kunci: document.getElementById("s-kunci").value,
    bobot: Number(document.getElementById("s-bobot").value) || 1
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "uploadSoal",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        items: [item]
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    document.getElementById("status-guru").textContent = hasil.message;
    document.getElementById("s-id").value = "";
    document.getElementById("s-tanya").value = "";
    document.getElementById("s-a").value = "";
    document.getElementById("s-b").value = "";
    document.getElementById("s-c").value = "";
    document.getElementById("s-d").value = "";
    if (document.getElementById("s-e")) document.getElementById("s-e").value = "";
    document.getElementById("s-kunci").value = "";
    await muatDaftarSoal();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Soal ke Google Sheets";
  }
});

async function muatHasilSiswa() {
  if (!kredensialGuru) return;
  const mapelFilter = document.getElementById("filter-mapel-hasil")?.value.trim() || "";
  const tbody = document.getElementById("tbody-hasil");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="padding:12px;text-align:center;">Memuat hasil...</td></tr>`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getHasil",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        mapelFilter
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    dataHasilTerakhir = hasil.data || [];
    if (dataHasilTerakhir.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding:12px;text-align:center;">Belum ada data hasil ujian.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    dataHasilTerakhir.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.waktu}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.nis}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.nama}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.kelas}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.mapel}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:700;">${row.skor}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${row.pelanggaran ?? 0}x</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;max-width:260px;word-break:break-word;">${row.jawaban}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:12px;text-align:center;color:#b91c1c;">${err.message}</td></tr>`;
  }
}

function parseSoalMassal(teks, mapelDefault) {
  const barisList = String(teks || "")
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const items = [];
  const barisBermasalah = [];

  barisList.forEach((baris, idx) => {
    const bagian = baris.split("|").map((p) => p.trim());
    if (bagian.length < 8) {
      barisBermasalah.push(idx + 1);
      return;
    }

    const punyaOpsiE = bagian.length >= 10;
    const idSoal = bagian[0];
    const mapel = bagian[1] || mapelDefault || "Umum";
    const pertanyaan = bagian[2];
    const opsiA = bagian[3] || "";
    const opsiB = bagian[4] || "";
    const opsiC = bagian[5] || "";
    const opsiD = bagian[6] || "";
    const opsiE = punyaOpsiE ? bagian[7] || "" : "";
    const kunciHuruf = String(punyaOpsiE ? bagian[8] : bagian[7] || "").toUpperCase();
    const bobot = punyaOpsiE ? bagian[9] : bagian[8];

    if (!idSoal || !pertanyaan || !["A", "B", "C", "D", "E"].includes(kunciHuruf)) {
      barisBermasalah.push(idx + 1);
      return;
    }

    items.push({
      idSoal,
      mapel,
      pertanyaan,
      opsiA,
      opsiB,
      opsiC,
      opsiD,
      opsiE,
      kunci: kunciHuruf,
      bobot: Number(bobot) > 0 ? Number(bobot) : 1
    });
  });

  return { items, barisBermasalah };
}

const btnIsiContoh = document.getElementById("btn-isi-contoh");
if (btnIsiContoh) {
  btnIsiContoh.addEventListener("click", () => {
    const mapelAwal = document.getElementById("s-mapel")?.value.trim() || "Kimia";
    document.getElementById("s-massal").value = [
      `SOAL01 | ${mapelAwal} | Contoh pertanyaan pilihan ganda pertama? | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Pilihan E | A | 1`,
      `SOAL02 | ${mapelAwal} | Contoh pertanyaan pilihan ganda kedua? | Pilihan A | Pilihan B | Pilihan C | Pilihan D | Pilihan E | C | 2`
    ].join("\n");
  });
}

const formUploadMassal = document.getElementById("form-upload-massal");
if (formUploadMassal) {
  formUploadMassal.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!kredensialGuru) return;

    const textarea = document.getElementById("s-massal");
    const statusMassal = document.getElementById("status-massal");
    const btn = document.getElementById("btn-simpan-massal");
    const mapelDefault = document.getElementById("s-mapel")?.value.trim() || "Umum";

    const { items, barisBermasalah } = parseSoalMassal(textarea.value, mapelDefault);

    if (items.length === 0) {
      alert("Tidak ada baris soal valid. Pastikan format memiliki minimal 8 bagian dipisah tanda |");
      return;
    }

    btn.disabled = true;
    btn.textContent = `Mengupload ${items.length} soal...`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "uploadSoal",
          idGuru: kredensialGuru.idGuru,
          kodeAkses: kredensialGuru.kodeAkses,
          items
        })
      });
      const hasil = await res.json();
      if (hasil.status !== "success") throw new Error(hasil.message);

      let pesan = hasil.message;
      if (barisBermasalah.length > 0) {
        pesan += ` (Baris diabaikan karena format kurang lengkap: ${barisBermasalah.join(", ")})`;
      }
      if (statusMassal) statusMassal.textContent = pesan;
      textarea.value = "";
      await muatDaftarSoal();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Upload Semua Soal ke Google Sheets";
    }
  });
}

document.getElementById("btn-muat-hasil")?.addEventListener("click", muatHasilSiswa);

document.getElementById("btn-export-csv")?.addEventListener("click", () => {
  if (!dataHasilTerakhir.length) {
    alert("Tidak ada data untuk diunduh.");
    return;
  }
  const header = ["Waktu", "NIS", "Nama", "Kelas", "Mapel", "Skor", "Pelanggaran", "Jawaban_JSON"];
  const baris = dataHasilTerakhir.map((r) =>
    [r.waktu, r.nis, r.nama, r.kelas, r.mapel, r.skor, r.pelanggaran ?? 0, r.jawaban]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csvContent = "\uFEFF" + [header.join(","), ...baris].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rekap-hasil-ujian-cbt.csv";
  a.click();
  URL.revokeObjectURL(url);
});

function deteksiDelimiterCsv(barisHeader) {
  const jumlahTitikKoma = (barisHeader.match(/;/g) || []).length;
  const jumlahKoma = (barisHeader.match(/,/g) || []).length;
  return jumlahTitikKoma > jumlahKoma ? ";" : ",";
}

function parseBarisCsv(baris, delimiter) {
  const hasil = [];
  let nilai = "";
  let dalamKutip = false;

  for (let i = 0; i < baris.length; i++) {
    const ch = baris[i];
    const next = baris[i + 1];

    if (ch === '"' && dalamKutip && next === '"') {
      nilai += '"';
      i++;
    } else if (ch === '"') {
      dalamKutip = !dalamKutip;
    } else if (ch === delimiter && !dalamKutip) {
      hasil.push(nilai.trim());
      nilai = "";
    } else {
      nilai += ch;
    }
  }
  hasil.push(nilai.trim());
  return hasil;
}

function parseFileCsvKeSoal(teksCsv, mapelDefault) {
  const bersihBom = String(teksCsv || "").replace(/^\uFEFF/, "");
  const barisList = bersihBom
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (barisList.length === 0) {
    return { items: [], barisBermasalah: [] };
  }

  const delimiter = deteksiDelimiterCsv(barisList[0]);
  const items = [];
  const barisBermasalah = [];

  barisList.forEach((baris, idx) => {
    const kolom = parseBarisCsv(baris, delimiter);

    if (idx === 0 && String(kolom[0] || "").toLowerCase().includes("id_soal")) {
      return;
    }

    if (kolom.length < 8) {
      barisBermasalah.push(idx + 1);
      return;
    }

    const punyaOpsiE = kolom.length >= 10;
    const idSoal = kolom[0];
    const mapel = kolom[1] || mapelDefault || "Umum";
    const pertanyaan = kolom[2];
    const opsiA = kolom[3] || "";
    const opsiB = kolom[4] || "";
    const opsiC = kolom[5] || "";
    const opsiD = kolom[6] || "";
    const opsiE = punyaOpsiE ? kolom[7] || "" : "";
    const kunci = String(punyaOpsiE ? kolom[8] : kolom[7] || "").toUpperCase();
    const bobot = punyaOpsiE ? kolom[9] : kolom[8];

    if (!idSoal || !pertanyaan || !["A", "B", "C", "D", "E"].includes(kunci)) {
      barisBermasalah.push(idx + 1);
      return;
    }

    items.push({
      idSoal,
      mapel,
      pertanyaan,
      opsiA,
      opsiB,
      opsiC,
      opsiD,
      opsiE,
      kunci,
      bobot: Number(bobot) > 0 ? Number(bobot) : 1
    });
  });

  return { items, barisBermasalah };
}

document.getElementById("btn-download-template-csv")?.addEventListener("click", () => {
  const mapelContoh = document.getElementById("s-mapel")?.value.trim() || "Kimia";
  const isiTemplate = [
    "ID_Soal,Mapel,Pertanyaan,Opsi_A,Opsi_B,Opsi_C,Opsi_D,Opsi_E,Kunci,Bobot",
    `SOAL01,${mapelContoh},"Lambang unsur Natrium adalah...",Na,K,Fe,Cl,Mg,A,1`,
    `SOAL02,${mapelContoh},"Rumus kimia air adalah...",CO2,H2O,NaCl,O2,H2SO4,B,2`
  ].join("\n");

  const blob = new Blob(["\uFEFF" + isiTemplate], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_soal_${mapelContoh.toLowerCase().replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("form-upload-csv")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!kredensialGuru) return;

  const inputFile = document.getElementById("file-soal-csv");
  const statusCsv = document.getElementById("status-csv");
  const btn = document.getElementById("btn-upload-csv");
  const mapelDefault = document.getElementById("s-mapel")?.value.trim() || "Umum";

  const file = inputFile?.files?.[0];
  if (!file) {
    alert("Pilih file .csv terlebih dahulu.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Membaca & mengupload CSV...";

  try {
    const isiTeks = await file.text();
    const { items, barisBermasalah } = parseFileCsvKeSoal(isiTeks, mapelDefault);

    if (items.length === 0) {
      throw new Error("Tidak ada baris soal valid di file CSV. Unduh template CSV untuk melihat format yang benar.");
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "uploadSoal",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        items
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    let pesan = hasil.message;
    if (barisBermasalah.length > 0) {
      pesan += ` (Baris dilewati karena format tidak valid: ${barisBermasalah.join(", ")})`;
    }
    if (statusCsv) statusCsv.textContent = pesan;
    inputFile.value = "";

    await muatDaftarSoal();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Import CSV ke Google Sheets";
  }
});

document.getElementById("form-reset-ujian")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!kredensialGuru) return;

  const nis = document.getElementById("reset-nis")?.value.trim() || "";
  const mapel = document.getElementById("reset-mapel")?.value.trim() || "";
  const btn = document.getElementById("btn-reset-ujian");
  const statusEl = document.getElementById("status-reset");

  if (!nis) {
    alert("Masukkan NIS siswa terlebih dahulu.");
    return;
  }

  const konfirmasi = confirm(
    `Yakin ingin mereset ujian untuk NIS "${nis}"${mapel ? ` pada mapel "${mapel}"` : " pada semua mapel"}? Data di RekapNilai akan dihapus.`
  );
  if (!konfirmasi) return;

  btn.disabled = true;
  btn.textContent = "Mereset ujian...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "resetUjian",
        idGuru: kredensialGuru.idGuru,
        kodeAkses: kredensialGuru.kodeAkses,
        nis,
        mapel
      })
    });
    const hasil = await res.json();
    if (hasil.status !== "success") throw new Error(hasil.message);

    if (statusEl) statusEl.textContent = hasil.message;
    document.getElementById("reset-nis").value = "";
    document.getElementById("reset-mapel").value = "";

    await muatHasilSiswa();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Reset Ujian Siswa";
  }
});

pulihkanSesiGuru();
```[cite: 11]
