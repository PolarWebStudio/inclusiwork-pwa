// --- CONFIGURACIÓN DE LA API BACKEND ---
const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000/api"
        : "https://inclusiwork-api.onrender.com/api"; // <-- URL lista para Render

// --- ESTADO GLOBAL DEL USUARIO ---
const userState = {
    username: "demo_user",
    balance: parseFloat(localStorage.getItem("inclusiwork_balance")) || 0,
    role: localStorage.getItem("inclusiwork_role") || "Operador", // 'Operador' o 'Tutor'
    voiceEnabled: false
};

// --- INICIALIZACIÓN UNIFICADA ---
document.addEventListener("DOMContentLoaded", () => {
    actualizarInterfaz();
    syncBalanceWithBackend();
    loadOgadsOffers();
    loadMonlixOfferwall();

    // Iniciar con el Canal A por defecto
    if (typeof loadTaskChannel === "function") {
        loadTaskChannel("api");
    }
});

// --- SINCRONIZACIÓN DE SALDO REAL DESDE EL BACKEND ---
async function syncBalanceWithBackend() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/user/balance?username=${userState.username}`
        );
        if (response.ok) {
            const data = await response.json();
            userState.balance = data.balance;
            localStorage.setItem("inclusiwork_balance", data.balance);
            actualizarInterfaz();
        }
    } catch (error) {
        console.warn(
            "[PWA] Servidor Backend offline/local. Usando caché local:",
            error
        );
    }
}

// --- CARGA DE OFERTAS OGADS ---
async function loadOgadsOffers() {
    const container = document.getElementById("ogads-offerwall-container");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/offers/ogads`);
        if (!response.ok) throw new Error("Error al obtener ofertas");

        const data = await response.json();

        if (data.offers && data.offers.length > 0) {
            let html =
                '<div style="display: flex; flex-direction: column; gap: 10px;">';
            data.offers.forEach(offer => {
                html += `
                    <div style="border: 1px solid #d1d5db; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${offer.name_short || offer.name}</strong>
                            <p style="font-size: 0.8rem; color: #555;">${offer.ad_description || ""}</p>
                        </div>
                        <a href="${offer.link}" target="_blank" style="background: #2e7d32; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.85rem;">
                            Ganar +$${roundReward(offer.payout)} COP
                        </a>
                    </div>
                `;
            });
            html += "</div>";
            container.innerHTML = html;
        } else {
            container.innerHTML =
                '<p style="text-align: center; color: #555;">No hay ofertas disponibles para tu ubicación en este momento.</p>';
        }
    } catch (err) {
        console.error("Error al cargar OGAds:", err);
        container.innerHTML =
            '<p style="text-align: center; color: #888;">Servicio de ofertas temporalmente no disponible.</p>';
    }
}

// --- CARGA DEL OFFERWALL MONLIX ---
function loadMonlixOfferwall(username = "demo_user") {
    // Cuando te llegue el correo, reemplazas esto por tu ID real (ej: "65f8a9...")
    const MONLIX_APP_ID = "AQUÍ_VA_TU_APP_ID";

    const container = document.getElementById("monlix-offerwall-container");

    if (!container) return;

    // Si aún no hemos puesto la App ID real, mostramos una tarjeta limpia
    if (MONLIX_APP_ID === "AQUÍ_VA_TU_APP_ID") {
        container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: #555;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
        <h3 style="margin-bottom: 0.5rem; color: #1a237e;">Muro en Proceso de Verificación</h3>
        <p style="max-width: 400px; margin: 0 auto; font-size: 0.95rem;">
          Estamos validando las credenciales de la red publicitaria. Muy pronto podrás completar ofertas y sumar más saldo COP.
        </p>
      </div>
    `;
    } else {
        // Cuando pongas tu ID real, inserta el iframe automáticamente
        const offerwallUrl = `https://offerwall.monlix.com/tag/${MONLIX_APP_ID}?userId=${encodeURIComponent(username)}`;
        container.innerHTML = `
      <iframe 
        src="${offerwallUrl}" 
        style="width: 100%; height: 600px; border: none;" 
        title="Monlix Offerwall">
      </iframe>
    `;
    }
}

// --- CÁLCULO DE RECOMPENSA COP ---
function roundReward(payoutUsd) {
    const trm = 4000;
    const margin = 0.8;
    return Math.round(parseFloat(payoutUsd || 0) * trm * margin);
}

// --- ACTUALIZACIÓN DE UI ---
function actualizarInterfaz() {
    const balanceEl = document.getElementById("user-balance");
    if (balanceEl) {
        balanceEl.textContent = `$${userState.balance.toLocaleString("es-CO", { minimumFractionDigits: 2 })} COP`;
    }

    const roleEl = document.getElementById("role-indicator");
    if (roleEl) {
        roleEl.textContent = `Modo: ${userState.role}`;
    }
}

// --- CAMBIO DE ROL (TUTOR / OPERADOR) ---
function switchUserRole() {
    userState.role = userState.role === "Operador" ? "Tutor" : "Operador";
    localStorage.setItem("inclusiwork_role", userState.role);
    actualizarInterfaz();

    const mensaje = `Modo cambiado a ${userState.role}. ${userState.role === "Tutor" ? "Ahora puedes asignar y supervisar tareas." : "Ahora puedes realizar tareas y generar ingresos."}`;
    alert(mensaje);
    leerTexto(mensaje);
}

// --- LECTOR DE VOZ (ACCESIBILIDAD) ---
function toggleVoiceAssist() {
    userState.voiceEnabled = !userState.voiceEnabled;
    const btn = document.getElementById("btn-voice");

    if (userState.voiceEnabled) {
        if (btn) btn.style.background = "rgba(76, 175, 80, 0.5)";
        leerTexto("Asistente de voz activado.");
    } else {
        if (btn) btn.style.background = "rgba(255, 255, 255, 0.2)";
        window.speechSynthesis.cancel();
    }
}

function leerTexto(texto) {
    if (!userState.voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

// --- SELECTOR DE CANALES ---
function selectChannel(channelId) {
    document
        .querySelectorAll(".channel-card")
        .forEach(card => card.classList.remove("active"));

    const targetCard = document.getElementById(`chan-${channelId}`);
    if (targetCard) targetCard.classList.add("active");

    if (typeof loadTaskChannel === "function") {
        loadTaskChannel(channelId);
    }
}

// --- REGISTRO DEL SERVICE WORKER (PWA) ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then(reg =>
                console.log("Service Worker registrado con éxito:", reg.scope)
            )
            .catch(err =>
                console.error("Error al registrar el Service Worker:", err)
            );
    });
}
