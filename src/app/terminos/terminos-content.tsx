import type { ReactNode } from "react";

// Transcribed verbatim from "Terminos_Condiciones_Zentro_Med_v2.docx"
// (v2.0) supplied by the account owner — do not paraphrase or drop
// clauses when editing; if the source document changes, re-transcribe
// from it rather than hand-editing this file out of sync with it.
// Bracketed placeholders ([DD], [MES], [NÚMERO], [NOMBRE]) are exactly
// as they appear in the source and are intentionally left unfilled.

function H2({ n, children }: { n: string; children: ReactNode }) {
  return (
    <h2 className="mt-10 mb-3 text-base font-bold text-primary first:mt-0">
      {n}. {children}
    </h2>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="mb-2 text-sm font-bold text-foreground">{title}</p>
      <div className="space-y-2 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function Clause({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <p className="mb-2 text-justify text-[13px] font-semibold leading-relaxed text-foreground">
      {n ? <span className="text-primary">{n} </span> : null}
      {children}
    </p>
  );
}

function Lettered({ letter, children }: { letter: string; children: ReactNode }) {
  return (
    <p className="mb-1.5 ml-4 text-justify text-[13px] leading-relaxed text-foreground">
      <span className="font-semibold">{letter}) </span>
      {children}
    </p>
  );
}

