// Data-driven content for /especialidad/[slug] (src/app/especialidad/[slug]/page.tsx).
// Unlike the other landing pages (home, /marketing, /zen — one hand-written
// HTML string each), this route renders ONE shared template from a content
// object keyed by specialty slug — see buildEspecialidadBodyHtml below.
// Slugs match src/lib/specialties.ts's ACCOUNT_SPECIALTIES so a future
// per-account specialty value can link straight to its landing page; only
// the 3 specialties below have dedicated copy today, not the full catalog.

export type SpecialtySlug = "odontologia" | "dermatologia" | "psicologia";

export const SPECIALTY_SLUGS: SpecialtySlug[] = ["odontologia", "dermatologia", "psicologia"];

interface RoiItem {
  n: string;
  label: string;
  valor: string;
  color: string;
}

interface Fuga {
  cifra: string;
  cifraLabel: string;
  titulo: string;
  texto: string;
  fix: string;
  numFg: string;
}

interface PanelRow {
  n: string;
  izq: string;
  meta: string;
  estado: string;
  estBg: string;
  estFg: string;
}

interface Panel {
  ini: string;
  titulo: string;
  sub: string;
  chip: string;
  chipBg: string;
  chipFg: string;
  filas: PanelRow[];
  pieLabel: string;
  pie: string;
  cta: string;
}

interface ProdPunto {
  n: string;
  titulo: string;
  texto: string;
}

interface Chat {
  patient1: string;
  reply1: string;
  patient2: string;
  reply2: string;
}

interface Testimonio {
  cifra: string;
  cifraLabel: string;
  quote: string;
  ini: string;
  nombre: string;
  meta: string;
}

interface Faq {
  p: string;
  r: string;
}

export interface SpecialtyData {
  tag: string;
  badge: string;
  h1: string;
  sub: string;
  roi: RoiItem[];
  recupera: string;
  multiplo: string;
  supuestos: string;
  fugasTitulo: string;
  fugasSub: string;
  fugas: Fuga[];
  usaCaptura: boolean;
  usaPanel: boolean;
  panel?: Panel;
  prodTitulo: string;
  prodSub: string;
  prodPuntos: ProdPunto[];
  zenTitulo: string;
  zenSub: string;
  zenHora: string;
  chat: Chat;
  zenResultado: string;
  planesTitulo: string;
  testimonio: Testimonio;
  faq: Faq[];
  cierre: string;
}

