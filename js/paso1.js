document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("formulario-paso-1");
	const rutInput = document.getElementById("rut");
	const regionSelect = document.getElementById("region");
	const comunaSelect = document.getElementById("comuna");
	const catalogUrl = "assets/json/regiones-comunas.json";
	const requiredFields = ["rut", "nombres", "apellido-paterno", "correo", "fecha-nacimiento", "estado-civil", "nacionalidad", "actividad", "nivel-estudios", "direccion", "region", "comuna", "nombre-establecimiento"];
	let hasSubmitted = false;

	const actualizarDescripciones = (control, feedbackId, quitarFeedback = false) => {
		const ids = (control.getAttribute("aria-describedby") || "")
			.split(" ")
			.filter((id) => id && (!quitarFeedback || id !== feedbackId));

		if (feedbackId && !quitarFeedback) {
			ids.push(feedbackId);
		}

		if (ids.length > 0) {
			control.setAttribute("aria-describedby", ids.join(" "));
		} else {
			control.removeAttribute("aria-describedby");
		}
	};

	const getFeedback = (control) => {
		let feedback = control.parentElement.querySelector(".invalid-feedback");
		if (!feedback) {
			feedback = document.createElement("div");
			feedback.className = "invalid-feedback";
			feedback.id = `${control.id}-error`;
			control.insertAdjacentElement("afterend", feedback);
		}
		actualizarDescripciones(control, feedback.id);
		return feedback;
	};

	const resetComunas = () => {
		comunaSelect.replaceChildren(new Option("Seleccione una comuna", ""));
	};

	const cargarComunas = (comunas) => {
		resetComunas();
		comunas.forEach((comuna) => comunaSelect.add(new Option(comuna, comuna)));
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

	const formatearRut = (rut) => {
		const caracteres = rut.replace(/[^0-9kK]/g, "").toUpperCase();
		if (caracteres.length <= 8) {
			return caracteres.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		}

		const cuerpo = caracteres.slice(0, -1).replace(/\D/g, "");
		const digitoVerificador = caracteres.slice(-1);
		const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		return `${cuerpoFormateado}-${digitoVerificador}`;
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
		const esObligatorio = requiredFields.includes(control.id) || control.tagName === "SELECT";
		if (esObligatorio && (!valor || (control.tagName === "SELECT" && control.selectedIndex === 0))) return "Este campo es obligatorio.";
		if (control.id === "rut" && !esRutValido(valor)) return "Ingrese un RUT válido.";
		if (control.id === "correo" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return "Ingrese un correo electrónico válido.";
		if (control.id === "fecha-nacimiento" && !esFechaValida(valor)) return "Ingrese una fecha de nacimiento válida y no futura.";
		return "";
	};

	const limpiarEstado = (control) => {
		control.classList.remove("is-valid", "is-invalid");
		control.removeAttribute("aria-invalid");
		const feedback = control.parentElement.querySelector(".invalid-feedback");
		if (feedback) {
			actualizarDescripciones(control, feedback.id, true);
			feedback.remove();
		}
	};

	const validarCampo = (control) => {
		const valor = control.value.trim();
		if (control.tagName !== "SELECT" && !requiredFields.includes(control.id) && !valor) {
			limpiarEstado(control);
			return true;
		}
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
			actualizarDescripciones(control, feedback.id, true);
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

	const obtenerPostulanteParaPaso2 = () => ({
		nombre: document.getElementById("nombres").value.trim(),
		apellidoPaterno: document.getElementById("apellido-paterno").value.trim(),
		apellidoMaterno: document.getElementById("apellido-materno").value.trim(),
		rut: document.getElementById("rut").value.trim(),
		relacion: "Postulante",
		fechaNacimiento: document.getElementById("fecha-nacimiento").value,
		actividad: document.getElementById("actividad").value,
		nacionalidad: document.getElementById("nacionalidad").value,
		correo: document.getElementById("correo").value.trim(),
		region: document.getElementById("region").value,
		comuna: document.getElementById("comuna").value,
		interesAcademico: document.getElementById("carrera-interes").value.trim(),
		numero: 1
	});

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		hasSubmitted = true;
		const invalidos = validarFormulario();
		if (invalidos.length === 0) {
			const postulante = obtenerPostulanteParaPaso2();
			const parametros = new URLSearchParams({ postulante: JSON.stringify(postulante), integrantes: JSON.stringify([postulante]) });
			window.location.href = `paso2.html?${parametros.toString()}`;
		} else {
			enfocarPrimerError(invalidos);
		}
	});

	rutInput.addEventListener("input", () => {
		rutInput.value = formatearRut(rutInput.value);
	});

	form.querySelectorAll("input, select").forEach((control) => {
		const evento = control.tagName === "SELECT" ? "change" : "input";
		control.addEventListener(evento, () => {
			if (hasSubmitted || control.classList.contains("is-invalid")) validarCampo(control);
		});
	});

	// El catálogo queda separado para reutilizar esta carga en los siguientes pasos.
	fetch(catalogUrl)
		.then((response) => {
			if (!response.ok) throw new Error(`No se pudo cargar el catálogo: ${response.status}`);
			return response.json();
		})
		.then((regiones) => {
			regionSelect.addEventListener("change", () => {
				cargarComunas(regiones[regionSelect.value] || []);
				if (hasSubmitted) validarCampo(comunaSelect);
			});
		})
		.catch(() => {
			resetComunas();
			regionSelect.addEventListener("change", resetComunas);
		});
});
