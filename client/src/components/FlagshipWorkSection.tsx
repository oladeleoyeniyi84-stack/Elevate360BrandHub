// Phase 72.6 — Homepage flagship work & collaborations showcase.
// Renders only homepageFeatured records (public boundary applied, max 6) from
// the shared configuration, and links to the full /work portfolio.

import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getHomepageProjects, type FlagshipProject } from "@shared/flagshipProjects";
import { trackWorkEvent } from "@/lib/workAnalytics";

function statusBadgeClass(status: FlagshipProject["status"]): string {
  switch (status) {
    case "Live":
    case "Completed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "In Development":
    case "Active":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    default:
      return "bg-[#F4A62A]/15 text-[#F4A62A] border-[#F4A62A]/30";
  }
}

function ProjectCard({ project, sourcePage }: { project: FlagshipProject; sourcePage: string }) {
  const external = Boolean(project.externalUrl && project.ctaRoute.startsWith("http"));
  const onCta = () =>
    trackWorkEvent("work_project_cta_click", {
      projectId: project.id,
      projectCategory: project.category,
      projectStatus: project.status,
      sourcePage,
      targetRoute: project.ctaRoute,
    });

  const cta = external ? (
    <a
      href={project.ctaRoute}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onCta}
      data-testid={`link-work-cta-${project.id}`}
      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#F4A62A] hover:text-[#ffb84d] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F4A62A] rounded-lg"
    >
      {project.ctaLabel} <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  ) : (
    <Link
      href={project.ctaRoute}
      onClick={onCta}
      data-testid={`link-work-cta-${project.id}`}
      className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#F4A62A] hover:text-[#ffb84d] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F4A62A] rounded-lg"
    >
      {project.ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );

  return (
    <article
      data-testid={`card-flagship-${project.id}`}
      className="flex flex-col rounded-2xl border border-white/8 bg-white/3 p-6 transition-colors hover:border-[#F4A62A]/30 motion-safe:transition-colors"
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1 ${statusBadgeClass(project.status)}`}>
          {project.status}
        </span>
        {project.startDateLabel && (
          <span className="text-white/40 text-[11px]">{project.startDateLabel}</span>
        )}
      </div>
      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1.5">{project.category}</p>
      <h3 className="text-white font-bold text-lg leading-snug mb-2">{project.title}</h3>
      <p className="text-white/55 text-sm leading-relaxed mb-4">{project.summary}</p>
      {project.capabilities.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-5" aria-label={`${project.shortTitle} capabilities`}>
          {project.capabilities.slice(0, 5).map((c) => (
            <li key={c} className="text-white/50 text-[11px] bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">{cta}</div>
    </article>
  );
}

export default function FlagshipWorkSection() {
  const projects = getHomepageProjects();
  const ref = useRef<HTMLElement | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !seen.current) {
        seen.current = true;
        trackWorkEvent("work_section_view", { sourcePage: "home" });
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="work" ref={ref} aria-labelledby="flagship-work-heading" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4 bg-[#F4A62A]/10 border border-[#F4A62A]/25 text-[#F4A62A]">
            Our Work
          </span>
          <h2 id="flagship-work-heading" className="text-3xl md:text-4xl font-black text-white mb-4" data-testid="heading-flagship-work">
            Flagship Work, Strategic Collaborations &amp; Current Initiatives
          </h2>
          <p className="text-white/55 max-w-3xl mx-auto leading-relaxed">
            Elevate360Official builds intelligent digital platforms, AI-enabled systems, strategic
            experiences, and growth infrastructure for businesses, nonprofits, communities,
            ministries, and purpose-driven leaders.
          </p>
          <p className="text-white/40 max-w-3xl mx-auto mt-2 text-sm">
            Explore selected projects we have delivered, collaborations we are supporting, and
            initiatives currently being developed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10" data-testid="grid-flagship-projects">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} sourcePage="home" />
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/work"
            onClick={() => trackWorkEvent("work_project_cta_click", { sourcePage: "home", targetRoute: "/work" })}
            data-testid="button-explore-work"
            className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
          >
            Explore Our Work <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/strategy-session"
            onClick={() => trackWorkEvent("consultation_cta_click", { sourcePage: "home", targetRoute: "/strategy-session" })}
            data-testid="button-start-project"
            className="btn-secondary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
          >
            Start a Project
          </Link>
        </div>
      </div>
    </section>
  );
}
