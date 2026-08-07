const taskDatabase = {
    api: [
        {
            id: 1,
            type: "image",
            prompt: "¿Hay un perro en esta imagen?",
            content: "https://images.unsplash.com/photo-1543466835-00a7907e9de1",
            reward: 250
        },
        {
            id: 2,
            type: "text",
            prompt: "¿Este texto es ofensivo?",
            content: '"Me encanta el clima de hoy, es perfecto."',
            reward: 150
        },
        {
            id: 3,
            type: "image",
            prompt: "¿Este vehículo es un camión?",
            content: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7",
            reward: 300
        }
    ],
    sdk: [
        {
            id: 4,
            type: "survey",
            prompt: "Encuesta Rápida de Consumo",
            content: "¿Qué bebida prefieres en el desayuno?",
            options: ["Café", "Jugo", "Chocolate"],
            reward: 800
        },
        {
            id: 5,
            type: "survey",
            prompt: "Verificación de Perfil",
            content: "¿En qué rango de edad te encuentras?",
            options: ["18-25", "26-35", "36-50"],
            reward: 500
        }
    ],
    b2b: [
        {
            id: 6,
            type: "audio",
            prompt: "Transcribe el total de la factura de audio",
            content: "El total de la compra en la ferretería es de cuarenta y cinco mil pesos.",
            reward: 1200
        },
        {
            id: 7,
            type: "text",
            prompt: "Clasifica el tipo de negocio local",
            content: '"Panadería La Especial - Venta de pan, postres y tintos"',
            options: ["Restaurante", "Panadería/Pastelería", "Ferretería"],
            reward: 600
        }
    ]
};

let currentTaskIndex = 0;
let currentChannel = "api";

function loadTaskChannel(channelId) {
    currentChannel = channelId;
    currentTaskIndex = 0;

    let mensaje = "";
    if (channelId === "api") mensaje = "Canal de Tareas Globales seleccionado.";
    if (channelId === "sdk") mensaje = "Canal de Ofertas Rápidas seleccionado.";
    if (channelId === "b2b") mensaje = "Canal de Empresas Locales seleccionado.";

    if (typeof leerTexto === "function") leerTexto(mensaje);
    renderCurrentTask();
}

function renderCurrentTask() {
    const workspace = document.getElementById("task-content");
    if (!workspace) return;

    const tasks = taskDatabase[currentChannel];

    if (currentTaskIndex >= tasks.length) {
        workspace.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: #2e7d32;">¡Entrenamiento completado en este canal! 🎉</h3>
                <p style="color: var(--subtext-color, #666);">Cambia de canal para practicar otras habilidades o realiza ofertas reales arriba.</p>
            </div>
        `;
        if (typeof leerTexto === "function") leerTexto("Entrenamiento finalizado en este canal.");
        return;
    }

    const task = tasks[currentTaskIndex];
    let html = `
        <div style="margin-bottom: 15px;">
            <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                Puntos DEMO: +${task.reward} pts
            </span>
        </div>
        <h3 style="margin-bottom: 15px;">${task.prompt}</h3>
    `;

    if (task.type === "image") {
        html += `<img src="${task.content}" alt="Imagen de tarea" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">`;
        html += `
            <div style="display: flex; gap: 10px;">
                <button class="btn-task" style="background: #4caf50; color: white;" onclick="completeTask('${task.type}', ${task.reward})">SÍ</button>
                <button class="btn-task" style="background: #f44336; color: white;" onclick="completeTask('${task.type}', ${task.reward})">NO</button>
            </div>
        `;
    } else if (task.type === "text" || task.type === "audio") {
        html += `<div style="padding: 15px; background: #f0f4f8; border-left: 4px solid var(--primary, #1a237e); margin-bottom: 15px; border-radius: 4px; font-style: italic;">${task.content}</div>`;

        if (task.options) {
            html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
            task.options.forEach(opt => {
                html += `<button class="btn-task" style="background: #e0e0e0; color: #333;" onclick="completeTask('${task.type}', ${task.reward})">${opt}</button>`;
            });
            html += `</div>`;
        } else {
            html += `
                <div style="display: flex; gap: 10px;">
                    <button class="btn-task" style="background: #4caf50; color: white;" onclick="completeTask('${task.type}', ${task.reward})">SÍ / Completar</button>
                    <button class="btn-task" style="background: #f44336; color: white;" onclick="completeTask('${task.type}', ${task.reward})">NO / Omitir</button>
                </div>
            `;
        }
    } else if (task.type === "survey") {
        html += `<p style="margin-bottom: 15px;">${task.content}</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        task.options.forEach(opt => {
            html += `<button class="btn-task" style="background: #e0e0e0; color: #333;" onclick="completeTask('${task.type}', ${task.reward})">${opt}</button>`;
        });
        html += `</div>`;
    }

    workspace.innerHTML = html;
    if (typeof leerTexto === "function") leerTexto(`${task.prompt}. Puntos de práctica: ${task.reward}.`);
}

async function completeTask(taskType, reward) {
    const workspace = document.getElementById("task-content");
    if (workspace) {
        workspace.innerHTML = '<p style="text-align: center; padding: 2rem;">Validando ejercicio de práctica...</p>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: userState.username,
                task_type: taskType,
                reward: reward
            })
        });

        if (response.ok) {
            const data = await response.json();
            userState.practiceBalance = data.new_practice_balance;
            localStorage.setItem("inclusiwork_practice_balance", data.new_practice_balance);
        } else {
            userState.practiceBalance += reward;
            localStorage.setItem("inclusiwork_practice_balance", userState.practiceBalance);
        }
    } catch (error) {
        userState.practiceBalance += reward;
        localStorage.setItem("inclusiwork_practice_balance", userState.practiceBalance);
    }

    if (typeof actualizarInterfaz === "function") actualizarInterfaz();
    if (typeof leerTexto === "function") leerTexto(`Ejercicio de práctica completado. Ganaste ${reward} puntos.`);

    currentTaskIndex++;
    setTimeout(() => {
        renderCurrentTask();
    }, 400);
}

const style = document.createElement("style");
style.innerHTML = `
    .btn-task {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-task:hover { opacity: 0.9; }
`;
document.head.appendChild(style);
