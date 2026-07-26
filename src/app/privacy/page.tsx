import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/public/LegalDocumentPage";
import {
  normalizeLegalDocuments,
  type LegalLanguage,
} from "@/lib/legal-documents";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Privacy Policy | OnPace",
  description: "OnPace Privacy Policy and information about data processing.",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const requestedLanguage = (await searchParams).lang;
  const candidate = Array.isArray(requestedLanguage)
    ? requestedLanguage[0]
    : requestedLanguage;
  const language: LegalLanguage = ["en", "tr", "es", "zh"].includes(candidate || "")
    ? candidate as LegalLanguage
    : "en";
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("get_public_system_settings");
  const settings = Array.isArray(rows) ? rows[0] : rows;
  const documents = normalizeLegalDocuments(settings?.legal_documents);

  return (
    <LegalDocumentPage
      type="privacy"
      language={language}
      document={documents.privacy[language]}
    />
  );
}
