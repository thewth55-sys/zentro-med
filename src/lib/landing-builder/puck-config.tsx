import type { Config } from "@puckeditor/core";
import {
  Hero,
  ContactCTA,
  ServiceList,
  Testimonial,
  DoctorBio,
  Gallery,
  MapAddress,
  type HeroProps,
  type ContactCTAProps,
  type ServiceListProps,
  type TestimonialProps,
  type DoctorBioProps,
  type GalleryProps,
  type MapAddressProps,
} from "./blocks";

export interface LandingProps {
  Hero: HeroProps;
  ContactCTA: ContactCTAProps;
  ServiceList: ServiceListProps;
  Testimonial: TestimonialProps;
  DoctorBio: DoctorBioProps;
  Gallery: GalleryProps;
  MapAddress: MapAddressProps;
}

/**
 * Self-serve tier (Zentro Med / "solo CRM" plan and up): a doctor
 * builds their own page. Deliberately just 3 blocks — enough for a
 * one-page "who we are + how to reach us" site without the surface
 * area to produce something that looks broken or off-brand
 * unsupervised.
 */
export const basicConfig: Config<Pick<LandingProps, "Hero" | "ServiceList" | "ContactCTA">> = {
  components: { Hero, ServiceList, ContactCTA },
};

/**
 * Full tier: everything, used exclusively by Zentro's internal
 * design team from the platform-admin editor (see
 * /admin/accounts/[accountId]/landing) to fulfil the "Landing de
 * especialidad" line item on the Starter/Pro plans as a white-glove
 * service — clients on those plans don't get self-serve access to
 * this wider palette, staff builds it for them.
 */
export const fullConfig: Config<LandingProps> = {
  components: { Hero, ServiceList, ContactCTA, Testimonial, DoctorBio, Gallery, MapAddress },
};
