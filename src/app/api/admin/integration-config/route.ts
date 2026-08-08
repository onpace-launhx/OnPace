import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function localizeIntegrationError(message: string) {
  const knownErrors: Record<string, string> = {
    "Configure and verify a payment provider before enabling real payments.":
      "Gerçek ödemeleri açmadan önce bir ödeme sağlayıcısı yapılandırılmalı ve doğrulanmalıdır.",
    "Payment links must be valid HTTPS EshipX URLs.":
      "Ödeme bağlantıları geçerli HTTPS eShipX adresleri olmalıdır.",
    "Add at least one valid EshipX payment link before enabling payments.":
      "Ödemeleri açmadan önce en az bir geçerli eShipX ödeme bağlantısı girin.",
    "Every package name is required in all four languages.":
      "Her paket adı dört dilde de eksiksiz girilmelidir.",
    Unauthorized: "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.",
    Forbidden: "Bu ayarı değiştirmek için yetkiniz bulunmuyor.",
    "R2 storage is not configured":
      "R2 depolama yapılandırması henüz tamamlanmamış.",
  };

  if (/Requested function was not found|Function not found/i.test(message)) {
    return "Bu servis işlevi henüz yayınlanmamış. Toplu yayın sırasında gerekli Supabase Function da yayınlanmalıdır.";
  }

  return knownErrors[message] || message;
}

async function readFunctionError(error: unknown) {
  const fallback =
    error instanceof Error
      ? error.message
      : "Integration settings could not be saved.";

  if (!error || typeof error !== "object" || !("context" in error)) {
    return { message: localizeIntegrationError(fallback), status: 502 };
  }

  const context = error.context;
  if (!(context instanceof Response)) {
    return { message: localizeIntegrationError(fallback), status: 502 };
  }

  const payload = await context
    .clone()
    .json()
    .catch(() => null) as { error?: unknown; message?: unknown } | null;
  const message =
    typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.message === "string"
        ? payload.message
        : fallback;

  return {
    message: localizeIntegrationError(message),
    status: context.status >= 400 ? context.status : 502,
  };
}

async function invokeIntegrationConfig(body: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data, error } = await supabase.functions.invoke(
    "integration-config",
    { body }
  );

  if (error) {
    const functionError = await readFunctionError(error);
    return NextResponse.json(
      { error: functionError.message },
      { status: functionError.status }
    );
  }

  if (data?.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json(data ?? {});
}

export async function GET() {
  return invokeIntegrationConfig({ action: "status" });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Geçersiz ayar isteği." },
        { status: 400 }
      );
    }

    return invokeIntegrationConfig(payload as Record<string, unknown>);
  } catch {
    return NextResponse.json(
      { error: "Ayar isteği okunamadı." },
      { status: 400 }
    );
  }
}