export const SPECIALTY_CONTENT: Record<SpecialtySlug, SpecialtyData> = {
  odontologia: {
    tag: "Odontología",
    badge: "CONSULTORIOS DENTALES EN 7 PAÍSES",
    h1: "El tratamiento aprobado que se quedó a medias.",
    sub: "Zentro Med confirma cada cita por WhatsApp, avisa cuándo toca la siguiente fase del tratamiento y te dice qué presupuestos siguen esperando respuesta.",
    roi: [
      { n: "01", label: "Presupuestos sin respuesta al mes", valor: "4", color: "#0C1B14" },
      { n: "02", label: "Valor promedio del presupuesto", valor: "$7,900", color: "#0C1B14" },
      { n: "03", label: "Detenido en la mesa hoy", valor: "$31,600", color: "#B3382C" },
      { n: "04", label: "Cierra con seguimiento", valor: "1 de 3", color: "#0E7C4A" },
    ],
    recupera: "$10,500",
    multiplo: "13×",
    supuestos: "SUPUESTOS: 4 PRESUPUESTOS SIN RESPUESTA AL MES · $7,900 PROMEDIO · UN TERCIO CIERRA CUANDO ALGUIEN DA SEGUIMIENTO.",
    fugasTitulo: "Tres fugas propias de un consultorio dental",
    fugasSub: "En odontología el dinero no se pierde en la primera consulta: se pierde entre la valoración y la segunda fase del tratamiento.",
    fugas: [
      {
        cifra: "1 de 5",
        cifraLabel: "PACIENTES CON CITA NO SE PRESENTA",
        titulo: "La silla vacía de las once",
        texto: "Una hora de sillón perdida no se recupera, y confirmar uno por uno consume la mañana de recepción hasta que se deja de hacer.",
        fix: "Confirmación por WhatsApp 24 horas antes, en todos los planes.",
        numFg: "#B3382C",
      },
      {
        cifra: "4",
        cifraLabel: "PRESUPUESTOS ESPERANDO RESPUESTA",
        titulo: "El plan que se aprobó y ahí quedó",
        texto: "El paciente dijo que lo pensaba y nadie volvió a escribirle. Es el tratamiento más caro del consultorio y el que menos seguimiento tiene.",
        fix: "Lista de presupuestos enviados sin respuesta, con recordatorio automático.",
        numFg: "#B4740A",
      },
      {
        cifra: "90",
        cifraLabel: "DÍAS SIN QUE VUELVA UN PACIENTE",
        titulo: "El control que nadie agendó",
        texto: "Terminó la resina, quedó pendiente la limpieza de los seis meses, y salió del consultorio sin fecha. Se pierde por omisión.",
        fix: "Detecta quién no ha vuelto y le escribe con el tratamiento que le falta.",
        numFg: "#22588F",
      },
    ],
    usaCaptura: true,
    usaPanel: false,
    prodTitulo: "Odontograma, presupuesto y cobro en la misma pantalla",
    prodSub: "Marcas el hallazgo en el diente, se convierte en un concepto del presupuesto y queda ligado a la cita y al cobro. Sin volver a escribir lo mismo tres veces.",
    prodPuntos: [
      { n: "01", titulo: "Del hallazgo al presupuesto en un toque", texto: "Tocas el diente, ves el hallazgo y el costo sugerido, y lo agregas al presupuesto del paciente." },
      { n: "02", titulo: "El presupuesto vive en la ficha", texto: "Cada concepto tiene su estatus: borrador, enviado o aceptado. Sabes qué falta por aprobar y qué falta por hacer." },
      { n: "03", titulo: "Alergias y saldo antes que nada", texto: "Lo primero que ves al abrir la ficha, sin buscar en pestañas. Importa cuando estás por anestesiar." },
      { n: "04", titulo: "Cobras junto al sillón", texto: "Generas un link de pago que sale por WhatsApp. Sin terminal ni salir de la ficha del paciente." },
    ],
    zenTitulo: 'Zen contesta "¿cuánto cuesta una limpieza?" un domingo',
    zenSub: "La pregunta de precio es la más repetida de un consultorio dental y llega casi siempre fuera de horario. Zen responde con tus precios, agenda en la misma conversación, y te pasa el chat en cuanto la pregunta se vuelve clínica.",
    zenHora: "Domingo, 11:04 p.m.",
    chat: {
      patient1: "Hola, ¿tienen cita para limpieza esta semana? ¿Cuánto cuesta?",
      reply1: "Hola Laura. La limpieza dental cuesta $500 y dura 45 minutos. Tengo lunes 8 a las 10:00 a.m. o miércoles 10 a las 4:30 p.m. ¿Cuál te acomoda?",
      patient2: "El lunes a las 10 me sirve",
      reply2: "Listo, quedó el lunes 8 de septiembre a las 10:00 a.m. Te confirmo un día antes por aquí.",
    },
    zenResultado: "Cita creada · lunes 8, 10:00 a.m.",
    planesTitulo: "Un presupuesto cerrado al mes paga el plan doce veces",
    testimonio: {
      cifra: "87%",
      cifraLabel: "MENOS CITAS PERDIDAS EN EL PRIMER MES",
      quote: "Antes perdía al menos 8 citas por semana. Con los recordatorios por WhatsApp ese número bajó a casi cero, y los presupuestos por fin tienen seguimiento.",
      ini: "RM",
      nombre: "Dr. Rodrigo M.",
      meta: "ODONTOLOGÍA · BOGOTÁ",
    },
    faq: [
      { p: "¿Incluye odontograma?", r: "Sí. Cada paciente tiene su odontograma con los hallazgos por diente, y desde ahí puedes agregar conceptos al presupuesto. Es la vista que más se usa dentro del sistema." },
      { p: "¿Es un expediente clínico odontológico?", r: "No, y es una decisión deliberada. Zentro gestiona la parte comercial y operativa: citas, pacientes, odontograma, presupuestos y cobros. Eso lo mantiene válido en varios países sin atarte al formato clínico o fiscal de uno solo. Tus notas de evolución viven en la ficha, pero no sustituyen el expediente que te exija tu normativa local." },
      { p: "¿Puedo manejar tratamientos de ortodoncia con mensualidades?", r: "Sí. El presupuesto se puede dividir en mensualidades con su fecha, y el sistema te dice quién ya pagó y quién debe. Cada control mensual queda ligado al mismo tratamiento, y si un paciente se atrasa, el recordatorio de pago sale solo por WhatsApp sin que tengas que revisar la lista." },
      { p: "¿Sirve si somos tres odontólogos en dos consultorios?", r: "Sí, es justo el plan Clínica. Cada doctor tiene su agenda y su color, cada consultorio su disponibilidad, y la bandeja de WhatsApp es compartida con permisos por persona. Recepción ve todo, cada odontólogo ve lo suyo, y tú ves la ocupación de ambos consultorios en una sola pantalla." },
      { p: "¿Guarda radiografías?", r: "Sí. Puedes subir radiografías, fotos intraorales y archivos a la ficha del paciente, con su fecha, y quedan junto al odontograma y al historial. No es un visor de diagnóstico ni sustituye tu software de imagenología: es para tenerlas a mano cuando abres la ficha en la consulta." },
    ],
    cierre: "Empieza hoy y revisa cuántos presupuestos siguen esperando",
  },

  dermatologia: {
    tag: "Dermatología",
    badge: "CONSULTORIOS DE DERMATOLOGÍA EN 7 PAÍSES",
    h1: "El paciente de estética que solo vino una vez.",
    sub: "Zentro Med confirma cada cita por WhatsApp, avisa cuándo toca la siguiente sesión y recupera a los pacientes que no volvieron después del primer tratamiento.",
    roi: [
      { n: "01", label: "Pacientes que no vuelven al mes", valor: "9", color: "#0C1B14" },
      { n: "02", label: "Valor de una sesión", valor: "$2,400", color: "#0C1B14" },
      { n: "03", label: "Se dejan de facturar", valor: "$21,600", color: "#B3382C" },
      { n: "04", label: "Vuelven con recordatorio", valor: "1 de 3", color: "#0E7C4A" },
    ],
    recupera: "$7,200",
    multiplo: "9×",
    supuestos: "SUPUESTOS: 9 PACIENTES SIN SEGUIMIENTO AL MES · $2,400 POR SESIÓN · UN TERCIO REGRESA CON UN RECORDATORIO OPORTUNO.",
    fugasTitulo: "Tres fugas propias de un consultorio dermatológico",
    fugasSub: "En dermatología casi todo tratamiento es una serie de sesiones. Lo que se pierde no es la primera cita: son las que venían después.",
    fugas: [
      {
        cifra: "1 de 5",
        cifraLabel: "PACIENTES CON CITA NO SE PRESENTA",
        titulo: "La cita que se cayó sin avisar",
        texto: "El espacio queda libre demasiado tarde para ofrecerlo a alguien más, y ese bloque de la agenda no se recupera.",
        fix: "Confirmación por WhatsApp 24 horas antes, en todos los planes.",
        numFg: "#B3382C",
      },
      {
        cifra: "3 de 6",
        cifraLabel: "SESIONES DE UNA SERIE SE COMPLETAN",
        titulo: "La serie que quedó a la mitad",
        texto: "El tratamiento eran seis sesiones y vino a tres. Nadie le avisó que tocaba la cuarta, y el resultado que esperaba nunca llegó.",
        fix: "Recordatorio automático según el intervalo de cada tratamiento.",
        numFg: "#B4740A",
      },
      {
        cifra: "60",
        cifraLabel: "DÍAS SIN QUE VUELVA UN PACIENTE",
        titulo: "El control anual que nadie agendó",
        texto: "El paciente de revisión de lunares o de acné sale sin fecha y desaparece del radar hasta que algo le molesta otra vez.",
        fix: "Detecta quién no ha vuelto en 30, 60 o 90 días y le escribe.",
        numFg: "#22588F",
      },
    ],
    usaCaptura: false,
    usaPanel: true,
    panel: {
      ini: "LG",
      titulo: "Laura Gómez Ruiz",
      sub: "Rejuvenecimiento facial · 6 sesiones",
      chip: "SERIE ACTIVA",
      chipBg: "#E8F5EE",
      chipFg: "#0A5C37",
      filas: [
        { n: "S1", izq: "Primera sesión", meta: "12 jul · pagada", estado: "HECHA", estBg: "#EEF2F0", estFg: "#5B6B62" },
        { n: "S2", izq: "Segunda sesión", meta: "2 ago · pagada", estado: "HECHA", estBg: "#EEF2F0", estFg: "#5B6B62" },
        { n: "S3", izq: "Tercera sesión", meta: "23 ago · pagada", estado: "HECHA", estBg: "#EEF2F0", estFg: "#5B6B62" },
        { n: "S4", izq: "Cuarta sesión", meta: "Tocaba el 13 sep · sin agendar", estado: "ATRASADA", estBg: "#FCEDEA", estFg: "#B3382C" },
        { n: "S5", izq: "Quinta sesión", meta: "Intervalo de 21 días", estado: "PENDIENTE", estBg: "#FDF3E2", estFg: "#7A5406" },
        { n: "S6", izq: "Sexta sesión", meta: "Cierre de la serie", estado: "PENDIENTE", estBg: "#FDF3E2", estFg: "#7A5406" },
      ],
      pieLabel: "FALTA POR FACTURAR DE ESTA SERIE",
      pie: "$7,200 en 3 sesiones",
      cta: "Agendar la cuarta",
    },
    prodTitulo: "Cada paciente con su serie de sesiones y su presupuesto",
    prodSub: "Ves en qué sesión va, cuándo toca la siguiente y qué queda por cobrar. Todo ligado a la misma ficha y a la misma conversación de WhatsApp.",
    prodPuntos: [
      { n: "01", titulo: "La serie completa a la vista", texto: "Sesiones hechas, sesiones pendientes y el intervalo entre cada una, por paciente." },
      { n: "02", titulo: "El presupuesto vive en la ficha", texto: "Cada concepto con su estatus: borrador, enviado o aceptado. Sabes qué falta por aprobar y qué falta por hacer." },
      { n: "03", titulo: "Fotos de evolución en la conversación", texto: "Las imágenes que el paciente manda quedan en su hilo, con fecha, junto al resto de su historial." },
      { n: "04", titulo: "Cobras por link", texto: "Generas el cobro y sale por WhatsApp. Útil cuando el paquete se paga por sesión." },
    ],
    zenTitulo: 'Zen contesta "¿cuánto cuesta una limpieza facial?" un domingo',
    zenSub: "En estética la pregunta de precio llega a cualquier hora y decide si el paciente escribe a otro consultorio. Zen responde con tus precios, agenda en la misma conversación, y te pasa el chat en cuanto la pregunta se vuelve clínica.",
    zenHora: "Domingo, 11:04 p.m.",
    chat: {
      patient1: "Hola, ¿cuánto cuesta una limpieza facial profunda? ¿Tienen esta semana?",
      reply1: "Hola Laura. La limpieza facial profunda cuesta $1,200 y dura 60 minutos. Tengo lunes 8 a las 10:00 a.m. o miércoles 10 a las 4:30 p.m. ¿Cuál te acomoda?",
      patient2: "El lunes a las 10 me sirve",
      reply2: "Listo, quedó el lunes 8 de septiembre a las 10:00 a.m. Te confirmo un día antes por aquí.",
    },
    zenResultado: "Cita creada · lunes 8, 10:00 a.m.",
    planesTitulo: "Tres sesiones recuperadas al mes pagan el plan",
    testimonio: {
      cifra: "+35%",
      cifraLabel: "PACIENTES QUE VOLVIERON EN EL MES 2",
      quote: "La reactivación automática me devolvió pacientes que llevaban meses sin volver. No le escribí a nadie manualmente.",
      ini: "LV",
      nombre: "Dra. Lucía V.",
      meta: "DERMATOLOGÍA · MEDELLÍN",
    },
    faq: [
      { p: "¿Puedo manejar tratamientos por sesiones?", r: "Sí. Cada paciente tiene su presupuesto con los conceptos y su estatus, y las automatizaciones te permiten avisar cuándo toca la siguiente sesión según el intervalo que definas por tratamiento." },
      { p: "¿Es un expediente clínico dermatológico?", r: "No, y es a propósito. Zentro gestiona citas, pacientes, series de sesiones, presupuestos y cobros. Eso lo mantiene válido en varias especialidades y países sin atarte al formato clínico de uno solo. Tus notas viven en la ficha, pero no sustituyen el expediente que te exija tu normativa local." },
      { p: "¿Dónde quedan las fotos de evolución?", r: "En el hilo de WhatsApp del paciente y en su ficha, con la fecha de cada una. Cuando el paciente manda una foto entre sesiones, queda en su conversación y no se pierde en tu galería personal. Al abrir la ficha ves la secuencia completa junto a las sesiones que ya se hicieron." },
      { p: "¿Sirve para medicina estética además de dermatología clínica?", r: "Sí, y de hecho es donde más se usa. Los tratamientos por paquete, el cobro por sesión y el recordatorio del siguiente procedimiento son exactamente el patrón de la medicina estética. Configuras tus tratamientos con su precio, su duración y el intervalo entre sesiones." },
      { p: "¿Puedo tener precios distintos por sede?", r: "Sí, en el plan Clínica. Cada sede puede tener su propio catálogo de precios, sus horarios y sus doctores, y los reportes se pueden ver por sede o consolidados. La página de reserva también puede ser distinta por consultorio." },
    ],
    cierre: "Empieza hoy y revisa quién dejó su tratamiento a medias",
  },

  psicologia: {
    tag: "Psicología",
    badge: "CONSULTAS DE PSICOLOGÍA EN 7 PAÍSES",
    h1: "El paciente que faltó dos veces y no volvió.",
    sub: "Zentro Med confirma cada sesión por WhatsApp, mantiene la constancia de tu agenda semanal y te avisa cuándo alguien lleva dos ausencias seguidas.",
    roi: [
      { n: "01", label: "Sesiones que se caen al mes", valor: "10", color: "#0C1B14" },
      { n: "02", label: "Valor de una sesión", valor: "$900", color: "#0C1B14" },
      { n: "03", label: "Se dejan de facturar", valor: "$9,000", color: "#B3382C" },
      { n: "04", label: "Con recordatorios", valor: "54% menos", color: "#0E7C4A" },
    ],
    recupera: "$4,860",
    multiplo: "6×",
    supuestos: "SUPUESTOS: 10 SESIONES PERDIDAS AL MES · $900 POR SESIÓN · 54% MENOS AUSENCIAS CON RECORDATORIOS.",
    fugasTitulo: "Tres fugas propias de una consulta de psicología",
    fugasSub: "Tu ingreso depende de la constancia semanal. Una ausencia no es solo una hora vacía: casi siempre es el inicio de un abandono.",
    fugas: [
      {
        cifra: "1 de 5",
        cifraLabel: "SESIONES AGENDADAS NO SE CUMPLE",
        titulo: "La hora que quedó vacía",
        texto: "Con agenda de horas fijas, un hueco de última hora no se puede ofrecer a nadie más. Es ingreso perdido de forma definitiva.",
        fix: "Confirmación por WhatsApp 24 horas antes, en todos los planes.",
        numFg: "#B3382C",
      },
      {
        cifra: "2",
        cifraLabel: "AUSENCIAS SEGUIDAS ANTES DE ABANDONAR",
        titulo: "El proceso que se interrumpió",
        texto: "Faltó una semana, luego otra, y para la tercera ya no contestó. El punto de recuperación estaba en la primera ausencia.",
        fix: "Aviso cuando un paciente acumula dos ausencias, para que lo contactes a tiempo.",
        numFg: "#B4740A",
      },
      {
        cifra: "3",
        cifraLabel: "LUGARES DISTINTOS CON LA MISMA INFO",
        titulo: "La agenda en el teléfono personal",
        texto: "Las citas por WhatsApp, los pagos en una hoja y el seguimiento en un cuaderno. Sin un lugar único, cobrar y agendar consume tu tiempo entre sesiones.",
        fix: "Agenda, pagos y conversación en un solo lugar, con tu número de trabajo aparte.",
        numFg: "#22588F",
      },
    ],
    usaCaptura: false,
    usaPanel: true,
    panel: {
      ini: "SEM",
      titulo: "Tu semana",
      sub: "Lunes 7 al viernes 11 de septiembre",
      chip: "18 DE 20 HORAS",
      chipBg: "#E8F5EE",
      chipFg: "#0A5C37",
      filas: [
        { n: "LUN", izq: "Laura G. · 10:00", meta: "Sesión 14 · recurrente", estado: "CONFIRMADA", estBg: "#E9F0FA", estFg: "#22588F" },
        { n: "LUN", izq: "Andrés M. · 17:00", meta: "Sesión 6 · recurrente", estado: "CONFIRMADA", estBg: "#E9F0FA", estFg: "#22588F" },
        { n: "MAR", izq: "Paula R. · 11:00", meta: "Primera sesión", estado: "SIN CONFIRMAR", estBg: "#FDF3E2", estFg: "#7A5406" },
        { n: "MIÉ", izq: "Diego S. · 16:00", meta: "Faltó las 2 últimas semanas", estado: "EN RIESGO", estBg: "#FCEDEA", estFg: "#B3382C" },
        { n: "JUE", izq: "Laura G. · 10:00", meta: "Sesión 15 · recurrente", estado: "CONFIRMADA", estBg: "#E9F0FA", estFg: "#22588F" },
        { n: "VIE", izq: "Hora libre · 12:00", meta: "Sin asignar esta semana", estado: "LIBRE", estBg: "#EEF2F0", estFg: "#5B6B62" },
      ],
      pieLabel: "REQUIERE TU ATENCIÓN",
      pie: "Diego S. lleva 2 ausencias",
      cta: "Escribirle ahora",
    },
    prodTitulo: "Tu agenda semanal, los pagos y los mensajes en un solo lugar",
    prodSub: "Sesiones recurrentes, quién debe, quién faltó y con quién tienes que hablar hoy. Sin mezclar tu WhatsApp personal con el de la consulta.",
    prodPuntos: [
      { n: "01", titulo: "Sesiones recurrentes sin volver a agendarlas", texto: "Defines el horario semanal de cada paciente una vez y la agenda se llena sola." },
      { n: "02", titulo: "Un número de trabajo separado", texto: "La conversación de la consulta vive en la bandeja del sistema, no en tu teléfono personal." },
      { n: "03", titulo: "Notas de seguimiento por paciente", texto: "Tus apuntes de proceso junto al historial de sesiones y pagos. No es expediente clínico." },
      { n: "04", titulo: "Cobros por link, sesión por sesión", texto: "Generas el cobro y sale por WhatsApp. Útil para paquetes y para sesiones en línea." },
    ],
    zenTitulo: 'Zen contesta "¿tienes espacio los martes?" un domingo',
    zenSub: "Quien busca terapia suele escribir de noche y no vuelve a intentarlo si nadie contesta. Zen responde con tus horarios y tu tarifa, agenda la primera sesión, y te pasa el chat en cuanto el mensaje deja de ser logístico.",
    zenHora: "Domingo, 11:04 p.m.",
    chat: {
      patient1: "Hola, quería preguntar si tienes espacio los martes y cuánto cuesta la sesión.",
      reply1: "Hola Laura. La sesión dura 50 minutos y cuesta $900. Tengo martes 9 a las 10:00 a.m. o martes 9 a las 5:00 p.m. ¿Cuál te acomoda?",
      patient2: "El de las 10 me sirve",
      reply2: "Listo, quedó el martes 9 de septiembre a las 10:00 a.m. Te confirmo un día antes por aquí.",
    },
    zenResultado: "Primera sesión creada · martes 9, 10:00 a.m.",
    planesTitulo: "Seis sesiones recuperadas al mes pagan el plan",
    testimonio: {
      cifra: "54%",
      cifraLabel: "MENOS SESIONES PERDIDAS",
      quote: "Los recordatorios cambiaron mi semana. Antes tenía dos o tres huecos y ahora casi ninguno, y dejé de usar mi teléfono personal para la consulta.",
      ini: "CE",
      nombre: "Ps. Carla E.",
      meta: "PSICOLOGÍA CLÍNICA · CALI",
    },
    faq: [
      { p: "¿Puedo tener sesiones recurrentes semanales?", r: "Sí. Defines el horario fijo de cada paciente y la agenda se genera sola, con su recordatorio 24 horas antes. Si alguien falta, queda registrado y puedes ver quién acumula ausencias." },
      { p: "¿Es un expediente clínico psicológico?", r: "No. Zentro gestiona la agenda, los pagos y la comunicación con tus pacientes. Tus notas de proceso viven en la ficha para que las tengas a mano, pero el sistema no está diseñado como expediente clínico ni sustituye el que te exija tu colegio o tu normativa local." },
      { p: "¿Qué tan confidencial es la información?", r: "Los datos están cifrados en tránsito y en reposo, y el acceso es por usuario: si trabajas solo, nadie más entra. Si compartes consultorio, defines quién ve qué. Nosotros no leemos tus conversaciones ni tus notas, y puedes exportar o eliminar la información de un paciente cuando lo pida." },
      { p: "¿Sirve para sesiones en línea?", r: "Sí. Puedes marcar la sesión como en línea y el enlace de la videollamada se envía con el recordatorio, así que el paciente no tiene que buscarlo. El cobro también sale por link, que es lo más práctico cuando no hay nadie en recepción." },
      { p: "¿Puedo separar mi WhatsApp personal del de la consulta?", r: "Sí, y es una de las razones por las que la mayoría empieza. La consulta usa su propio número de WhatsApp Business, con su bandeja dentro del sistema. Tu teléfono personal deja de ser la agenda: si un paciente escribe fuera de horario, el mensaje llega a la bandeja y no a tu vida." },
    ],
    cierre: "Empieza hoy y cuenta tus sesiones perdidas en 30 días",
  },
};

