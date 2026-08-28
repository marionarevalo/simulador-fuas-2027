document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("formulario-paso-2");
	const integrantesContainer = document.getElementById("integrantes-container");
	const agregarButton = document.getElementById("agregar-integrante");
	const activityOptions = [
		"Estudiante",
		"Trabajador/a",
		"Estudiante y trabajador/a",
		"Dueño/a de casa",
		"Otra",
		"Trabajador dependiente del sector público",
		"Trabajador dependiente del sector privado",
		"Trabajador independiente"
	];
	const relationshipOptions = [
		"Postulante",
		"Padre",
		"Madre",
		"Cónyuge",
		"Conviviente",
		"Hijo/a",
		"Hermano/a",
		"Abuelo/a",
		"Otro familiar",
		"No familiar"
	];
	let nextMemberId = 1;
	let hasSubmitted = false;

	const formatearRut = (rut) => {
		const caracteres = rut.replace(/[^0-9kK]/g, "").toUpperCase();
		if (caracteres.length <= 8) return caracteres.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		const cuerpo = caracteres.slice(0, -1);
		const digitoVerificador = caracteres.slice(-1);
		return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${digitoVerificador}`;
	};

	const leerPostulante = () => {
		try {
			const postulante = JSON.parse(new URLSearchParams(window.location.search).get("postulante") || "null");
			return postulante && typeof postulante === "object" ? postulante : null;
		} catch {
			return null;
		}
	};

	const leerIntegrantes = () => {
		try {
			const integrantes = JSON.parse(new URLSearchParams(window.location.search).get("integrantes") || "[]");
			const postulante = leerPostulante();
			return Array.isArray(integrantes) ? integrantes.filter((integrante) => !postulante || integrante.rut !== postulante.rut) : [];
		} catch {
			return [];
		}
	};

	const createField = (memberId, field) => {
		const wrapper = document.createElement("div");
		wrapper.className = field.column;

		const label = document.createElement("label");
		label.className = "form-label";
		label.htmlFor = `integrante-${memberId}-${field.id}`;
		label.textContent = field.label;
		wrapper.append(label);

		const control = field.type === "select" ? document.createElement("select") : document.createElement("input");
		control.className = field.type === "select" ? "form-select" : "form-control";
		control.id = `integrante-${memberId}-${field.id}`;
		control.name = `integrantes[${memberId}][${field.id}]`;
		control.dataset.field = field.id;
		control.dataset.required = "true";
		if (field.type !== "select") control.type = field.type;
		if (field.id === "rut") {
			control.addEventListener("input", () => {
				control.value = formatearRut(control.value);
			});
		}

		if (field.type === "select") {
			control.append(new Option("Seleccione una opción", ""));
			field.options.forEach((option) => control.append(new Option(option, option)));
		}

		wrapper.append(control);
		return wrapper;
	};

	const createMemberCard = (memberId) => {
		const card = document.createElement("article");
		card.className = "card member-card shadow-sm mb-4";
		card.dataset.memberId = memberId;
		card.setAttribute("aria-labelledby", `integrante-${memberId}-titulo`);

		const body = document.createElement("div");
		body.className = "card-body p-4";

		const header = document.createElement("div");
		header.className = "d-flex align-items-center justify-content-between gap-3 mb-4";
		const title = document.createElement("h4");
		title.className = "h5 section-heading fw-bold mb-0";
		title.id = `integrante-${memberId}-titulo`;
		title.textContent = `Integrante ${memberId}`;
		const removeButton = document.createElement("button");
		removeButton.type = "button";
		removeButton.className = "btn btn-outline-danger btn-sm";
		removeButton.textContent = "Eliminar integrante";
		removeButton.addEventListener("click", () => {
			card.remove();
			renumerarIntegrantes();
		});
		header.append(title, removeButton);
		body.append(header);

		const fields = [
			{ id: "nombre", label: "Nombre", type: "text", column: "col-md-4" },
			{ id: "apellido-paterno", label: "Apellido paterno", type: "text", column: "col-md-4" },
			{ id: "apellido-materno", label: "Apellido materno", type: "text", column: "col-md-4" },
			{ id: "rut", label: "RUT", type: "text", column: "col-md-4" },
			{ id: "relacion", label: "Relación o parentesco", type: "select", options: relationshipOptions, column: "col-md-4" },
			{ id: "fecha-nacimiento", label: "Fecha de nacimiento", type: "date", column: "col-md-4" },
			{ id: "actividad", label: "Actividad", type: "select", options: activityOptions, column: "col-md-6" }
		];
		const fieldsRow = document.createElement("div");
		fieldsRow.className = "row g-4";
		fields.forEach((field) => fieldsRow.append(createField(memberId, field)));
		body.append(fieldsRow);
		card.append(body);
		return card;
	};

	const getFeedback = (control) => {
		let feedback = control.parentElement.querySelector(".invalid-feedback");
		if (!feedback) {
			feedback = document.createElement("div");
			feedback.className = "invalid-feedback";
			feedback.id = `${control.id}-error`;
			control.insertAdjacentElement("afterend", feedback);
		}
		control.setAttribute("aria-describedby", feedback.id);
		return feedback;
	};

	const esRutValido = (rut) => {
		const normalizado = rut.replace(/[.\-\s]/g, "").toUpperCase();
		if (!/^\d{7,8}[0-9K]$/.test(normalizado)) return false;
		const cuerpo = normalizado.slice(0, -1);
		const digitoIngresado = normalizado.slice(-1);
		let suma = 0;
		let multiplicador = 2;
		for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
			suma += Number(cuerpo[indice]) * multiplicador;
			multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
		}
		const resto = 11 - (suma % 11);
		const digitoEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
		return digitoIngresado === digitoEsperado;
	};

	const esFechaValida = (fecha) => {
		if (!fecha) return false;
		const fechaIngresada = new Date(`${fecha}T00:00:00`);
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);
		return !Number.isNaN(fechaIngresada.getTime()) && fechaIngresada <= hoy;
	};

	const obtenerError = (control) => {
		const valor = control.value.trim();
		if (!valor) return "Este campo es obligatorio.";
		if (control.dataset.field === "rut" && !esRutValido(valor)) return "Ingrese un RUT válido.";
		if (control.dataset.field === "fecha-nacimiento" && !esFechaValida(valor)) return "Ingrese una fecha válida y no futura.";
		return "";
	};

	const limpiarEstado = (control) => {
		control.classList.remove("is-valid", "is-invalid");
		control.removeAttribute("aria-invalid");
		const feedback = control.parentElement.querySelector(".invalid-feedback");
		if (feedback) {
			control.removeAttribute("aria-describedby");
			feedback.remove();
		}
	};

	const validarCampo = (control) => {
		const error = obtenerError(control);
		if (error) {
			control.classList.remove("is-valid");
			control.classList.add("is-invalid");
			control.setAttribute("aria-invalid", "true");
			getFeedback(control).textContent = error;
			return false;
		}
		control.classList.remove("is-invalid");
		control.classList.add("is-valid");
		control.removeAttribute("aria-invalid");
		const feedback = control.parentElement.querySelector(".invalid-feedback");
		if (feedback) {
			control.removeAttribute("aria-describedby");
			feedback.remove();
		}
		return true;
	};

	const validarFormulario = () => Array.from(form.querySelectorAll("input, select")).filter((control) => !validarCampo(control));

	const enfocarPrimerError = (invalidos) => {
		if (invalidos.length === 0) return;
		const primerError = invalidos[0];
		primerError.scrollIntoView({ behavior: "smooth", block: "center" });
		primerError.focus({ preventScroll: true });
	};

	const renumerarIntegrantes = () => {
		const integrantes = integrantesContainer.querySelectorAll("[data-member-id]");
		integrantes.forEach((integrante, indice) => {
			const numero = indice + 1;
			const titulo = integrante.querySelector("h4");
			if (titulo) {
				titulo.textContent = `Integrante ${numero}`;
			}
		});
	};

	const agregarIntegrante = () => {
		integrantesContainer.append(createMemberCard(nextMemberId));
		nextMemberId += 1;
		renumerarIntegrantes();
	};

	const precargarPostulante = () => {
		const postulante = leerPostulante();
		const card = integrantesContainer.querySelector("[data-member-id]");
		if (!postulante || !card) return;
		const fields = {
			nombre: postulante.nombre,
			"apellido-paterno": postulante.apellidoPaterno,
			"apellido-materno": postulante.apellidoMaterno,
			rut: postulante.rut,
			relacion: "Postulante",
			"fecha-nacimiento": postulante.fechaNacimiento,
			actividad: postulante.actividad
		};
		Object.entries(fields).forEach(([field, value]) => {
			const control = card.querySelector(`[data-field="${field}"]`);
			if (control) control.value = value || "";
		});
	};

	const obtenerPostulante = () => leerPostulante() || obtenerIntegrantesParaPaso3()[0];

	const obtenerIntegrantesDesdeTarjetas = () => Array.from(integrantesContainer.querySelectorAll("[data-member-id]"), (card, indice) => ({
		nombre: card.querySelector('[data-field="nombre"]').value.trim(),
		apellidoPaterno: card.querySelector('[data-field="apellido-paterno"]').value.trim(),
		apellidoMaterno: card.querySelector('[data-field="apellido-materno"]').value.trim(),
		rut: card.querySelector('[data-field="rut"]').value.trim(),
		relacion: card.querySelector('[data-field="relacion"]').value,
		fechaNacimiento: card.querySelector('[data-field="fecha-nacimiento"]').value,
		actividad: card.querySelector('[data-field="actividad"]').value,
		numero: indice + 1
	}));

	const obtenerIntegrantesParaPaso3 = () => {
		return obtenerIntegrantesDesdeTarjetas();
	};

	agregarButton.addEventListener("click", agregarIntegrante);
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		hasSubmitted = true;
		const invalidos = validarFormulario();
		if (invalidos.length === 0) {
			const parametros = new URLSearchParams({ postulante: JSON.stringify(obtenerPostulante()), integrantes: JSON.stringify(obtenerIntegrantesParaPaso3()) });
			window.location.href = `paso3.html?${parametros.toString()}`;
		}
		else enfocarPrimerError(invalidos);
	});

	form.addEventListener("input", (event) => {
		if (hasSubmitted || event.target.classList.contains("is-invalid")) validarCampo(event.target);
	});
	form.addEventListener("change", (event) => {
		if (hasSubmitted || event.target.classList.contains("is-invalid")) validarCampo(event.target);
	});

	agregarIntegrante();
	precargarPostulante();
	leerIntegrantes().forEach((integrante) => {
		integrantesContainer.append(createMemberCard(nextMemberId));
		nextMemberId += 1;
		const card = integrantesContainer.lastElementChild;
		Object.entries(integrante).forEach(([field, value]) => {
			const control = card.querySelector(`[data-field="${field}"]`);
			if (control) control.value = value || "";
		});
	});
	renumerarIntegrantes();
});
