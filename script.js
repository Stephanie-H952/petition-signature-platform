// ---------- Canvas signature pad ----------
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");
let drawing = false;

canvas.addEventListener("mousedown", () => drawing = true);
canvas.addEventListener("mouseup", () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener("mouseleave", () => { drawing = false; ctx.beginPath(); });
canvas.addEventListener("mousemove", draw);

function draw(e) {
  if (!drawing) return;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

// ---------- Clear the canvas ----------
document.getElementById("clearSignature").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ---------- Submit a signature ----------
document.getElementById("petitionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const imageData = canvas.toDataURL("image/png");

  if (!name || !email) return alert("Name and Email are required");

  try {
    const res = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message, imageData }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Signature submitted successfully!");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      document.getElementById("petitionForm").reset();
      loadSignatureCount();
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    console.error(err);
    alert("Failed to submit signature");
  }
});

// ---------- Load the total signature count ----------
async function loadSignatureCount() {
  try {
    const res = await fetch("/api/count");
    const data = await res.json();
    document.getElementById("signatureCount").innerText = data.count;
  } catch (err) {
    console.error(err);
  }
}
loadSignatureCount();

// ---------- Admin tools ----------
let adminPassword = null;

document.getElementById("adminLoginBtn").addEventListener("click", async () => {
  const password = prompt("Enter admin password:");
  if (!password) return;
  adminPassword = password;
  await loadAdminSignatures();
  document.getElementById("exportExcel").classList.remove("hidden");
});

// Load the admin signature list
async function loadAdminSignatures() {
  try {
    const res = await fetch("/api/admin/signs", { headers: { "x-admin-password": adminPassword } });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }

    const list = document.getElementById("signatureList");
    list.innerHTML = "";
    data.signs.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${s.name}</strong> (${s.email}) - ${s.message || ""}
        <a href="${s.s3Url}" target="_blank">View Signature</a>
        <button onclick="deleteSign('${s.name}','${s.email}')">Delete</button>
      `;
      list.appendChild(li);
    });
  } catch (err) { console.error(err); }
}

// Delete a signature
async function deleteSign(name, email) {
  if (!confirm(`Delete ${name}'s signature?`)) return;
  try {
    const res = await fetch("/api/admin/signs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": adminPassword },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadAdminSignatures();
      loadSignatureCount();
    } else alert(data.error);
  } catch (err) { console.error(err); }
}

// ---------- Export XLSX ----------
document.getElementById("exportExcel").addEventListener("click", () => {
  fetch("/api/admin/export", {
    method: "GET",
    headers: { "x-admin-password": adminPassword }
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signatures.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  })
  .catch(err => console.error(err));
});