const SHARED_PLANES = [
  {
    perfil: "TRABAJAS SOLO O CON UNA PERSONA MÁS",
    nombre: "Esencial",
    precio: "$39",
    usuarios: "1 usuario · +$25 por usuario extra",
    badge: null as string | null,
    dark: false,
    featured: false,
    items: [
      "Bandeja de WhatsApp Cloud API",
      "Agenda y página pública de citas",
      "Recordatorio automático 24 h antes",
      "Presupuestos y cobros con recibo en PDF",
      "Zen redacta y tú apruebas · 300 al mes",
    ],
  },
  {
    perfil: "TIENES RECEPCIÓN Y QUIERES QUE EL SEGUIMIENTO CORRA SOLO",
    nombre: "Profesional",
    precio: "$79",
    usuarios: "3 usuarios · +$25 por usuario extra",
    badge: "7 de cada 10 eligen este",
    dark: false,
    featured: true,
    items: [
      "Todo lo de Esencial",
      "Zen contestando solo · 2,000 respuestas/mes",
      "Reactivación automática de pacientes",
      "Campañas por WhatsApp",
      "Google Calendar y mini-sitio propio",
    ],
  },
  {
    perfil: "VARIOS ESPECIALISTAS O CONSULTORIOS",
    nombre: "Clínica",
    precio: "$149",
    usuarios: "5 usuarios · +$25 por usuario extra",
    badge: null as string | null,
    dark: true,
    featured: false,
    items: [
      "Todo lo de Profesional",
      "Pacientes activos ilimitados",
      "Zen de alto volumen · 6,000 respuestas/mes",
      "Roles, invitaciones y auditoría",
      "Soporte prioritario y acompañamiento",
    ],
  },
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function checkIcon(): string {
  return `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}

function renderNav(slug: SpecialtySlug, data: SpecialtyData): string {
  const options = SPECIALTY_SLUGS.map((s) => {
    const active = s === slug ? " active" : "";
    return `<a href="/especialidad/${s}" class="esp-switch-opt${active}">${esc(SPECIALTY_CONTENT[s].tag)}</a>`;
  }).join("\n");

  return `
<nav>
  <div class="wrap">
    <div class="nav-i">
      <a href="/" class="logo">
        <img src="/zentro-isotipo.png" alt="" style="height:26px;width:26px;">
        <span class="logo-text">zentro</span>
        <span class="logo-badge">Med</span>
      </a>
      <div class="nav-r">
        <div class="esp-switch" id="espSwitch">
          <button class="esp-switch-btn" onclick="zmToggleEspSwitch(event)">
            ${esc(data.tag)}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="esp-switch-dropdown">
            ${options}
          </div>
        </div>
        <a href="/login" class="nav-login" aria-label="Iniciar sesión">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          <span class="nav-login-text">Iniciar sesión</span>
        </a>
        <a href="/signup" class="btn btn-green btn-sm nav-cta-btn">Empezar gratis →</a>
        <button class="mob-menu-btn" onclick="zmToggleMobMenu()" aria-label="Abrir menú" aria-expanded="false" id="mobMenuBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <div class="mob-menu-panel" id="mobMenuPanel">
    <a href="/" class="mob-menu-link" onclick="zmCloseMobMenu()">Ver todas las especialidades</a>
    <a href="/login" class="mob-menu-link" onclick="zmCloseMobMenu()">Iniciar sesión</a>
    <a href="/signup" class="btn btn-green btn-sm mob-menu-cta" onclick="zmCloseMobMenu()">Empezar gratis →</a>
  </div>
</nav>`;
}

function renderRoi(data: SpecialtyData): string {
  const [c1, c2, c3, c4] = data.roi;
  return `
<section class="solution" style="background:var(--zm-surface);">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// Tu cuenta, con tus números</p>
    </div>
    <div class="reveal roi-card">
      <div class="roi-inner">
        <div class="roi-inputs">
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">${esc(c1.n)}</span><span class="roi-row-label">${esc(c1.label)}</span></span>
            <span class="roi-static-val">${esc(c1.valor)}</span>
          </div>
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">${esc(c2.n)}</span><span class="roi-row-label">${esc(c2.label)}</span></span>
            <span class="roi-static-val">${esc(c2.valor)}</span>
          </div>
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">${esc(c3.n)}</span><span class="roi-row-label">${esc(c3.label)}</span></span>
            <span class="roi-static-val" style="color:${esc(c3.color)};">${esc(c3.valor)}</span>
          </div>
          <div class="roi-static">
            <span class="roi-row-head"><span class="roi-row-num">${esc(c4.n)}</span><span class="roi-row-label">${esc(c4.label)}</span></span>
            <span class="roi-static-val" style="color:${esc(c4.color)};">${esc(c4.valor)}</span>
          </div>
        </div>
        <div class="roi-results">
          <div class="roi-final">
            <div class="roi-final-label">Recuperas al mes</div>
            <div class="roi-final-val">${esc(data.recupera)}</div>
            <span class="roi-final-multiple">${esc(data.multiplo)} el plan Esencial</span>
          </div>
        </div>
      </div>
    </div>
    <p class="roi-assumptions">${esc(data.supuestos)}</p>
  </div>
</section>`;
}

function renderFugas(data: SpecialtyData): string {
  const cards = data.fugas
    .map(
      (f) => `
      <div class="leak-card">
        <div class="leak-num" style="color:${esc(f.numFg)};">${esc(f.cifra)}</div>
        <div class="leak-num-label">${esc(f.cifraLabel)}</div>
        <div class="leak-title">${esc(f.titulo)}</div>
        <div class="leak-text">${esc(f.texto)}</div>
        <div class="leak-fix">
          <span class="leak-fix-label">Cómo se cierra</span>
          <div class="leak-fix-text">${esc(f.fix)}</div>
        </div>
      </div>`,
    )
    .join("\n");

  return `
<section class="problems">
  <div class="wrap">
    <div class="problems-header reveal">
      <p class="section-label">// 01</p>
      <h2 class="section-title">${esc(data.fugasTitulo)}</h2>
      <p class="section-sub">${esc(data.fugasSub)}</p>
    </div>
    <div class="leak-grid reveal-group">${cards}</div>
  </div>
</section>`;
}

function renderCapturaVisual(): string {
  return `
      <div class="solution-visual">
        <p class="sol-tag">// Odontograma</p>
        <p class="sol-title">Ficha del paciente</p>
        <div class="esp-tooth-grid">
          ${Array.from({ length: 16 }, (_, i) => {
            const n = i + 1;
            const cls = n === 6 ? "flag" : n === 12 ? "done" : "";
            return `<div class="esp-tooth ${cls}">${n}</div>`;
          }).join("")}
        </div>
        <div class="esp-budget-row" style="border-top:1px solid rgba(255,255,255,.08);">
          <span class="esp-budget-name">Resina diente 6</span>
          <span class="esp-budget-status" style="background:rgba(245,158,11,.15);color:#fbbf24;">Enviado</span>
        </div>
        <div class="esp-budget-row">
          <span class="esp-budget-name">Limpieza semestral</span>
          <span class="esp-budget-status" style="background:rgba(74,222,90,.15);color:var(--zm-g);">Aceptado</span>
        </div>
      </div>`;
}

function renderPanelVisual(panel: Panel): string {
  const rows = panel.filas
    .map(
      (f) => `
        <div class="esp-panel-row">
          <span class="esp-panel-row-n">${esc(f.n)}</span>
          <div class="esp-panel-row-main">
            <div class="esp-panel-row-izq">${esc(f.izq)}</div>
            <div class="esp-panel-row-meta">${esc(f.meta)}</div>
          </div>
          <span class="esp-panel-row-status" style="background:${esc(f.estBg)};color:${esc(f.estFg)};">${esc(f.estado)}</span>
        </div>`,
    )
    .join("\n");

  return `
      <div class="solution-visual" style="padding:0;overflow:hidden;">
        <div class="esp-panel" style="border:none;border-radius:0;">
          <div class="esp-panel-head">
            <div class="esp-panel-id">
              <div class="esp-panel-avatar">${esc(panel.ini)}</div>
              <div>
                <div class="esp-panel-title">${esc(panel.titulo)}</div>
                <div class="esp-panel-sub">${esc(panel.sub)}</div>
              </div>
            </div>
            <span class="esp-panel-chip" style="background:${esc(panel.chipBg)};color:${esc(panel.chipFg)};">${esc(panel.chip)}</span>
          </div>
          <div class="esp-panel-rows">${rows}</div>
          <div class="esp-panel-foot">
            <div>
              <div class="esp-panel-foot-label">${esc(panel.pieLabel)}</div>
              <div class="esp-panel-foot-val">${esc(panel.pie)}</div>
            </div>
            <span class="btn btn-green btn-sm" style="pointer-events:none;">${esc(panel.cta)}</span>
          </div>
        </div>
      </div>`;
}

function renderProducto(data: SpecialtyData): string {
  const visual = data.usaCaptura ? renderCapturaVisual() : renderPanelVisual(data.panel!);
  const puntos = data.prodPuntos
    .map(
      (p) => `
          <div class="benefit-item">
            <div class="benefit-num">${esc(p.n.replace(/^0/, ""))}</div>
            <div class="benefit-text">
              <h3>${esc(p.titulo)}</h3>
              <p>${esc(p.texto)}</p>
            </div>
          </div>`,
    )
    .join("\n");

  return `
<section class="solution" style="background:var(--zm-night);">
  <div class="wrap">
    <div class="solution-grid">
${visual}
      <div class="solution-copy">
        <p class="section-label" style="color:rgba(74,222,90,.6);">// 02 — Hecho para tu consulta</p>
        <h2 class="section-title" style="color:var(--zm-white);">${esc(data.prodTitulo)}</h2>
        <p class="section-sub" style="color:rgba(255,255,255,.5);">${esc(data.prodSub)}</p>
        <div class="benefit-list">${puntos}</div>
      </div>
    </div>
  </div>
</section>`;
}

function renderZen(data: SpecialtyData): string {
  return `
<section class="solution">
  <div class="wrap">
    <div class="solution-grid reverse">
      <div class="solution-visual" style="padding:0;overflow:hidden;">
        <div class="mockui" style="border-radius:0;border:none;">
          <div class="mockui-chat-header">
            <div class="mockui-chat-contact">
              <div class="mockui-avatar" style="background:#dcfce7;color:#15803d;">LG</div>
              <div>
                <div class="mockui-chat-name">Laura G.</div>
                <div class="mockui-chat-meta">${esc(data.zenHora)}</div>
              </div>
            </div>
            <span class="mockui-status-pill active">Activo</span>
          </div>
          <div class="mockui-chat" style="min-height:230px;">
            <div class="mockui-bubble in">${esc(data.chat.patient1)}</div>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">${esc(data.chat.reply1)}</div>
            <div class="mockui-bubble in">${esc(data.chat.patient2)}</div>
            <div class="mockui-bubble auto" style="align-self:flex-end;border-bottom-left-radius:14px;border-bottom-right-radius:4px;">${esc(data.chat.reply2)}</div>
            <span class="mockui-bubble-tag done" style="align-self:flex-end;">✓ ${esc(data.zenResultado)}</span>
          </div>
        </div>
        <p class="mockui-caption" style="padding-bottom:16px;">// Sin intervención</p>
      </div>
      <div class="solution-copy">
        <p class="section-label">// 03 — Conoce a Zen</p>
        <h2 class="section-title">${esc(data.zenTitulo)}</h2>
        <p class="section-sub">${esc(data.zenSub)}</p>
        <a href="/zen" class="btn btn-dark">Ver todo lo que hace Zen →</a>
      </div>
    </div>
  </div>
</section>`;
}

function renderPlanes(data: SpecialtyData): string {
  const cards = SHARED_PLANES.map((plan) => {
    const cardClass = plan.dark ? "plan-card dark-card" : plan.featured ? "plan-card featured" : "plan-card";
    const badgeHtml = plan.featured
      ? `<div class="plan-chip">⭐ ${esc(plan.badge!)}</div>`
      : `<span class="plan-badge ${plan.dark ? "badge-pro" : "badge-crm"}">${esc(plan.nombre)}</span>`;
    const items = plan.items.map((i) => `<div class="pf"><div class="pf-check">${checkIcon()}</div>${esc(i)}</div>`).join("\n");
    return `
      <div class="${cardClass}">
        ${badgeHtml}
        <div class="plan-name">Zentro Med ${esc(plan.nombre)}</div>
        <div class="plan-price"><sup class="price-sym">$</sup><span class="price-amt">${esc(plan.precio.replace("$", ""))}</span><sub>/ mes</sub></div>
        <div class="plan-note">${esc(plan.usuarios)}</div>
        <div class="plan-divider"></div>
        <div class="plan-features">${items}</div>
        <a href="/signup?plan=${plan.nombre.toLowerCase()}" class="plan-btn ${plan.dark ? "btn-plan-pro" : plan.featured ? "btn-plan-pop" : "btn-plan-crm"}">Elegir ${esc(plan.nombre)} →</a>
        <p class="plan-fine">// ${esc(plan.perfil)}</p>
      </div>`;
  }).join("\n");

  return `
<section class="pricing" id="planes">
  <div class="wrap">
    <div class="pricing-header reveal">
      <p class="section-label">// 04 — Planes</p>
      <h2 class="section-title">${esc(data.planesTitulo)}</h2>
      <p class="section-sub" style="max-width:640px;margin:12px auto 0;">Sin costo de instalación y sin permanencia. La prueba de 30 días incluye WhatsApp y Zen con un tope de cortesía, para que lo veas funcionar antes de pagar.</p>
    </div>
    <div class="plans-grid reveal-group" style="max-width:920px;grid-template-columns:repeat(3,1fr);">${cards}</div>
  </div>
</section>`;
}

function renderTestimonio(t: Testimonio): string {
  return `
<section class="testi">
  <div class="wrap">
    <div class="testi-header reveal">
      <p class="section-label">// 05</p>
      <h2 class="section-title">Un colega que ya lo usa</h2>
    </div>
    <div class="reveal" style="max-width:460px;margin:0 auto;">
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p class="testi-quote">"${esc(t.quote)}"</p>
        <div class="testi-result">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          ${esc(t.cifra)} · ${esc(t.cifraLabel)}
        </div>
        <div class="testi-author">
          <div class="testi-av" style="background:#dcfce7;color:#15803d;">${esc(t.ini)}</div>
          <div>
            <div class="testi-name">${esc(t.nombre)}</div>
            <div class="testi-role">${esc(t.meta)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function renderFaq(data: SpecialtyData): string {
  const items = data.faq
    .map(
      (f) => `
      <div class="faq-item" onclick="zmToggleFaq(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zmToggleFaq(this);}" role="button" tabindex="0" aria-expanded="false">
        <div class="faq-q">${esc(f.p)}
          <svg class="faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="faq-a"><div class="faq-a-inner">${esc(f.r)}</div></div>
      </div>`,
    )
    .join("\n");

  return `
<section class="faq" id="preguntas">
  <div class="wrap">
    <div class="faq-header reveal">
      <p class="section-label">// 06 — Preguntas de ${esc(data.tag)}</p>
      <h2 class="section-title">Lo que preguntan antes de decidir</h2>
    </div>
    <div class="faq-grid">${items}</div>
  </div>
</section>`;
}

export function buildEspecialidadBodyHtml(slug: SpecialtySlug, data: SpecialtyData): string {
  return `
${renderNav(slug, data)}

<!-- HERO -->
<section class="hero">
  <div class="wrap">
    <div class="hero-eyebrow">
      <span class="pill-dark"><span class="dot-green"></span>${esc(data.badge)}</span>
    </div>
    <h1>${esc(data.h1)}</h1>
    <p class="hero-sub">${esc(data.sub)}</p>
    <div class="hero-ctas">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'esp_${slug}_hero'});">Empezar gratis · sin tarjeta</a>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-ghost-light btn-lg">Hablar con un estratega</a>
    </div>
    <p class="hero-note">// 30 días, sin tarjeta · Configurado en 24 horas</p>
  </div>
</section>

${renderRoi(data)}
${renderFugas(data)}
${renderProducto(data)}
${renderZen(data)}
${renderPlanes(data)}
${renderTestimonio(data.testimonio)}
${renderFaq(data)}

<!-- CTA FINAL -->
<section class="cta-final">
  <div class="wrap">
    <p class="section-label" style="color:rgba(74,222,90,.6);margin-bottom:16px;">// Empieza hoy</p>
    <h2>${esc(data.cierre)}</h2>
    <p>Con WhatsApp y Zen incluidos en la prueba. Sin tarjeta, sin permanencia y con tus datos siempre tuyos.</p>
    <div class="cta-btns">
      <a href="/signup" class="btn btn-green btn-lg" onclick="if(typeof fbq!=='undefined')fbq('track','Lead');if(typeof gtag!=='undefined')gtag('event','generate_lead',{event_category:'cta',event_label:'esp_${slug}_final'});">Empezar gratis · sin tarjeta</a>
      <a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="btn btn-ghost-light btn-lg">Hablar con un estratega</a>
    </div>
    <p class="cta-note">// Sin tarjeta · Sin permanencia · Cancela cuando quieras</p>
    <p style="max-width:820px;margin:36px auto 0;font-size:10.5px;line-height:1.8;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace;">Las cifras de reducción son promedios de clientes activos en sus primeros 90 días; los resultados varían según especialidad y volumen de pacientes. La activación en 24 horas cubre CRM, agenda, WhatsApp y Zen. Cada plan incluye una cuota mensual de respuestas de Zen, ampliable desde $5 USD por cada 1,000 adicionales. Zentro Med es software de gestión comercial: no es un sistema de expediente clínico ni de facturación tributaria de un país específico. Los datos se almacenan cifrados en tránsito y en reposo conforme a la Ley 1581 de 2012.</p>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="foot-i">
      <span style="color:rgba(255,255,255,.3);">© 2026 Zentro Labs · <a href="https://zentrolabs.com">zentrolabs.com</a></span>
      <span><a href="https://zentrolabs.com/privacidad.html">Privacidad</a> · <a href="https://zentrolabs.com/terminos.html">Términos</a> · <a href="mailto:hello@zentrolabs.com">hello@zentrolabs.com</a></span>
    </div>
  </div>
</footer>

<!-- WHATSAPP FLOAT -->
<a href="https://wa.me/15752137020" target="_blank" rel="noopener" class="wa-float" aria-label="Escríbenos por WhatsApp">
  <img src="https://cdn.simpleicons.org/whatsapp/ffffff" width="26" height="26" alt="WhatsApp">
</a>

<!-- MOBILE STICKY CTA -->
<div class="mob-cta">
  <div class="mob-cta-info">
    <span class="mob-cta-price">30 días gratis</span>
    <span class="mob-cta-sub">sin tarjeta · WhatsApp y Zen incluidos</span>
  </div>
  <a href="/signup" class="btn btn-green" style="font-size:13px;padding:10px 16px;flex-shrink:0;" onclick="if(typeof gtag!=='undefined')gtag('event','mobile_sticky_cta_click',{event_category:'cta',event_label:'esp_${slug}_sticky'});">Empezar →</a>
</div>
`;
}

export function buildEspecialidadStructuredData(slug: SpecialtySlug, data: SpecialtyData) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://med.zentrolabs.com/#organization",
        name: "Zentro Med",
        url: "https://med.zentrolabs.com",
        description: "CRM comercial para consultorios médicos en Latinoamérica, con marketing digital disponible como servicio independiente.",
        areaServed: ["CO", "MX", "AR", "CL", "PE", "GT"],
      },
      {
        "@type": "Service",
        "@id": `https://med.zentrolabs.com/especialidad/${slug}/#service`,
        name: `Zentro Med para ${data.tag}`,
        provider: { "@id": "https://med.zentrolabs.com/#organization" },
        description: data.sub,
        serviceType: `Software CRM para ${data.tag}`,
        areaServed: ["CO", "MX", "AR", "CL", "PE", "GT"],
      },
    ],
  };
}
