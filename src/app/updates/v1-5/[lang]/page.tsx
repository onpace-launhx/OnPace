import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UpdateReleasePage } from "@/components/public/UpdateReleasePage";
import {
  isUpdateLanguage,
  RELEASE_V1_5,
  UPDATE_LANGUAGES,
  type UpdateLanguage,
} from "@/lib/update-release-v1-5";

type Props = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return UPDATE_LANGUAGES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isUpdateLanguage(lang)) return {};
  const copy = RELEASE_V1_5[lang];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    applicationName: "OnPace",
    alternates: {
      canonical: `/updates/v1-5/${lang}`,
      languages: Object.fromEntries(UPDATE_LANGUAGES.map((item) => [item, `/updates/v1-5/${item}`])),
    },
    openGraph: {
      type: "article",
      siteName: "OnPace",
      title: `${copy.metaTitle} | OnPace`,
      description: copy.metaDescription,
      locale: copy.locale.replace("-", "_"),
    },
    robots: { index: true, follow: true },
  };
}

export default async function VersionOneFiveUpdatePage({ params }: Props) {
  const { lang } = await params;
  if (!isUpdateLanguage(lang)) notFound();
  return <UpdateReleasePage language={lang as UpdateLanguage} />;
}
