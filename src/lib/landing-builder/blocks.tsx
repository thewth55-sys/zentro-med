import type { ComponentConfig } from "@puckeditor/core";

/**
 * The block catalog for the landing page builder. Kept as plain
 * Tailwind-styled React components (no per-landing theme system) —
 * every block reads the same `--primary` CSS variable the rest of
 * the app already uses (see globals.css), so a published page looks
 * on-brand without a color picker to build or maintain.
 */

export interface HeroProps {
  headline: string;
  subheadline?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaHref?: string;
}

export const Hero: ComponentConfig<HeroProps> = {
  fields: {
    headline: { type: "text", label: "Título" },
    subheadline: { type: "textarea", label: "Subtítulo" },
    imageUrl: { type: "text", label: "URL de imagen" },
    ctaText: { type: "text", label: "Texto del botón" },
    ctaHref: { type: "text", label: "Enlace del botón (WhatsApp o agenda)" },
  },
  defaultProps: {
    headline: "Bienvenido a nuestra clínica",
    subheadline: "Atención médica de calidad, cerca de ti.",
    ctaText: "Agendar cita",
    ctaHref: "#",
  },
  render: ({ headline, subheadline, imageUrl, ctaText, ctaHref }) => (
    <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary editor-supplied URL
        <img src={imageUrl} alt="" className="h-32 w-32 rounded-full object-cover" />
      ) : null}
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{headline}</h1>
      {subheadline ? <p className="max-w-xl text-lg text-muted-foreground">{subheadline}</p> : null}
      {ctaText && ctaHref ? (
        <a
          href={ctaHref}
          className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
        >
          {ctaText}
        </a>
      ) : null}
    </section>
  ),
};

export interface ContactCTAProps {
  heading?: string;
  whatsappNumber?: string;
  message?: string;
}

export const ContactCTA: ComponentConfig<ContactCTAProps> = {
  fields: {
    heading: { type: "text", label: "Título" },
    whatsappNumber: { type: "text", label: "Número de WhatsApp (con código de país)" },
    message: { type: "textarea", label: "Mensaje prellenado" },
  },
  defaultProps: {
    heading: "¿Tienes dudas? Escríbenos",
    message: "Hola, quisiera más información.",
  },
  render: ({ heading, whatsappNumber, message }) => {
    const href = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}${
          message ? `?text=${encodeURIComponent(message)}` : ""
        }`
      : null;
    return (
      <section className="flex flex-col items-center gap-4 bg-muted px-6 py-12 text-center">
        {heading ? <h2 className="text-2xl font-semibold text-foreground">{heading}</h2> : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Escríbenos por WhatsApp
          </a>
        ) : null}
      </section>
    );
  },
};

export interface ServiceListProps {
  title?: string;
  items: { name: string; description?: string }[];
}

export const ServiceList: ComponentConfig<ServiceListProps> = {
  fields: {
    title: { type: "text", label: "Título" },
    items: {
      type: "array",
      label: "Servicios",
      arrayFields: {
        name: { type: "text", label: "Nombre" },
        description: { type: "textarea", label: "Descripción" },
      },
      defaultItemProps: { name: "Servicio", description: "" },
    },
  },
  defaultProps: {
    title: "Nuestros servicios",
    items: [{ name: "Consulta general", description: "" }],
  },
  render: ({ title, items }) => (
    <section className="px-6 py-12">
      {title ? <h2 className="mb-6 text-center text-2xl font-semibold text-foreground">{title}</h2> : null}
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {(items ?? []).map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">{item.name}</p>
            {item.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  ),
};

export interface TestimonialProps {
  quote: string;
  author?: string;
}

export const Testimonial: ComponentConfig<TestimonialProps> = {
  fields: {
    quote: { type: "textarea", label: "Testimonio" },
    author: { type: "text", label: "Autor" },
  },
  defaultProps: {
    quote: "Excelente atención, muy recomendado.",
  },
  render: ({ quote, author }) => (
    <section className="mx-auto max-w-xl px-6 py-12 text-center">
      <p className="text-lg italic text-foreground">&ldquo;{quote}&rdquo;</p>
      {author ? <p className="mt-3 text-sm text-muted-foreground">— {author}</p> : null}
    </section>
  ),
};

export interface DoctorBioProps {
  name: string;
  title?: string;
  photoUrl?: string;
  bio?: string;
}

export const DoctorBio: ComponentConfig<DoctorBioProps> = {
  fields: {
    name: { type: "text", label: "Nombre" },
    title: { type: "text", label: "Título / especialidad" },
    photoUrl: { type: "text", label: "URL de foto" },
    bio: { type: "textarea", label: "Biografía" },
  },
  defaultProps: {
    name: "Dr. Nombre Apellido",
  },
  render: ({ name, title, photoUrl, bio }) => (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-12 text-center">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary editor-supplied URL
        <img src={photoUrl} alt="" className="h-28 w-28 rounded-full object-cover" />
      ) : null}
      <h3 className="text-xl font-semibold text-foreground">{name}</h3>
      {title ? <p className="text-sm text-primary">{title}</p> : null}
      {bio ? <p className="text-sm text-muted-foreground">{bio}</p> : null}
    </section>
  ),
};

export interface GalleryProps {
  images: { url: string }[];
}

export const Gallery: ComponentConfig<GalleryProps> = {
  fields: {
    images: {
      type: "array",
      label: "Imágenes",
      arrayFields: { url: { type: "text", label: "URL" } },
      defaultItemProps: { url: "" },
    },
  },
  defaultProps: { images: [] },
  render: ({ images }) => (
    <section className="grid grid-cols-2 gap-2 px-6 py-8 sm:grid-cols-3">
      {(images ?? []).map((img, i) =>
        img.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary editor-supplied URL
          <img key={i} src={img.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
        ) : null,
      )}
    </section>
  ),
};

export interface MapAddressProps {
  address: string;
  mapsUrl?: string;
}

export const MapAddress: ComponentConfig<MapAddressProps> = {
  fields: {
    address: { type: "textarea", label: "Dirección" },
    mapsUrl: { type: "text", label: "Enlace a Google Maps (opcional)" },
  },
  defaultProps: { address: "" },
  render: ({ address, mapsUrl }) => (
    <section className="mx-auto max-w-xl px-6 py-8 text-center">
      {address ? <p className="text-sm text-muted-foreground">{address}</p> : null}
      {address && mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
          Ver en Google Maps
        </a>
      ) : null}
    </section>
  ),
};
