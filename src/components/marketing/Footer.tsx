"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "@/lib/translations";

export function Footer() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const updateLang = () => {
      setLang(localStorage.getItem("language") || "en");
    };
    updateLang();
    window.addEventListener("language-change", updateLang);
    return () => window.removeEventListener("language-change", updateLang);
  }, []);

  const t = getTranslations(lang);

  return (
    <footer className="bg-white border-t border-gray-100" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-surface-dark">OnPace</span>
            </Link>
            <p className="text-sm leading-6 text-gray-600 max-w-xs">
              {lang === "zh" ? "面向学生的优质智能高效备战复习工作台。远离拖延，重夺生活掌控权。" : 
               lang === "es" ? "La plataforma premium de productividad de estudio para estudiantes. Deja de procrastinar y recupera tu vida." : 
               lang === "tr" ? "Öğrenciler için birinci sınıf çalışma verimliliği platformu. Ertelemeyi bırakın ve hayatınızı geri kazanın." : 
               "The premium study productivity platform for students. Stop procrastinating and get your life back."}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">
                  {lang === "zh" ? "产品服务" : lang === "es" ? "Producto" : lang === "tr" ? "Ürün" : "Product"}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#features" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {t.marketing?.navFeatures || "Features"}
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {t.marketing?.navPricing || "Pricing"}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">
                  {lang === "zh" ? "客户服务" : lang === "es" ? "Soporte" : lang === "tr" ? "Destek" : "Support"}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "帮助中心" : lang === "es" ? "Centro de Ayuda" : lang === "tr" ? "Yardım Merkezi" : "Help Center"}
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "联系我们" : lang === "es" ? "Contacto" : lang === "tr" ? "İletişim" : "Contact"}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">
                  {lang === "zh" ? "企业信息" : lang === "es" ? "Compañía" : lang === "tr" ? "Şirket" : "Company"}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "关于我们" : lang === "es" ? "Acerca de" : lang === "tr" ? "Hakkımızda" : "About"}
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "官方博客" : lang === "es" ? "Blog" : lang === "tr" ? "Blog" : "Blog"}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-surface-dark">
                  {lang === "zh" ? "合规法律" : lang === "es" ? "Legal" : lang === "tr" ? "Yasal" : "Legal"}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={`/privacy?lang=${lang}`} className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "隐私政策" : lang === "es" ? "Política de Privacidad" : lang === "tr" ? "Gizlilik Politikası" : "Privacy Policy"}
                    </Link>
                  </li>
                  <li>
                    <Link href={`/terms?lang=${lang}`} className="text-sm leading-6 text-gray-600 hover:text-brand transition-colors">
                      {lang === "zh" ? "服务条款" : lang === "es" ? "Términos de Servicio" : lang === "tr" ? "Kullanım Şartları" : "Terms of Service"}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-gray-900/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} OnPace. {t.marketing?.footerText || "All rights reserved."}</p>
        </div>
      </div>
    </footer>
  );
}