export function TerminosContent() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-3xl font-bold text-primary">ZENTRO MED</p>
      <h1 className="mt-1 text-xl font-bold text-foreground">TÉRMINOS Y CONDICIONES DE USO</h1>
      <p className="mt-1 text-sm italic text-muted-foreground">
        Plataforma de gestión comercial y operativa para consultorios y clínicas, en modalidad Software como Servicio (SaaS)
      </p>

      <div className="mt-4 space-y-0.5 text-[13px] font-semibold italic text-foreground">
        <p>Titular y prestador del servicio:</p>
        <p>SERVICIOS EMPRESARIALES CREAR MÉXICO, S.A.S. DE C.V.</p>
        <p>Registro Federal de Contribuyentes: SEC170704L68</p>
        <p>
          Domicilio fiscal: Alpino Glacial 3021, Colonia Lázaro Cárdenas, Tlalnepantla de Baz, Estado de México, C.P. 54189,
          México
        </p>
        <p>Correo de contacto y notificaciones: med@zentrolabs.com</p>
        <p className="mb-2">Sitio web de la Plataforma: https://med.zentrolabs.com</p>
        <p className="text-xs not-italic text-muted-foreground">Versión del documento: 2.0</p>
        <p className="text-xs not-italic text-muted-foreground">Fecha de última actualización: [DD] de [MES] de 2026</p>
        <p className="text-xs not-italic text-muted-foreground">Fecha de entrada en vigor: [DD] de [MES] de 2026</p>
      </div>

      <h2 className="mt-8 mb-3 text-base font-bold text-primary">AVISO PRELIMINAR AL USUARIO</h2>
      <Callout title="Lea este documento antes de utilizar la plataforma">
        <p>
          Este documento constituye un contrato legalmente vinculante entre usted y Servicios Empresariales Crear México,
          S.A.S. de C.V. Al registrarse, acceder o utilizar Zentro Med, usted manifiesta que lo ha leído, comprendido y
          aceptado en su totalidad.
        </p>
        <p>
          Contiene cláusulas que limitan sustancialmente la responsabilidad del Prestador, excluyen garantías, imponen
          obligaciones de indemnización a su cargo y establecen una jurisdicción específica. Dichas cláusulas están
          destacadas en mayúsculas o en recuadros.
        </p>
        <p>
          ZENTRO MED NO ES UN SISTEMA DE EXPEDIENTE CLÍNICO ELECTRÓNICO NI UN SISTEMA DE FACTURACIÓN FISCAL. Es una
          herramienta de gestión comercial y operativa: agenda, comunicación con pacientes, seguimiento, presupuestos y
          registro de cobros.
        </p>
        <p>
          El Prestador no presta servicios de salud, no ejerce la medicina, no emite diagnósticos y no sustituye el juicio
          clínico del profesional sanitario.
        </p>
        <p>Si no está de acuerdo con estos Términos, debe abstenerse de registrarse y de utilizar la Plataforma.</p>
      </Callout>

      <H2 n="1">DEFINICIONES</H2>
      <p className="mb-2 text-justify text-[13px] font-semibold italic leading-relaxed text-foreground">
        Para efectos de este contrato, los siguientes términos tendrán el significado que se les atribuye, sea que se usen
        en singular o plural:
      </p>
      <div className="space-y-2 text-justify text-[13px] font-semibold italic leading-relaxed text-foreground">
        <p>
          &ldquo;Prestador&rdquo;, &ldquo;nosotros&rdquo; o &ldquo;Crear México&rdquo;: Servicios Empresariales Crear
          México, S.A.S. de C.V., sociedad constituida conforme a las leyes de los Estados Unidos Mexicanos, con RFC
          SEC170704L68 y domicilio en Alpino Glacial 3021, Colonia Lázaro Cárdenas, Tlalnepantla de Baz, Estado de México,
          C.P. 54189.
        </p>
        <p>
          &ldquo;Plataforma&rdquo; o &ldquo;Zentro Med&rdquo;: El software en modalidad de servicio accesible en
          med.zentrolabs.com, sus aplicaciones web y móviles, la página pública de reserva, la interfaz de programación
          (API), el servidor MCP, la documentación y cualesquiera módulos o actualizaciones que el Prestador ponga a
          disposición.
        </p>
        <p>
          &ldquo;Cliente&rdquo;: La persona física o moral que contrata una Cuenta, gratuita o de pago, y que actúa como
          Responsable del tratamiento de los Datos de Paciente.
        </p>
        <p>&ldquo;Cuenta&rdquo;: El espacio lógico aislado asignado al Cliente dentro de la arquitectura multiinquilino de la Plataforma.</p>
        <p>
          &ldquo;Usuario Autorizado&rdquo;: Toda persona a la que el Cliente otorgue credenciales de acceso a su Cuenta,
          incluyendo propietarios, administradores, recepción, profesionales sanitarios y usuarios de consulta.
        </p>
        <p>
          &ldquo;Paciente&rdquo;: La persona física cuya información personal, de contacto o relativa a su atención es
          registrada o tratada por el Cliente a través de la Plataforma.
        </p>
        <p>
          &ldquo;Contenido del Cliente&rdquo;: La totalidad de datos, textos, imágenes, documentos, archivos, mensajes,
          fichas, presupuestos, plantillas y demás información que el Cliente o sus Usuarios Autorizados carguen, generen o
          transmitan mediante la Plataforma.
        </p>
        <p>
          &ldquo;Datos de Paciente&rdquo;: El subconjunto del Contenido del Cliente que constituye datos personales,
          incluidos datos personales sensibles relativos a la salud, conforme a la legislación aplicable.
        </p>
        <p>
          &ldquo;Zen&rdquo;: El asistente conversacional de la Plataforma, en sus modalidades de texto y de voz, que
          responde consultas, agenda citas y ejecuta acciones dentro de los límites configurados por el Cliente.
        </p>
        <p>
          &ldquo;Funcionalidades de IA&rdquo;: Zen y todo módulo que emplee modelos de lenguaje, síntesis o reconocimiento
          de voz o aprendizaje automático, incluyendo la base de conocimiento y las automatizaciones asistidas.
        </p>
        <p>&ldquo;Respuesta de IA&rdquo;: Cada generación producida por Zen que se contabiliza contra la cuota mensual del plan contratado.</p>
        <p>
          &ldquo;Servicios de Terceros&rdquo;: Servicios o proveedores ajenos al Prestador de los que la Plataforma depende
          o con los que se integra, incluyendo de manera enunciativa: proveedores de infraestructura en la nube, base de
          datos y hospedaje; WhatsApp Business Platform y Meta Platforms; procesadores de pago; proveedores de modelos de
          lenguaje y de síntesis de voz; servicios de correo transaccional, calendario, monitoreo y analítica.
        </p>
        <p>
          &ldquo;Tarifas&rdquo;: Las contraprestaciones del plan contratado, incluyendo suscripción periódica, usuarios
          adicionales, paquetes de Respuestas de IA, consumos variables e impuestos.
        </p>
        <p>
          &ldquo;Normativa Sanitaria&rdquo;: Las disposiciones aplicables al expediente clínico y a los sistemas de
          información en salud en la jurisdicción del Cliente, incluyendo de manera enunciativa las Normas Oficiales
          Mexicanas NOM-004-SSA3-2012 y NOM-024-SSA3-2012, y para Colombia la Ley 2015 de 2020 y las Resoluciones 1995 de
          1999, 866 de 2021 y 1888 de 2025.
        </p>
        <p>
          &ldquo;Normativa de Datos&rdquo;: La Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares vigente en México, la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia, y sus disposiciones
          reglamentarias, así como la normativa equivalente del país del Cliente.
        </p>
      </div>

      <H2 n="2">OBJETO, ACEPTACIÓN Y CAPACIDAD</H2>
      <Clause n="2.1">
        Objeto. Este instrumento regula el acceso y uso de la Plataforma bajo un modelo de licencia de uso no exclusiva,
        revocable, intransferible y limitada al plazo de vigencia del plan contratado. No transmite al Cliente la
        propiedad del software ni derecho alguno sobre el código fuente.
      </Clause>
      <Clause n="2.2">
        Aceptación. Se perfecciona mediante cualquiera de los siguientes actos, que constituyen manifestación expresa de
        la voluntad en términos del artículo 1803 del Código Civil Federal y del artículo 89 del Código de Comercio: (i)
        marcar la casilla de aceptación durante el registro; (ii) crear una Cuenta; (iii) acceder con credenciales
        válidas; o (iv) pagar cualquier Tarifa.
      </Clause>
      <Clause n="2.3">
        Capacidad y representación. Quien acepte en nombre de una persona moral declara, bajo protesta de decir verdad,
        contar con facultades suficientes y vigentes para obligarla. El Prestador no está obligado a verificarlas y
        quedará liberado de responsabilidad si la declaración resultare falsa, respondiendo el aceptante de manera
        personal y solidaria.
      </Clause>
      <Clause n="2.4">
        Prohibición a menores. La Plataforma se destina exclusivamente a profesionales y establecimientos de salud.
        Ninguna persona menor de dieciocho años podrá registrarse como Cliente ni como Usuario Autorizado.
      </Clause>
      <Clause n="2.5">
        Documentos integrantes. Forman parte integral de este contrato el Aviso de Privacidad, la Política de Uso
        Aceptable, el Convenio de Tratamiento de Datos, la descripción vigente de planes y Tarifas publicada en
        med.zentrolabs.com, y cualquier anexo u orden de servicio suscrita. En caso de contradicción prevalecerá el orden
        siguiente: orden de servicio firmada, Convenio de Tratamiento de Datos, el presente documento y los demás anexos.
      </Clause>

      <H2 n="3">NATURALEZA Y ALCANCE DEL SERVICIO</H2>
      <Callout title="Cláusula esencial — qué es y qué no es Zentro Med">
        <p>
          Zentro Med es una herramienta de gestión comercial y operativa. Su alcance comprende: agenda y página pública de
          reserva, bandeja compartida de WhatsApp, seguimiento y reactivación de pacientes, presupuestos, registro de
          cobros y recibos, y el asistente Zen.
        </p>
        <p>
          ZENTRO MED NO ES UN SISTEMA DE EXPEDIENTE CLÍNICO ELECTRÓNICO. Las notas que el Cliente registre en la ficha de
          un Paciente son notas de gestión y NO sustituyen ni equivalen al expediente clínico que la normativa local
          exija al Cliente, el cual deberá llevar por medios propios.
        </p>
        <p>
          ZENTRO MED NO ES UN SISTEMA DE FACTURACIÓN FISCAL. Los presupuestos, recibos y registros de cobro que genera
          son documentos comerciales internos y NO constituyen comprobantes fiscales de ningún país.
        </p>
      </Callout>
      <Clause n="3.1">No prestación de servicios de salud.</Clause>
      <Clause>
        EL PRESTADOR NO ES UN ESTABLECIMIENTO PARA LA ATENCIÓN MÉDICA, NO ES PRESTADOR DE SERVICIOS DE SALUD, NO EJERCE
        LA MEDICINA NI NINGUNA PROFESIÓN SANITARIA, NO EMITE DIAGNÓSTICOS, NO PRESCRIBE TRATAMIENTOS Y NO PARTICIPA EN LA
        RELACIÓN MÉDICO-PACIENTE. LA TOTALIDAD DE LAS DECISIONES CLÍNICAS, DIAGNÓSTICAS, TERAPÉUTICAS Y ADMINISTRATIVAS
        SON RESPONSABILIDAD EXCLUSIVA DEL CLIENTE Y DE LOS PROFESIONALES SANITARIOS QUE LO INTEGRAN.
      </Clause>
      <Clause n="3.2">
        No es dispositivo médico. La Plataforma no ha sido diseñada, validada ni registrada como software de dispositivo
        médico, sistema de soporte a la decisión clínica ni sistema de soporte vital. El Cliente se obliga a no
        utilizarla para diagnóstico automatizado, monitoreo de constantes vitales, atención de urgencias o emergencias,
        ni para ningún uso en que una falla, retraso o indisponibilidad pudiera causar lesión, agravamiento o muerte.
      </Clause>
      <Clause n="3.3">
        Ausencia de asesoría. Ninguna información, contenido, plantilla, texto sugerido o documento generado por la
        Plataforma o por el Prestador constituye asesoría médica, legal, fiscal, contable ni regulatoria.
      </Clause>
      <Clause n="3.4">Ausencia de garantía de resultados.</Clause>
      <Clause>
        LAS MÉTRICAS, PORCENTAJES, TESTIMONIOS, CALCULADORAS DE RETORNO Y EJEMPLOS DE DESEMPEÑO PUBLICADOS EN MATERIALES
        COMERCIALES SON PROMEDIOS HISTÓRICOS ILUSTRATIVOS. NO CONSTITUYEN PROMESA, GARANTÍA NI PROYECCIÓN DE RESULTADO.
        LOS RESULTADOS VARÍAN SEGÚN ESPECIALIDAD, VOLUMEN DE PACIENTES, CONFIGURACIÓN Y EJECUCIÓN DEL CLIENTE.
      </Clause>
      <Callout title="Uso prohibido en situaciones críticas">
        <p>
          La Plataforma se entrega sin garantía de disponibilidad continua y no debe constituir el único medio de acceso
          a información indispensable ni el único canal de comunicación con Pacientes. El Cliente se obliga a mantener
          procedimientos alternos de contingencia que permitan la continuidad de la atención en caso de indisponibilidad.
        </p>
      </Callout>

      <H2 n="4">REGISTRO, CUENTAS Y USUARIOS AUTORIZADOS</H2>
      <Clause n="4.1">
        Veracidad. El Cliente se obliga a proporcionar información completa, veraz y actualizada durante el registro y a
        mantenerla vigente. El Prestador podrá suspender o cancelar Cuentas con información falsa o desactualizada, sin
        responsabilidad ni reembolso.
      </Clause>
      <Clause n="4.2">
        Credenciales. Son personales e intransferibles. El Cliente es el único responsable de su custodia, de activar
        los factores de autenticación disponibles y de toda actividad realizada bajo ellas, aun cuando la haya realizado
        un tercero no autorizado.
      </Clause>
      <Clause n="4.3">
        Administración de accesos. El Cliente determina de forma autónoma qué personas acceden a su Cuenta, con qué rol
        y con qué alcance. EL PRESTADOR NO INTERVIENE, NO SUPERVISA NI VALIDA LA ASIGNACIÓN DE ROLES Y PERMISOS, Y NO
        SERÁ RESPONSABLE POR ACCESOS INDEBIDOS DERIVADOS DE UNA CONFIGURACIÓN DEFECTUOSA, EXCESIVA O NEGLIGENTE DEL
        CLIENTE O SUS USUARIOS AUTORIZADOS.
      </Clause>
      <Clause n="4.4">
        Responsabilidad por los Usuarios Autorizados. El Cliente responde frente al Prestador por los actos y omisiones
        de sus Usuarios Autorizados como si fueran propios, y se obliga a darlos de baja de inmediato cuando cese la
        relación que justificaba su acceso.
      </Clause>
      <Clause n="4.5">
        Comunicación de incidentes. El Cliente notificará al Prestador dentro de las veinticuatro horas siguientes a que
        tenga conocimiento de cualquier uso no autorizado, pérdida de credenciales o vulneración que afecte su Cuenta.
      </Clause>
      <Clause n="4.6">
        Cuentas de prueba y promocionales. Se otorgan sin garantía alguna y podrán ser modificadas, limitadas,
        suspendidas o eliminadas en cualquier momento, con o sin previo aviso y sin responsabilidad. El Prestador podrá
        limitar el número de Cuentas de prueba por persona, dominio o número telefónico, y rechazar registros que
        presuma abusivos.
      </Clause>

      <H2 n="5">PLANES, TARIFAS, CUOTAS Y FACTURACIÓN</H2>
      <Clause n="5.1">
        Planes. La Plataforma se ofrece mediante planes de suscripción cuyo alcance funcional, número de usuarios
        incluidos, límite de pacientes activos y cuota mensual de Respuestas de IA se describen en la página de planes
        vigente al momento de la contratación, la cual se incorpora por referencia. El Prestador podrá modificar la
        composición de los planes conforme a la cláusula 5.6.
      </Clause>
      <Clause n="5.2">
        Prueba gratuita. El periodo de prueba se otorga sin requerir medio de pago y no genera cobro automático a su
        vencimiento. Al concluir, si el Cliente no activa un plan de pago, LA CUENTA PASARÁ A MODO DE SOLA LECTURA,
        conservándose el Contenido del Cliente conforme a la cláusula 20.4. Los topes de cortesía de WhatsApp y de Zen
        aplicables durante la prueba son discrecionales y revocables.
      </Clause>
      <Clause n="5.3">
        Usuarios adicionales. Los usuarios que excedan los incluidos en el plan se facturan por cada usuario adicional
        conforme a la tarifa vigente publicada, prorrateados al periodo en curso.
      </Clause>
      <Clause n="5.4">Cuota de Respuestas de IA.</Clause>
      <Clause>
        CADA PLAN INCLUYE UNA CUOTA MENSUAL DE RESPUESTAS DE IA QUE NO ES ACUMULABLE NI REEMBOLSABLE Y SE REINICIA CADA
        PERIODO. AGOTADA LA CUOTA, ZEN DEJARÁ DE RESPONDER DE FORMA AUTÓNOMA HASTA QUE EL CLIENTE ADQUIERA UN PAQUETE
        ADICIONAL O INICIE UN NUEVO PERIODO. EL PRESTADOR NO SERÁ RESPONSABLE POR CONSULTAS DE PACIENTES NO ATENDIDAS,
        CITAS NO AGENDADAS NI OPORTUNIDADES PERDIDAS COMO CONSECUENCIA DEL AGOTAMIENTO DE LA CUOTA.
      </Clause>
      <Clause n="5.5">Costos de mensajería a cargo del Cliente.</Clause>
      <Clause>
        LOS COSTOS DE WHATSAPP BUSINESS PLATFORM, INCLUYENDO CARGOS POR CONVERSACIÓN, PLANTILLA O MENSAJE QUE META
        PLATFORMS APLIQUE, SON POR CUENTA EXCLUSIVA DEL CLIENTE Y SE FACTURAN DIRECTAMENTE ENTRE EL CLIENTE Y META O SU
        PROVEEDOR. EL PRESTADOR NO LOS ABSORBE, NO LOS INTERMEDIA Y NO RESPONDE POR SU MONTO, VARIACIÓN O FACTURACIÓN.
      </Clause>
      <Clause n="5.6">
        Modificación de Tarifas y de planes. El Prestador podrá modificar Tarifas, cuotas y composición de planes
        notificando con al menos treinta días naturales de anticipación. Las modificaciones aplicarán al periodo de
        renovación siguiente. La continuación en el uso constituye aceptación.
      </Clause>
      <Clause n="5.7">
        Moneda y equivalencias. Las Tarifas se determinan en dólares de los Estados Unidos de América. Los importes
        mostrados en otras monedas son conversiones de referencia sujetas a variación cambiaria; en caso de discrepancia
        prevalecerá el importe en dólares. Las comisiones e impuestos que aplique la institución financiera o el
        procesador de pago corren por cuenta del Cliente.
      </Clause>
      <Clause n="5.8">
        Procesamiento de pagos. Los pagos se procesan mediante proveedores externos. El Cliente autoriza los cargos
        recurrentes al medio de pago registrado. El Prestador no almacena datos completos de tarjetas y no responde por
        fallas, rechazos, retrasos o cargos duplicados imputables al procesador o a la institución financiera.
      </Clause>
      <Clause n="5.9">
        Renovación y cancelación. Las suscripciones se renuevan automáticamente por periodos iguales. El Cliente podrá
        cancelar en cualquier momento sin penalidad ni permanencia; la cancelación surte efectos al término del periodo
        pagado.
      </Clause>
      <Clause n="5.10">No reembolso.</Clause>
      <Clause>
        SALVO DISPOSICIÓN LEGAL IMPERATIVA EN CONTRARIO, LAS TARIFAS PAGADAS NO SON REEMBOLSABLES, TOTAL NI
        PARCIALMENTE, INCLUYENDO CANCELACIÓN ANTICIPADA, FALTA DE USO, CUOTAS DE IA NO CONSUMIDAS, SUSPENSIÓN POR
        INCUMPLIMIENTO O TERMINACIÓN POR CAUSA IMPUTABLE AL CLIENTE. LAS CUOTAS DE IMPLEMENTACIÓN, CONFIGURACIÓN,
        ACOMPAÑAMIENTO O MIGRACIÓN NO SON REEMBOLSABLES EN NINGÚN SUPUESTO, POR CORRESPONDER A TRABAJO YA EJECUTADO.
      </Clause>
      <Clause n="5.11">Suspensión por falta de pago.</Clause>
      <Clause>
        TRANSCURRIDOS [NÚMERO] DÍAS NATURALES DESDE EL VENCIMIENTO SIN ACREDITARSE EL PAGO, EL PRESTADOR PODRÁ SUSPENDER
        EL ACCESO SIN RESPONSABILIDAD. TRANSCURRIDOS [NÚMERO] DÍAS ADICIONALES PODRÁ TERMINAR EL CONTRATO Y ELIMINAR
        DEFINITIVAMENTE EL CONTENIDO DEL CLIENTE. EL CLIENTE ASUME LA OBLIGACIÓN DE MANTENER RESPALDOS PROPIOS Y
        ACTUALIZADOS.
      </Clause>
      <Clause n="5.12">
        Impuestos. Las Tarifas se expresan sin incluir impuestos, los cuales se trasladarán conforme a la legislación
        aplicable. Cualquier retención que la ley imponga al Cliente correrá por su cuenta sin disminuir la
        contraprestación neta del Prestador.
      </Clause>

      <H2 n="6">CUMPLIMIENTO REGULATORIO SANITARIO</H2>
      <Callout title="Cláusula esencial — declaración de no certificación">
        <p>
          El Cliente reconoce y acepta expresamente que la Plataforma NO cuenta, a la fecha de aceptación de estos
          Términos, con certificación emitida por la Dirección General de Información en Salud respecto de la
          NOM-024-SSA3-2012, ni con habilitación, acreditación, registro o certificación ante autoridad sanitaria alguna
          de México, Colombia o cualquier otro país.
        </p>
        <p>
          El Prestador NO declara, NO garantiza y NO se obliga a que el uso de la Plataforma haga que el Cliente cumpla
          la Normativa Sanitaria aplicable a su establecimiento, ni a que implemente los mecanismos de interoperabilidad,
          catálogos, resúmenes digitales de atención, prescripción electrónica o firma electrónica avanzada que dicha
          normativa exija.
        </p>
        <p>La contratación se realiza con pleno conocimiento de lo anterior y bajo la exclusiva responsabilidad del Cliente.</p>
      </Callout>
      <Clause n="6.1">
        Responsabilidad exclusiva del Cliente. Corresponde únicamente al Cliente, en su carácter de prestador de
        servicios de salud: (i) obtener y mantener vigentes licencias, avisos de funcionamiento, habilitaciones y
        registros exigidos por la autoridad; (ii) determinar si la Plataforma resulta idónea para sus obligaciones
        normativas; (iii) llevar por medios propios el expediente clínico con los contenidos mínimos exigidos por la
        ley; (iv) conservar los expedientes por los plazos legales; (v) emitir los comprobantes fiscales que
        correspondan; y (vi) atender requerimientos de autoridad.
      </Clause>
      <Clause n="6.2">
        Cambios normativos. El Prestador podrá, sin estar obligado, desarrollar funcionalidades orientadas al
        cumplimiento normativo. Ninguna comunicación comercial, hoja de ruta, demostración o declaración verbal
        constituirá compromiso contractual salvo que conste por escrito firmado por representante legal del Prestador.
      </Clause>
      <Clause n="6.3">
        Deslinde por sanciones. EL PRESTADOR NO SERÁ RESPONSABLE, EN NINGÚN CASO, POR MULTAS, SANCIONES, CLAUSURAS,
        SUSPENSIONES DE HABILITACIÓN, OBSERVACIONES DE AUDITORÍA NI CUALQUIER OTRA CONSECUENCIA ADMINISTRATIVA, CIVIL O
        PENAL DERIVADA DEL INCUMPLIMIENTO NORMATIVO DEL CLIENTE, AUN CUANDO SE RELACIONE CON LAS CAPACIDADES O
        LIMITACIONES DE LA PLATAFORMA.
      </Clause>
      <Clause n="6.4">
        Operación multipaís. La Plataforma se ofrece en diversos países. El Cliente reconoce que las funcionalidades son
        de propósito general y no están adaptadas al marco clínico, fiscal ni sanitario particular de ningún país, y que
        le corresponde verificar su idoneidad conforme a su jurisdicción.
      </Clause>

      <H2 n="7">CONTENIDO DEL CLIENTE, INTEGRIDAD Y CONSERVACIÓN</H2>
      <Clause n="7.1">Titularidad. El Contenido del Cliente es propiedad y responsabilidad del Cliente. El Prestador actúa como mero custodio técnico.</Clause>
      <Clause n="7.2">
        Registros no modificables. Determinados registros de la Plataforma se almacenan con carácter irreversible por
        diseño y no pueden modificarse ni eliminarse; las correcciones se practican mediante anotaciones adicionales
        fechadas. EL CLIENTE ACEPTA EXPRESAMENTE ESTA CARACTERÍSTICA Y RECONOCE QUE EL PRESTADOR NO ESTÁ OBLIGADO A
        ELIMINAR, ALTERAR NI RECTIFICAR EL CONTENIDO DE DICHOS REGISTROS, AUN A PETICIÓN DEL CLIENTE O DEL PACIENTE,
        SALVO MANDAMIENTO DE AUTORIDAD COMPETENTE.
      </Clause>
      <Clause n="7.3">
        Firmas y consentimientos electrónicos. Los mecanismos de firma y de consentimiento disponibles corresponden a
        firma electrónica simple. EL PRESTADOR NO GARANTIZA QUE SATISFAGAN LOS REQUISITOS DE FIRMA ELECTRÓNICA
        AVANZADA, FIRMA DIGITAL CERTIFICADA NI CONSTANCIA DE CONSERVACIÓN QUE EXIJA LA LEGISLACIÓN APLICABLE, NI SU
        EFICACIA PROBATORIA ANTE AUTORIDAD JUDICIAL O ADMINISTRATIVA. Corresponde al Cliente evaluar su suficiencia.
      </Clause>
      <Clause n="7.4">
        Conservación. El Prestador conservará el Contenido del Cliente mientras la Cuenta permanezca activa y durante el
        periodo de gracia previsto en la cláusula 20.4. TRANSCURRIDO DICHO PERIODO, EL CONTENIDO PODRÁ SER ELIMINADO DE
        FORMA DEFINITIVA E IRRECUPERABLE. LAS OBLIGACIONES LEGALES DE CONSERVACIÓN POR PLAZOS PROLONGADOS RECAEN
        EXCLUSIVAMENTE EN EL CLIENTE, QUIEN DEBERÁ EXPORTAR Y RESGUARDAR COPIAS PROPIAS.
      </Clause>
      <Clause n="7.5">
        Respaldos. Los respaldos que el Prestador realice tienen finalidad exclusiva de continuidad operativa y no
        constituyen servicio de archivo, custodia legal ni recuperación garantizada a favor del Cliente. EL PRESTADOR NO
        GARANTIZA LA RECUPERACIÓN DE DATOS PERDIDOS Y NO SERÁ RESPONSABLE POR SU PÉRDIDA, CORRUPCIÓN O INDISPONIBILIDAD.
      </Clause>
      <Clause n="7.6">
        Exportación. El Cliente podrá exportar su información en los formatos que la Plataforma soporte en cada momento.
        El Prestador no garantiza que dichos formatos sean compatibles con sistemas de terceros ni que satisfagan
        requisitos de interoperabilidad normativa.
      </Clause>

      <H2 n="8">PROTECCIÓN DE DATOS PERSONALES</H2>
      <Clause n="8.1">
        Roles. Para todos los efectos de la Normativa de Datos, EL CLIENTE ES EL RESPONSABLE del tratamiento de los
        Datos de Paciente y EL PRESTADOR ES ENCARGADO, actuando conforme a las instrucciones documentadas del Cliente
        materializadas en la configuración y uso de la Plataforma.
      </Clause>
      <Clause n="8.2">Obligaciones del Cliente. Corresponde exclusivamente al Cliente:</Clause>
      <Lettered letter="a">
        Recabar el consentimiento expreso y por escrito de los Pacientes para el tratamiento de datos personales
        sensibles de salud, así como consentimiento separado para comunicaciones comerciales, campañas y reactivación.
      </Lettered>
      <Lettered letter="b">
        Elaborar, publicar y poner a disposición su propio Aviso de Privacidad o Política de Tratamiento, informando la
        existencia de encargados y de transferencias internacionales.
      </Lettered>
      <Lettered letter="c">Atender, como Responsable, las solicitudes de derechos ARCO o de habeas data dentro de los plazos legales.</Lettered>
      <Lettered letter="d">Registrar sus bases de datos ante la autoridad competente cuando la ley se lo exija.</Lettered>
      <Lettered letter="e">
        Informar a los Pacientes que sus conversaciones podrán ser atendidas por un asistente automatizado, y verificar
        la licitud de la información que carga.
      </Lettered>
      <Clause n="8.3">
        Transferencias internacionales. EL CLIENTE RECONOCE Y CONSIENTE EXPRESAMENTE que la Plataforma se apoya en
        infraestructura y proveedores ubicados fuera de su territorio nacional, y que en consecuencia el Contenido del
        Cliente, incluidos Datos de Paciente, será almacenado, procesado y transmitido en el extranjero. El Cliente se
        obliga a informar dicha circunstancia a los titulares y a obtener los consentimientos necesarios.
      </Clause>
      <Clause n="8.4">
        Subencargados. El Cliente autoriza al Prestador a contratar subencargados, incluyendo proveedores de
        infraestructura y base de datos, hospedaje, mensajería, procesamiento de pagos, correo transaccional, modelos de
        lenguaje y de voz, monitoreo de errores y analítica de producto. El Prestador mantendrá una relación actualizada
        disponible a solicitud y procurará imponerles obligaciones sustancialmente equivalentes. EL PRESTADOR NO
        RESPONDE POR ACTOS U OMISIONES DE SUBENCARGADOS QUE EXCEDAN SU CONTROL RAZONABLE.
      </Clause>
      <Clause n="8.5">
        Medidas de seguridad. El Prestador implementa medidas técnicas y organizativas razonables acordes al estado de
        la técnica, incluyendo cifrado en tránsito y en reposo, aislamiento lógico entre Cuentas, control de acceso
        basado en roles y registro de eventos de autenticación. EL CLIENTE RECONOCE QUE NINGÚN SISTEMA ES ABSOLUTAMENTE
        SEGURO Y QUE EL PRESTADOR NO GARANTIZA LA INEXISTENCIA DE VULNERACIONES.
      </Clause>
      <Clause n="8.6">
        Ausencia de certificación de seguridad. EL PRESTADOR NO DECLARA CONTAR CON CERTIFICACIÓN ISO/IEC 27001, SOC 2 NI
        CUALQUIER OTRA CERTIFICACIÓN O ATESTIGUAMIENTO DE SEGURIDAD, SALVO QUE ASÍ SE HAGA CONSTAR POR ESCRITO Y DE
        MANERA EXPRESA.
      </Clause>
      <Clause n="8.7">
        Vulneraciones. El Prestador notificará al Cliente, sin demora indebida, las vulneraciones de seguridad de las
        que tenga conocimiento y que afecten materialmente su Contenido. CORRESPONDE AL CLIENTE, COMO RESPONSABLE,
        VALORAR Y EJECUTAR LA NOTIFICACIÓN A LOS TITULARES Y A LA AUTORIDAD, ASUMIENDO ÍNTEGRAMENTE LAS CONSECUENCIAS DE
        DICHA VALORACIÓN.
      </Clause>

      <H2 n="9">ZEN Y FUNCIONALIDADES DE INTELIGENCIA ARTIFICIAL</H2>
      <Callout title="Descargo reforzado sobre inteligencia artificial">
        <p>
          Zen y las demás Funcionalidades de IA generan resultados de naturaleza probabilística que pueden ser
          inexactos, incompletos, sesgados, desactualizados o completamente erróneos, incluso cuando se presenten con
          apariencia de certeza.
        </p>
        <p>
          Ninguna salida constituye diagnóstico, indicación terapéutica, dosificación, consejo médico ni recomendación
          clínica. Zen está configurado para no abordar temas clínicos, pero el Prestador NO GARANTIZA que en todos los
          casos derive la conversación a una persona ni que se abstenga de emitir contenido inadecuado.
        </p>
        <p>El Cliente asume la totalidad del riesgo derivado del uso de estas funcionalidades y de la información que configure como base de conocimiento.</p>
      </Callout>
      <Clause n="9.1">
        Activación y configuración. Las Funcionalidades de IA operan con la información que el Cliente configura:
        precios, horarios, servicios y respuestas frecuentes. EL CLIENTE ES EL ÚNICO RESPONSABLE DE LA EXACTITUD,
        VIGENCIA Y LICITUD DE DICHA INFORMACIÓN, Y DE LAS CONSECUENCIAS DE QUE ZEN LA COMUNIQUE A UN PACIENTE,
        INCLUYENDO PRECIOS ERRÓNEOS, DISPONIBILIDAD INEXISTENTE O CITAS MAL AGENDADAS.
      </Clause>
      <Clause n="9.2">
        Actuación autónoma. En los planes que lo incluyen, Zen responde y agenda de forma autónoma sin intervención
        humana previa. EL CLIENTE ACEPTA EXPRESAMENTE DICHA AUTONOMÍA Y RECONOCE QUE LAS COMUNICACIONES EMITIDAS POR
        ZEN SE REPUTAN EMITIDAS POR EL CLIENTE FRENTE A SUS PACIENTES Y FRENTE A TERCEROS.
      </Clause>
      <Clause n="9.3">
        Transmisión a terceros. EL CLIENTE RECONOCE Y CONSIENTE QUE EL CONTENIDO NECESARIO PARA OPERAR ESTAS
        FUNCIONALIDADES —INCLUIDOS POTENCIALMENTE DATOS PERSONALES DE PACIENTES Y EL CONTENIDO DE SUS
        CONVERSACIONES— SERÁ TRANSMITIDO A PROVEEDORES EXTERNOS DE MODELOS DE LENGUAJE Y DE SÍNTESIS O RECONOCIMIENTO
        DE VOZ UBICADOS EN EL EXTRANJERO, PARA SU PROCESAMIENTO.
      </Clause>
      <Clause n="9.4">
        Funcionalidades de voz. Las funciones de dictado y de voz implican el procesamiento de grabaciones de audio por
        proveedores externos. El Cliente se obliga a informar y, cuando proceda, a recabar consentimiento de las
        personas cuya voz sea captada.
      </Clause>
      <Clause n="9.5">
        Supervisión humana. El Cliente se obliga a mantener supervisión humana efectiva sobre las comunicaciones
        automatizadas dirigidas a Pacientes, a revisar periódicamente la configuración de Zen y a intervenir cuando la
        conversación lo requiera.
      </Clause>
      <Clause n="9.6">
        Exclusión de responsabilidad. EL PRESTADOR NO SERÁ RESPONSABLE, BAJO NINGUNA TEORÍA JURÍDICA, POR DAÑOS,
        PERJUICIOS, LESIONES, AGRAVAMIENTOS, PÉRDIDA DE OPORTUNIDAD TERAPÉUTICA, CITAS ERRÓNEAS, COMPROMISOS
        COMERCIALES ASUMIDOS POR ZEN, RECLAMACIONES POR MALA PRÁCTICA NI CUALQUIER OTRA CONSECUENCIA DERIVADA DEL USO,
        MAL USO O CONFIANZA DEPOSITADA EN LAS FUNCIONALIDADES DE IA.
      </Clause>

      <H2 n="10">MENSAJERÍA, INTEGRACIONES Y SERVICIOS DE TERCEROS</H2>
      <Clause n="10.1">
        Dependencia de terceros. La Plataforma opera sobre servicios de terceros cuyas políticas, precios,
        disponibilidad, condiciones técnicas y decisiones unilaterales escapan al control del Prestador.
      </Clause>
      <Clause n="10.2">
        Cumplimiento de políticas de plataforma. El Cliente se obliga a cumplir las políticas de WhatsApp Business,
        Meta Platforms y demás proveedores, incluyendo las relativas a consentimiento del destinatario, plantillas
        aprobadas, ventanas de conversación, contenido permitido y prohibición de mensajería no solicitada.
      </Clause>
      <Clause n="10.3">Bloqueos y suspensiones.</Clause>
      <Clause>
        EL PRESTADOR NO SERÁ RESPONSABLE POR LA RESTRICCIÓN, LIMITACIÓN DE CALIDAD, SUSPENSIÓN, BLOQUEO, BAJA O
        CANCELACIÓN DE NÚMEROS TELEFÓNICOS, CUENTAS DE MENSAJERÍA, PERFILES COMERCIALES, CUENTAS PUBLICITARIAS O
        CUALQUIER ACTIVO DIGITAL DEL CLIENTE, DECRETADA POR UN TERCERO POR CUALQUIER CAUSA, INCLUYENDO CAUSAS AJENAS A
        LA CONDUCTA DEL CLIENTE. TAMPOCO RESPONDERÁ POR LA PÉRDIDA DEL HISTORIAL DE CONVERSACIONES DERIVADA DE DICHAS
        MEDIDAS.
      </Clause>
      <Clause n="10.4">
        Cambios en servicios de terceros. Si un tercero modifica, encarece, restringe o discontinúa su servicio, el
        Prestador podrá modificar, limitar o retirar la funcionalidad correspondiente sin que ello genere derecho a
        indemnización, reembolso ni bonificación.
      </Clause>
      <Clause n="10.5">
        Entregabilidad. El Prestador no garantiza la entrega, recepción, oportunidad ni lectura de mensajes, correos,
        notificaciones, recordatorios de cita o campañas enviadas a través de la Plataforma. EL CLIENTE NO DEBERÁ
        DEPENDER EXCLUSIVAMENTE DE ESTOS MECANISMOS PARA COMUNICACIONES CRÍTICAS.
      </Clause>
      <Clause n="10.6">
        Servicios opcionales de marketing. Los servicios de gestión de campañas publicitarias que el Prestador ofrezca
        por separado se rigen por su propia orden de servicio. Su precio no incluye la inversión publicitaria en Meta,
        Google ni ninguna otra plataforma, y no comprenden garantía de resultados, alcance, costo por resultado ni
        aprobación de anuncios por las plataformas.
      </Clause>

      <H2 n="11">ACCESO DE SOPORTE A LA CUENTA</H2>
      <Clause n="11.1">
        Acceso técnico. Para prestar soporte, diagnosticar incidencias, cumplir requerimientos de autoridad o preservar
        la seguridad e integridad de la Plataforma, personal autorizado del Prestador podrá acceder a información de
        configuración y a registros técnicos de la Cuenta, bajo el principio de mínimo privilegio.
      </Clause>
      <Clause n="11.2">
        Acceso con autorización del Cliente. Cuando la atención de una incidencia requiera acceder a la Cuenta con la
        perspectiva de un Usuario Autorizado, dicho acceso se solicitará al propietario de la Cuenta o a los aprobadores
        que este designe, y se realizará únicamente previa autorización expresa otorgada por el mecanismo de
        verificación que la Plataforma disponga. La autorización es de alcance y vigencia limitados.
      </Clause>
      <Clause n="11.3">
        Registro y aviso. Todo acceso de soporte a la Cuenta se registra de forma no modificable, indicando identidad
        del personal, fecha, hora, alcance y autorización que lo amparó. El Prestador notificará al propietario de la
        Cuenta el inicio y la conclusión de dichos accesos.
      </Clause>
      <Clause n="11.4">
        Acceso de emergencia. En supuestos de riesgo inminente para la seguridad, integridad o disponibilidad de la
        Plataforma, o por mandamiento de autoridad competente, el Prestador podrá acceder sin autorización previa,
        debiendo dejar constancia registrada y notificar al Cliente tan pronto sea razonablemente posible.
      </Clause>
      <Clause n="11.5">
        Límite. El Prestador no accederá al contenido de las notas de atención registradas por el Cliente en las fichas
        de Pacientes salvo autorización expresa y puntual del Cliente para un caso concreto, o mandamiento de autoridad
        competente.
      </Clause>

      <H2 n="12">USO ACEPTABLE Y CONDUCTAS PROHIBIDAS</H2>
      <p className="mb-2 text-justify text-[13px] font-semibold italic leading-relaxed text-foreground">
        El Cliente se obliga a abstenerse, por sí o por conducto de sus Usuarios Autorizados, de:
      </p>
      <ul className="mb-3 ml-5 list-disc space-y-1 text-justify text-[13px] leading-relaxed text-foreground">
        <li>Utilizar la Plataforma para fines ilícitos, fraudulentos o contrarios a la moral y las buenas costumbres.</li>
        <li>Cargar información de Pacientes respecto de la cual carezca de base legal o consentimiento válido.</li>
        <li>
          Enviar comunicaciones masivas no solicitadas, contenido engañoso, publicidad sanitaria contraria a la
          normativa aplicable o mensajes que atribuyan efectos terapéuticos no comprobados.
        </li>
        <li>
          Configurar a Zen para emitir contenido clínico, diagnóstico o terapéutico, o para suplantar la identidad de
          un profesional sanitario sin advertir su naturaleza automatizada cuando la ley lo exija.
        </li>
        <li>
          Descompilar, desensamblar, aplicar ingeniería inversa, extraer el código fuente, eludir controles técnicos o
          intentar acceder a Cuentas, entornos o datos de otros clientes.
        </li>
        <li>
          Sublicenciar, revender, arrendar, ceder o poner la Plataforma a disposición de terceros ajenos a su
          organización, salvo autorización expresa y por escrito.
        </li>
        <li>Crear múltiples Cuentas de prueba para eludir límites, cuotas o cobros.</li>
        <li>Utilizar medios automatizados de extracción masiva de datos, salvo mediante la API oficial y dentro de los límites establecidos.</li>
        <li>Realizar pruebas de penetración, escaneos de vulnerabilidades o cualquier evaluación de seguridad sin autorización previa y por escrito.</li>
        <li>Introducir código malicioso, sobrecargar deliberadamente la infraestructura o interferir con la operación de la Plataforma o de otros clientes.</li>
        <li>Utilizar la Plataforma para desarrollar, entrenar o mejorar un producto competidor.</li>
        <li>Suprimir, alterar u ocultar avisos de propiedad intelectual, marcas o atribuciones.</li>
      </ul>
      <Clause n="12.1">
        Suspensión inmediata. El Prestador podrá suspender el acceso de forma inmediata, sin previo aviso y sin
        responsabilidad, cuando advierta o presuma fundadamente cualquiera de las conductas anteriores, un riesgo para
        la seguridad o integridad de la Plataforma, o un requerimiento de autoridad.
      </Clause>

      <H2 n="13">PROPIEDAD INTELECTUAL</H2>
      <Clause n="13.1">
        Titularidad del Prestador. La Plataforma, su código, arquitectura, interfaces, diseño, documentación, marcas,
        nombres comerciales y avisos comerciales son propiedad del Prestador o de sus licenciantes. Nada en este
        contrato se interpretará como transmisión de dichos derechos.
      </Clause>
      <Clause n="13.2">
        Componentes de terceros y software libre. La Plataforma incorpora componentes de código abierto sujetos a sus
        propias licencias, las cuales prevalecen respecto de dichos componentes en lo aplicable.
      </Clause>
      <Clause n="13.3">
        Contenido del Cliente. El Cliente conserva su titularidad y otorga al Prestador una licencia mundial, no
        exclusiva, libre de regalías y limitada a la vigencia del contrato, para alojar, reproducir, transmitir,
        adaptar técnicamente y respaldar dicho Contenido con la finalidad exclusiva de prestar el servicio, garantizar
        su seguridad y cumplir obligaciones legales.
      </Clause>
      <Clause n="13.4">
        Datos agregados y anonimizados. El Prestador podrá generar y utilizar, de manera perpetua e irrevocable,
        información estadística agregada y disociada derivada del uso de la Plataforma, siempre que no permita
        identificar al Cliente ni a ningún Paciente, con fines de mejora del producto, análisis y desarrollo comercial.
      </Clause>
      <Clause n="13.5">
        Retroalimentación. Toda sugerencia, comentario o propuesta de mejora que el Cliente comunique se entenderá
        cedida al Prestador de manera gratuita, perpetua e irrevocable, sin derecho a contraprestación, reconocimiento
        ni participación.
      </Clause>
      <Clause n="13.6">
        Referencias comerciales. Salvo manifestación en contrario comunicada por escrito, el Prestador podrá mencionar
        la denominación y logotipo del Cliente como referencia en materiales comerciales. La publicación de cifras,
        resultados o testimonios del Cliente requerirá su autorización previa y por escrito.
      </Clause>

      <H2 n="14">DISPONIBILIDAD, MANTENIMIENTO Y SOPORTE</H2>
      <Clause n="14.1">
        Ausencia de nivel de servicio garantizado. SALVO QUE SE HAYA SUSCRITO UN ACUERDO DE NIVEL DE SERVICIO
        ESPECÍFICO Y POR ESCRITO, LA PLATAFORMA SE PRESTA SIN COMPROMISO DE DISPONIBILIDAD, TIEMPO DE ACTIVIDAD, TIEMPO
        DE RESPUESTA NI CONTINUIDAD.
      </Clause>
      <Clause n="14.2">
        Mantenimiento. El Prestador podrá realizar mantenimiento programado o de emergencia que implique
        interrupciones, procurando avisar con anticipación cuando resulte razonable.
      </Clause>
      <Clause n="14.3">
        Evolución del producto. El Prestador podrá modificar, agregar, rediseñar, limitar o discontinuar
        funcionalidades en cualquier momento. La discontinuación de una funcionalidad sustancial se notificará con al
        menos treinta días naturales de anticipación, sin derecho a indemnización.
      </Clause>
      <Clause n="14.4">
        Implementación y acompañamiento. Los plazos de activación, configuración o acompañamiento que se comuniquen
        comercialmente constituyen metas operativas sujetas a la disponibilidad y colaboración oportuna del Cliente, y
        no obligaciones de resultado.
      </Clause>
      <Clause n="14.5">
        Soporte. Se presta por los canales oficiales que el Prestador publique, en días y horas hábiles. Los tiempos de
        primera respuesta constituyen metas operativas y no obligaciones de resultado. No se presta soporte por
        canales informales ni personales.
      </Clause>

      <H2 n="15">OBLIGACIONES DE SEGURIDAD DEL CLIENTE</H2>
      <Clause n="15.1">
        Medidas a cargo del Cliente. El Cliente se obliga a activar los mecanismos de seguridad disponibles, aplicar el
        principio de mínimo privilegio, mantener sus dispositivos y redes protegidos, y capacitar a sus Usuarios
        Autorizados. EL PRESTADOR NO RESPONDE POR INCIDENTES ORIGINADOS EN EL ENTORNO, DISPOSITIVOS, REDES O CONDUCTA
        DEL CLIENTE.
      </Clause>
      <Clause n="15.2">
        Credenciales de API. Las claves de acceso a la API y a integraciones son responsabilidad exclusiva del Cliente,
        quien deberá custodiarlas, limitarlas al alcance mínimo necesario y revocarlas de inmediato ante sospecha de
        compromiso.
      </Clause>
      <Clause n="15.3">
        Reporte de vulnerabilidades. Deberán reportarse de forma confidencial al correo de contacto del Prestador,
        absteniéndose de divulgarlas públicamente y de explotarlas.
      </Clause>

      <H2 n="16">CONFIDENCIALIDAD</H2>
      <Clause n="16.1">
        Obligación recíproca. Cada parte mantendrá en reserva la información confidencial de la otra, no la divulgará
        y la utilizará exclusivamente para los fines del contrato, durante su vigencia y por cinco años posteriores a
        su terminación.
      </Clause>
      <Clause n="16.2">
        Excepciones. No se considera confidencial la información de dominio público sin culpa del receptor, la que
        este ya poseyera lícitamente, la recibida de un tercero sin obligación de reserva, o aquella cuya divulgación
        sea exigida por autoridad competente, en cuyo caso se notificará a la otra parte cuando sea legalmente posible.
      </Clause>

      <H2 n="17">EXCLUSIÓN DE GARANTÍAS</H2>
      <Callout title="Servicio prestado en el estado en que se encuentra">
        <p>
          LA PLATAFORMA SE PROPORCIONA &ldquo;TAL CUAL&rdquo; Y &ldquo;SEGÚN DISPONIBILIDAD&rdquo;, CON TODOS SUS
          DEFECTOS Y SIN GARANTÍA DE NINGUNA ESPECIE, EXPRESA, IMPLÍCITA, LEGAL O DERIVADA DE LOS USOS Y PRÁCTICAS
          MERCANTILES.
        </p>
        <p>
          EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EL PRESTADOR EXCLUYE TODA GARANTÍA DE COMERCIABILIDAD, IDONEIDAD
          PARA UN PROPÓSITO PARTICULAR, TITULARIDAD, NO INFRACCIÓN, EXACTITUD, INTEGRIDAD, DISPONIBILIDAD
          ININTERRUMPIDA, AUSENCIA DE ERRORES O DE COMPONENTES DAÑINOS, Y ADECUACIÓN A CUALQUIER MARCO NORMATIVO.
        </p>
        <p>NINGUNA INFORMACIÓN VERBAL O ESCRITA PROPORCIONADA POR EL PRESTADOR O SU PERSONAL CREARÁ GARANTÍA ALGUNA.</p>
      </Callout>

      <H2 n="18">LIMITACIÓN DE RESPONSABILIDAD</H2>
      <Clause n="18.1">
        Exclusión de daños. EN NINGÚN CASO EL PRESTADOR, SUS ACCIONISTAS, ADMINISTRADORES, EMPLEADOS, PROVEEDORES O
        LICENCIANTES SERÁN RESPONSABLES POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, PUNITIVOS O CONSECUENCIALES,
        NI POR LUCRO CESANTE, PÉRDIDA DE INGRESOS, PÉRDIDA DE CLIENTELA, PÉRDIDA DE OPORTUNIDAD, DAÑO REPUTACIONAL,
        PÉRDIDA O CORRUPCIÓN DE DATOS, NI COSTO DE SERVICIOS SUSTITUTOS, AUN CUANDO SE LE HUBIERE ADVERTIDO DE SU
        POSIBILIDAD.
      </Clause>
      <Clause n="18.2">Tope de responsabilidad.</Clause>
      <Clause>
        LA RESPONSABILIDAD TOTAL Y ACUMULADA DEL PRESTADOR, POR CUALQUIER CAUSA Y BAJO CUALQUIER TEORÍA JURÍDICA,
        CONTRACTUAL, EXTRACONTRACTUAL O DE OTRA NATURALEZA, NO EXCEDERÁ EL MONTO EFECTIVAMENTE PAGADO POR EL CLIENTE AL
        PRESTADOR DURANTE LOS TRES MESES INMEDIATOS ANTERIORES AL HECHO QUE ORIGINE LA RECLAMACIÓN. TRATÁNDOSE DE
        CUENTAS GRATUITAS, DE PRUEBA O PROMOCIONALES, DICHA RESPONSABILIDAD SE LIMITA A LA CANTIDAD DE CIEN PESOS
        MONEDA NACIONAL.
      </Clause>
      <Clause n="18.3">
        Supuestos expresamente excluidos. Sin limitar lo anterior, el Prestador no responderá por daños derivados de:
        (i) decisiones clínicas o de atención; (ii) uso o confianza en Zen y demás Funcionalidades de IA; (iii) actos,
        omisiones, fallas, precios o decisiones de Servicios de Terceros, incluidos cargos de mensajería; (iv)
        configuración, uso indebido o negligencia del Cliente o sus Usuarios Autorizados; (v) incumplimiento normativo
        del Cliente; (vi) pérdida de datos cuando el Cliente no haya mantenido respaldos propios; (vii) accesos no
        autorizados originados en credenciales comprometidas del Cliente; (viii) resultados comerciales no alcanzados;
        y (ix) caso fortuito o fuerza mayor.
      </Clause>
      <Clause n="18.4">
        Plazo de caducidad. Toda reclamación deberá presentarse dentro de los doce meses siguientes a la fecha en que
        ocurrió el hecho que la origina; transcurrido dicho plazo la acción caducará.
      </Clause>
      <Clause n="18.5">
        Asignación de riesgos. El Cliente reconoce que estas limitaciones son elemento esencial del equilibrio
        económico del contrato y que sin ellas las Tarifas serían sustancialmente superiores.
      </Clause>
      <Clause n="18.6">
        Salvedad legal. Las limitaciones aplicarán en la máxima medida permitida por la legislación imperativa, sin
        pretender excluir la responsabilidad que la ley no permita limitar, particularmente en materia de dolo o mala
        fe.
      </Clause>

      <H2 n="19">INDEMNIZACIÓN A CARGO DEL CLIENTE</H2>
      <Clause n="19.1">
        Obligación de sacar en paz y a salvo. El Cliente defenderá, indemnizará y mantendrá libre de responsabilidad al
        Prestador, sus accionistas, administradores, empleados y proveedores, frente a cualquier reclamación, demanda,
        denuncia, procedimiento administrativo, sanción, condena, daño, perjuicio, gasto y honorarios de abogados
        razonables, que deriven de:
      </Clause>
      <Lettered letter="a">El Contenido del Cliente, su licitud, veracidad, exactitud y la base legal para su tratamiento.</Lettered>
      <Lettered letter="b">
        Reclamaciones de Pacientes o de terceros relacionadas con la atención sanitaria, las notas de atención, la
        mala práctica o el resultado de un tratamiento.
      </Lettered>
      <Lettered letter="c">
        El incumplimiento por el Cliente de la Normativa Sanitaria, de la Normativa de Datos o de cualquier otra
        disposición aplicable, incluida la fiscal.
      </Lettered>
      <Lettered letter="d">La ausencia, insuficiencia o vicio del consentimiento de los titulares de datos personales.</Lettered>
      <Lettered letter="e">La información que el Cliente configure en Zen y las comunicaciones que Zen emita con base en ella.</Lettered>
      <Lettered letter="f">
        Comunicaciones, campañas o mensajes enviados a través de la Plataforma, incluyendo su contenido, oportunidad y
        destinatarios.
      </Lettered>
      <Lettered letter="g">El uso de la Plataforma en contravención a estos Términos o a las políticas de Servicios de Terceros.</Lettered>
      <Lettered letter="h">La infracción de derechos de propiedad intelectual o industrial de terceros por el Contenido del Cliente.</Lettered>
      <Clause n="19.2">
        Conducción de la defensa. El Prestador notificará la reclamación y podrá, a su elección, asumir la dirección
        de su propia defensa con cargo al Cliente. El Cliente no podrá celebrar convenio que imponga obligaciones o
        reconocimientos al Prestador sin su consentimiento previo y por escrito.
      </Clause>

      <H2 n="20">VIGENCIA, TERMINACIÓN Y EFECTOS</H2>
      <Clause n="20.1">Vigencia. El contrato inicia con la aceptación y permanece vigente mientras exista una Cuenta activa.</Clause>
      <Clause n="20.2">
        Terminación por el Cliente. Podrá terminar en cualquier momento cancelando su suscripción, surtiendo efectos
        al término del periodo pagado, sin derecho a reembolso.
      </Clause>
      <Clause n="20.3">
        Terminación por el Prestador. Podrá terminar: (i) por incumplimiento del Cliente no subsanado dentro de los
        cinco días hábiles siguientes al requerimiento; (ii) de forma inmediata por incumplimiento grave, riesgo de
        seguridad, requerimiento de autoridad o conducta ilícita; o (iii) sin causa, mediante aviso con treinta días
        naturales de anticipación, reembolsando la parte proporcional no devengada.
      </Clause>
      <Clause n="20.4">Recuperación de información.</Clause>
      <Clause>
        DURANTE LOS [NÚMERO] DÍAS NATURALES SIGUIENTES A LA TERMINACIÓN, EL CLIENTE PODRÁ EXPORTAR SU CONTENIDO EN LOS
        FORMATOS QUE LA PLATAFORMA SOPORTE. VENCIDO DICHO PLAZO, EL PRESTADOR PODRÁ ELIMINAR DEFINITIVA E
        IRREVERSIBLEMENTE LA TOTALIDAD DEL CONTENIDO, SIN RESPONSABILIDAD Y SIN OBLIGACIÓN DE CONSERVAR COPIA.
      </Clause>
      <Clause n="20.5">
        Supervivencia. Sobrevivirán las cláusulas de definiciones, propiedad intelectual, confidencialidad, exclusión
        de garantías, limitación de responsabilidad, indemnización, ley aplicable y jurisdicción, así como toda
        obligación de pago devengada.
      </Clause>

      <H2 n="21">MODIFICACIONES A LOS TÉRMINOS</H2>
      <Clause n="21.1">
        Facultad de modificación. El Prestador podrá modificar estos Términos. Las modificaciones se publicarán
        indicando la fecha de la nueva versión y, tratándose de cambios sustanciales que afecten derechos del Cliente,
        se notificarán con al menos quince días naturales de anticipación por correo electrónico o aviso dentro de la
        Plataforma.
      </Clause>
      <Clause n="21.2">
        Aceptación tácita. El uso continuado con posterioridad a la entrada en vigor constituye aceptación. Si el
        Cliente no está conforme, su único remedio es terminar el contrato antes de dicha fecha.
      </Clause>

      <H2 n="22">DISPOSICIONES GENERALES</H2>
      <Clause n="22.1">
        Cesión. El Cliente no podrá ceder este contrato sin autorización previa y por escrito del Prestador. El
        Prestador podrá cederlo libremente, incluso por fusión, escisión, reestructuración o venta de activos.
      </Clause>
      <Clause n="22.2">
        Ausencia de relación laboral o societaria. Nada crea relación laboral, de asociación, franquicia, agencia,
        mandato ni sociedad entre las partes. Cada parte responde de sus propias obligaciones laborales y de
        seguridad social.
      </Clause>
      <Clause n="22.3">
        Notificaciones. Las notificaciones al Cliente se practicarán válidamente al correo electrónico registrado en
        su Cuenta, surtiendo efectos al día hábil siguiente a su envío. Las notificaciones al Prestador deberán
        dirigirse a med@zentrolabs.com y, cuando se requiera constancia, al domicilio señalado en la portada. Es
        obligación del Cliente mantener actualizado su correo.
      </Clause>
      <Clause n="22.4">
        Divisibilidad. Si alguna cláusula fuere declarada nula, ilegal o inejecutable, ello no afectará la validez de
        las restantes, y la disposición afectada se interpretará en el sentido más próximo a la intención original
        dentro de los límites legales.
      </Clause>
      <Clause n="22.5">
        No renuncia. La tolerancia o el retraso en el ejercicio de un derecho no implica su renuncia ni impide su
        ejercicio posterior.
      </Clause>
      <Clause n="22.6">
        Acuerdo íntegro. Este documento y sus anexos constituyen el acuerdo total entre las partes y dejan sin efecto
        cualquier propuesta, cotización, presentación comercial o comunicación previa, verbal o escrita.
      </Clause>
      <Clause n="22.7">Idioma. La versión en español es la única vinculante. Cualquier traducción se proporciona por conveniencia.</Clause>
      <Clause n="22.8">Encabezados. Los títulos se incluyen para facilitar la lectura y no afectan la interpretación.</Clause>

      <H2 n="23">LEY APLICABLE Y JURISDICCIÓN</H2>
      <Clause n="23.1">Ley aplicable. Este contrato se rige por las leyes federales de los Estados Unidos Mexicanos.</Clause>
      <Clause n="23.2">
        Solución previa. Las partes procurarán resolver de buena fe cualquier controversia mediante negociación
        directa durante treinta días naturales contados desde la notificación escrita de la controversia.
      </Clause>
      <Clause n="23.3">
        Jurisdicción. Agotado lo anterior, las partes se someten expresamente a la jurisdicción de los tribunales
        competentes de Tlalnepantla de Baz, Estado de México, o de la Ciudad de México, a elección del Prestador,
        renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros
        o por cualquier otra causa.
      </Clause>
      <Clause n="23.4">
        Clientes ubicados fuera de México. Cuando la legislación imperativa del domicilio del Cliente, en particular
        la normativa de protección al consumidor o de protección de datos de su país, otorgue derechos irrenunciables,
        estos prevalecerán únicamente en la medida estrictamente necesaria, subsistiendo el resto del clausulado.
      </Clause>
      <Clause n="23.5">
        Renuncia a acciones colectivas. En la máxima medida permitida por la ley, las controversias se resolverán de
        forma individual, renunciando las partes a promover o participar en acciones colectivas o de grupo.
      </Clause>

      <H2 n="">CONSTANCIA DE ACEPTACIÓN</H2>
      <p className="mb-4 text-justify text-[13px] font-semibold italic leading-relaxed text-foreground">
        El Cliente manifiesta que ha leído íntegramente el presente documento, que ha tenido oportunidad razonable de
        revisarlo con asesoría propia, que comprende su alcance y consecuencias jurídicas, y que acepta de manera
        expresa e informada la totalidad de sus cláusulas, en especial las relativas a que Zentro Med no es un sistema
        de expediente clínico ni de facturación fiscal, la declaración de no certificación regulatoria, la exclusión
        de garantías, la limitación de responsabilidad, la obligación de indemnizar y la jurisdicción convenida.
      </p>

      <div className="mt-6 grid gap-4 rounded-lg border border-border p-4 text-[13px] italic text-foreground sm:grid-cols-2">
        <div>
          <p className="font-semibold not-italic">EL PRESTADOR</p>
          <p>Servicios Empresariales Crear México, S.A.S. de C.V.</p>
          <p>RFC: SEC170704L68</p>
          <p className="text-xs text-muted-foreground">Representante legal: [NOMBRE]</p>
        </div>
        <div>
          <p className="font-semibold not-italic">EL CLIENTE</p>
          <p>Denominación: ______________________</p>
          <p>RFC / NIT: __________________________</p>
          <p className="text-xs text-muted-foreground">Representante legal: [NOMBRE]</p>
        </div>
      </div>

      <p className="mt-6 text-justify text-xs italic text-muted-foreground">
        Cuando la aceptación se realice por medios electrónicos, el registro del acto —incluyendo fecha, hora,
        dirección IP, identificador de sesión y versión del documento aceptada— hará prueba plena de la manifestación
        de voluntad, en términos del artículo 89 y demás relativos del Código de Comercio.
      </p>
    </article>
  );
}
