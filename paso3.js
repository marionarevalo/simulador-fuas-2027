document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("formulario-paso-3");
	const incomeBody = document.getElementById("ingresos-body");
	const incomeCategories = [
		"sueldos",
		"pensiones",
		"honorarios",
		"retiros",
		"dividendos",
		"intereses",
		"ganancias",
		"pension-alimenticia",
		"actividades-independientes"
	];
	const STORAGE_KEY = "simulador_fuas_2027_paso2";
	const currencyFormatter = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
	let hasSubmitted = false;

	const formatCurrency = (amount) => currencyFormatter.format(Number(amount) || 0);

	const leerJsonParametro = (nombre, valorPorDefecto) => {
		try {
			const valor = new URLSearchParams(window.location.search).get(nombre);
			return valor ? JSON.parse(valor) : valorPorDefecto;
		} catch {
			return valorPorDefecto;
		}
	};

	const leerEstadoGuardado = () => {
		try {
			const estado = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
			return estado && typeof estado === "object" ? estado : null;
		} catch {
			return null;
		}
	};

	const readIntegrantes = () => {
		const estado = leerEstadoGuardado();
		const postulanteParametro = leerJsonParametro("postulante", null);
		const integrantesParametro = leerJsonParametro("integrantes", []);
		const postulante = postulanteParametro || estado?.postulante || null;
		const integrantes = Array.isArray(integrantesParametro) && integrantesParametro.length
			? integrantesParametro
			: (Array.isArray(estado?.integrantes) ? estado.integrantes : []);
		const familiares = Array.isArray(integrantes) ? integrantes : [];
		const grupo = postulante && !familiares.some((integrante) => integrante?.rut === postulante.rut)
			? [postulante, ...familiares]
			: familiares;
		return grupo.length > 0 ? grupo : [{ numero: 1 }];
	};

	const nombreCompleto = (integrante, indice) => {
		const nombre = [integrante.nombre, integrante.apellidoPaterno, integrante.apellidoMaterno]
			.filter(Boolean)
			.join(" ")
			.trim();
		return nombre || `Integrante ${indice + 1}`;
	};

	const createIncomeInput = (memberIndex, year, category) => {
		const input = document.createElement("input");
		input.type = "text";
		input.inputMode = "numeric";
		input.className = "form-control currency-input";
		input.dataset.member = memberIndex;
		input.dataset.year = year;
		input.dataset.category = category;
		input.setAttribute("aria-label", `${category} ${year}`);
		input.placeholder = "$0";
		input.addEventListener("input", () => {
			input.value = input.value.replace(/[^0-9]/g, "");
			actualizarTotales();
			if (hasSubmitted) validarIngreso(input);
		});
		return input;
	};

	const createIncomeRow = (integrante, memberIndex, year) => {
		const row = document.createElement("tr");
		const personCell = document.createElement("th");
		personCell.scope = "row";
		personCell.className = "person-cell";
		personCell.textContent = nombreCompleto(integrante, memberIndex);
		row.append(personCell);

		const yearCell = document.createElement("td");
		yearCell.textContent = year;
		row.append(yearCell);

		incomeCategories.forEach((category) => {
			const cell = document.createElement("td");
			cell.append(createIncomeInput(memberIndex, year, category));
			row.append(cell);
		});

		const totalCell = document.createElement("td");
		totalCell.className = "total-cell";
		totalCell.dataset.member = memberIndex;
		totalCell.dataset.year = year;
		totalCell.textContent = "$0";
		row.append(totalCell);
		return row;
	};

	const getInputAmount = (input) => {
		const value = input.value.trim();
		return value === "" ? 0 : Number(value);
	};

	const totalRow = (memberIndex, year) => Array.from(form.querySelectorAll(`input[data-member="${memberIndex}"][data-year="${year}"]`)).reduce((total, input) => total + getInputAmount(input), 0);

	const actualizarTotales = () => {

    form.querySelectorAll(".total-cell[data-member]").forEach((cell) => {
        cell.textContent = formatCurrency(
            totalRow(cell.dataset.member, cell.dataset.year)
        );
    });

    const total2025 = Array.from(
        form.querySelectorAll('input[data-year="2025"]')
    ).reduce(
        (total, input) => total + getInputAmount(input),
        0
    );

    const total2026 = Array.from(
        form.querySelectorAll('input[data-year="2026"]')
    ).reduce(
        (total, input) => total + getInputAmount(input),
        0
    );

    const elemento2025 = document.getElementById("total-2025");
    const elemento2026 = document.getElementById("total-2026");

    if (elemento2025) {
        elemento2025.textContent = formatCurrency(total2025);
    }

    if (elemento2026) {
        elemento2026.textContent = formatCurrency(total2026);
    }

};

	const validarIngreso = (input) => {
		const amount = input.value.trim();
		const feedbackId = `${input.dataset.member}-${input.dataset.year}-${input.dataset.category}-error`;
		let feedback = input.parentElement.querySelector(".invalid-feedback");
		if (!amount) {
			input.classList.remove("is-invalid", "is-valid");
			input.removeAttribute("aria-invalid");
			feedback?.remove();
			return true;
		}
		if (!/^\d+$/.test(amount)) {
			input.classList.remove("is-valid");
			input.classList.add("is-invalid");
			input.setAttribute("aria-invalid", "true");
			if (!feedback) {
				feedback = document.createElement("div");
				feedback.className = "invalid-feedback";
				feedback.id = feedbackId;
				input.insertAdjacentElement("afterend", feedback);
			}
			input.setAttribute("aria-describedby", feedbackId);
			feedback.textContent = "Ingresa un monto igual o mayor que $0.";
			return false;
		}
		input.classList.remove("is-invalid");
		input.classList.add("is-valid");
		input.removeAttribute("aria-invalid");
		feedback?.remove();
		input.removeAttribute("aria-describedby");
		return true;
	};

	const validarFormulario = () => {
		const invalidos = [];
		form.querySelectorAll(".currency-input").forEach((input) => {
			if (!validarIngreso(input)) invalidos.push(input);
		});
		return invalidos;
	};

	const enfocarPrimerError = (invalidos) => {
		if (invalidos.length === 0) return;
		invalidos[0].scrollIntoView({ behavior: "smooth", block: "center" });
		invalidos[0].focus({ preventScroll: true });
	};

	const crearDatosComprobante = () => {
		const integrantes = readIntegrantes();
		const postulante = leerJsonParametro("postulante", null) || leerEstadoGuardado()?.postulante || integrantes[0];
		const ingresos = Array.from(form.querySelectorAll(".currency-input"), (input) => ({
			member: Number(input.dataset.member),
			year: Number(input.dataset.year),
			category: input.dataset.category,
			value: input.value
		}));
		return { postulante, integrantes, ingresos };
	};

	const integrantes = readIntegrantes();
	integrantes.forEach((integrante, indice) => {
		[2025, 2026].forEach((year) => incomeBody.append(createIncomeRow(integrante, indice, year)));
	});

	const datosPrevios = leerJsonParametro("comprobante", null);
	if (datosPrevios && Array.isArray(datosPrevios.ingresos)) {
		form.querySelectorAll(".currency-input").forEach((input) => {
			const ingreso = datosPrevios.ingresos.find((item) => item.member === Number(input.dataset.member) && item.year === Number(input.dataset.year) && item.category === input.dataset.category);
			if (ingreso) input.value = ingreso.value || "";
		});
	}
	actualizarTotales();

	form.addEventListener("submit", (event) => {
    event.preventDefault();
    hasSubmitted = true;

    const invalidos = validarFormulario();

    if (invalidos.length === 0) {
        const datosComprobante = crearDatosComprobante();

        console.log("DATOS QUE ENVÍA PASO 3:", datosComprobante);

        // Guardar también en sessionStorage
        sessionStorage.setItem(
            "simulador_fuas_comprobante",
            JSON.stringify(datosComprobante)
        );

        console.log(
            "COMPROBANTE GUARDADO:",
            sessionStorage.getItem("simulador_fuas_comprobante")
        );


// Enviar el comprobante al Paso 4 mediante la URL
const parametros = new URLSearchParams({
    comprobante: JSON.stringify(datosComprobante)
});

console.log(
    "URL QUE ENVÍA PASO 3:",
    `paso4.html?${parametros.toString()}`
);

window.location.href = `paso4.html?${parametros.toString()}`;

    } else {
        enfocarPrimerError(invalidos);
    }
});
});