import { Link } from "@tanstack/react-router";
import { ShoppingBag, Github, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/60 bg-gradient-to-b from-amber-50/20 via-background to-amber-50/60 dark:from-amber-950/10 dark:via-background dark:to-amber-950/30 overflow-hidden">
      {/* Warm gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-primary-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">
                Campus<span className="text-brand-gradient">Kart</span>
              </span>
              <span className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                MGM
              </span>
            </div>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The trusted marketplace built exclusively for verified MGM College students. Buy, sell,
            rent, exchange — all within your campus community.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="https://www.instagram.com/campuskart.business?stkn=MWx0Nms4c2piaGFhaA=="
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-amber-500/15 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:border-pink-500/60 hover:shadow-sm"
              aria-label="CampusKart Instagram"
            >
              <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white">
                <Instagram className="h-3 w-3" />
              </div>
              <span>@campuskart.business</span>
              <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-700 dark:text-pink-300">
                +50 pts
              </span>
            </a>
            <div className="flex gap-2 text-muted-foreground">
              <a
                href="#"
                className="rounded-full border border-border p-2 transition hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="rounded-full border border-border p-2 transition hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {[
          {
            title: "Product",
            links: ["Marketplace", "How it works", "AI pricing", "Trust & safety"],
          },
          { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
          { title: "Legal", links: ["Terms", "Privacy", "Cookies", "Guidelines"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} CampusKart. Built for students, by students.</span>
          <span>Made with care · v1.0</span>
        </div>
      </div>
    </footer>
  );
}
