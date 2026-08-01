// js/app.js

// --- ESTADO GLOBAL DEL USUARIO ---
const userState = {
    balance: parseFloat(localStorage.getItem("inclusiwork_balance")) || 0,
    role: localStorage.getItem("inclusiwork_role") || "Operador", // 'Operador' o 'Tutor'
    voiceEnabled: false
};

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    actualizarInterfaz();

    // Iniciar con el Canal A por defecto
    if (typeof loadTaskChannel === "function") {
        loadTaskChannel("api");
    }
});

// --- ACTUALIZACIÓN DE UI ---
function actualizarInterfaz() {
    // Formatear saldo a Pesos Colombianos
    const balanceEl = document.getElementById("user-balance");
    balanceEl.textContent = `$${userState.balance.toLocaleString("es-CO")} COP`;

    // Actualizar Rol
    const roleEl = document.getElementById("role-indicator");
    roleEl.textContent = `Modo: ${userState.role}`;
}

// --- CAMBIO DE ROL (TUTOR / OPERADOR) ---
function switchUserRole() {
    userState.role = userState.role === "Operador" ? "Tutor" : "Operador";
    localStorage.setItem("inclusiwork_role", userState.role);
    actualizarInterfaz();

    // Alerta accesible
    const mensaje = `Modo cambiado a ${userState.role}. ${userState.role === "Tutor" ? "Ahora puedes asignar y supervisar tareas." : "Ahora puedes realizar tareas y generar ingresos."}`;
    alert(mensaje);
    leerTexto(mensaje);
}

// --- LECTOR DE VOZ (ACCESIBILIDAD) ---
function toggleVoiceAssist() {
    userState.voiceEnabled = !userState.voiceEnabled;
    const btn = document.getElementById("btn-voice");

    if (userState.voiceEnabled) {
        btn.style.background = "rgba(76, 175, 80, 0.5)"; // Verde si está activo
        leerTexto("Asistente de voz activado.");
    } else {
        btn.style.background = "rgba(255, 255, 255, 0.2)";
        window.speechSynthesis.cancel(); // Detener voz
    }
}

function leerTexto(texto) {
    if (!userState.voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Cortar locución anterior
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO"; // Español Colombia
    utterance.rate = 0.9; // Velocidad ligeramente más lenta para claridad
    window.speechSynthesis.speak(utterance);
}

// --- SELECTOR DE CANALES ---
function selectChannel(channelId) {
    // Actualizar UI de los botones
    document
        .querySelectorAll(".channel-card")
        .forEach(card => card.classList.remove("active"));
    document.getElementById(`chan-${channelId}`).classList.add("active");

    // Cargar las tareas del canal correspondiente
    if (typeof loadTaskChannel === "function") {
        loadTaskChannel(channelId);
    }
}

// Registro del Service Worker para PWA
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
    
