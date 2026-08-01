import { notFound } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, ToolIcon } from "../../components/toolCategories";

export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ slug: cat.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <main className="min-h-screen tb-bg">
      <div className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm hover:underline transition-colors" style={{ color: "var(--color-text-secondary)" }}>
            ← Back to Toolbox
          </Link>
          <h1 className="mt-3 text-3xl tb-h1">{category.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {category.tools.length} {category.tools.length === 1 ? "tool" : "tools"} in this category.
          </p>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden tb-card">
            {category.tools.map((tool, i) => {
              const LinkComp = tool.external ? "a" : Link;
              return (
                <LinkComp
                  key={tool.href}
                  href={tool.href}
                  {...(tool.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-start gap-3 px-5 py-4 transition-colors tb-row-hover"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    <ToolIcon icon={tool.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{tool.name}</span>
                    {tool.description && (
                      <span className="block mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>{tool.description}</span>
                    )}
                  </span>
                </LinkComp>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
