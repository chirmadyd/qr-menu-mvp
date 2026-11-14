import { notFound } from "next/navigation";
import { languages } from "@/lib/menu";
import { getMenu } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function PublicMenu({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang } = await searchParams;
  const menu = await getMenu(id);
  if (!menu) notFound();
  const available = languages.filter(({ code }) => menu.languages.includes(code));
  const active = available.find(({ code }) => code === lang) ?? available[0];
  return (
    <main className="public-menu" lang={active.html}>
      <h1>{menu.title}</h1>
      <nav className="public-languages" aria-label="Menu languages">
        {available.map(({ code, native, html }) => (
          <a key={code} href={`?lang=${code}`} lang={html} aria-current={code === active.code ? "page" : undefined}>{native}</a>
        ))}
      </nav>
      <img src={`/m/${id}/image/${active.code}`} alt={menu.title} />
    </main>
  );
}
