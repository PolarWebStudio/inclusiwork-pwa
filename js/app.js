// js/app.js CONFIGURACIÓN DE LA API BACKEND ---
// Detecta si estás probando localmente o en producción cuando despliegues en Render
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

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    actualizarInterfaz();
    syncBalanceWithBackend();

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
