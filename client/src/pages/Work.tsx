// Phase 72.6 — /work: public flagship work & collaborations portfolio.
// All content comes from the shared flagshipProjects configuration; the
// public boundary (confidential exclusion, approved limited-public copy,
// controlled statuses) is enforced there. Server-delivered SEO metadata and
// JSON-LD for this route live in server/seo/meta.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import {
  getPublicProjects,
  getProjectsBySection,
  getCurrentInitiatives,
  CONFIDENTIALITY_STATEMENT,
  WORK_FILTERS,
  type FlagshipProject,
  type WorkFilter,
} from "@shared/flagshipProjects";
import { trackWorkEvent } from "@/lib/workAnalytics";

const BG = "#0B1526";
const GOLD = "#F4A62A";

const PROCESS_STEPS = [
  { step: "Discover", copy: "Understand the mission, audience, constraints, and opportunity." },
  { step: "Design", copy: "Shape the experience, architecture, and content structure." },
  { step: "Build", copy: "Engineer the platform with security and quality discipline." },
  { step: "Review", copy: "Independent review of correctness, safety, and standards." },
  { step: "Deploy", copy: "Controlled release to production infrastructure." },
  { step: "Verify", copy: "Confirm real-world behavior in production." },
  { step: "Improve", copy: "Measure, learn, and iterate continuously." },
] as const;

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

function ProjectCard({ project }: { project: FlagshipProject }) {
  const external = Boolean(project.externalUrl && project.ctaRoute.startsWith("http"));
  const onCta = () =>
    trackWorkEvent("work_project_cta_click", {
      projectId: project.id,
      projectCategory: project.category,
      projectStatus: project.status,
      sourcePage: "work",
      targetRoute: project.ctaRoute,
    });

  return (
    <article
      data-testid={`card-work-${project.id}`}
      className="flex flex-col rounded-2xl border border-white/8 bg-white/3 p-6 transition-colors hover:border-[#F4A62A]/30"
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1 ${statusBadgeClass(project.status)}`}>
          {project.status}
        </span>
        {project.startDateLabel && <span className="text-white/40 text-[11px]">{project.startDateLabel}</span>}
        {project.collaborationType && (
          <span className="text-white/40 text-[11px] border border-white/10 rounded-full px-2 py-0.5">{project.collaborationType}</span>
        )}
      </div>
      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1.5">{project.category}</p>
      <h3 className="text-white font-bold text-xl leading-snug mb-3">{project.title}</h3>
      <p className="text-white/55 text-sm leading-relaxed mb-4">{project.fullDescription}</p>
      {project.capabilities.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-4" aria-label={`${project.shortTitle} capabilities`}>
          {project.capabilities.slice(0, 5).map((c) => (
            <li key={c} className="text-white/50 text-[11px] bg-white/5 border border-white/10 rounded-full px-2.5 py-1">{c}</li>
          ))}
        </ul>
      )}
      {project.governanceNote && (
        <p className="text-white/40 text-xs italic border-l-2 border-[#F4A62A]/40 pl-3 mb-4">{project.governanceNote}</p>
      )}
      {project.disclaimer && (
        <p className="text-white/35 text-xs leading-relaxed mb-4">{project.disclaimer}</p>
      )}
      <div className="mt-auto pt-2">
        {external ? (
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
        )}
      </div>
    </article>
  );
}

function InitiativeCard({ initiative: i }: { initiative: ReturnType<typeof getCurrentInitiatives>[number] }) {
  const ref = useRef<HTMLLIElement | null>(null);
  const seen = useRef(false);

  // One-shot view tracking — approved public metadata only, no PII.
  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !seen.current) {
        seen.current = true;
        trackWorkEvent("current_initiative_view", {
          projectId: i.projectId,
          projectStatus: i.project.status,
          sourcePage: "work",
        });
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [i.projectId, i.project.status]);

  return (
    <li
      ref={ref}
      data-testid={`initiative-${i.projectId}`}
      className="rounded-2xl border border-white/8 bg-white/3 p-6 grid md:grid-cols-[auto,1fr] gap-x-6 gap-y-2"
    >
      <div className="flex md:flex-col items-center md:items-start gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1 bg-[#F4A62A]/15 text-[#F4A62A] border-[#F4A62A]/30">
          {i.phase}
        </span>
        <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1 ${statusBadgeClass(i.project.status)}`}>
          {i.project.status}
        </span>
        <span className="text-white/35 text-[11px]">Updated {i.lastUpdatedLabel}</span>
      </div>
      <div>
        <h3 className="text-white font-bold text-lg">{i.project.title}</h3>
        <p className="text-white/55 text-sm mt-1"><span className="text-white/35">Current focus:</span> {i.focus}</p>
        <p className="text-white/55 text-sm mt-1"><span className="text-white/35">Next public milestone:</span> {i.nextMilestone}</p>
        <p className="text-white/40 text-xs mt-2">{i.collaborationType}</p>
      </div>
    </li>
  );
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="mb-10">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4 bg-[#F4A62A]/10 border border-[#F4A62A]/25 text-[#F4A62A]">
        {eyebrow}
      </span>
      <h2 id={id} className="text-2xl md:text-3xl font-black text-white">{title}</h2>
    </div>
  );
}

export default function Work() {
  const [filter, setFilter] = useState<WorkFilter>("All");
  const viewed = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!viewed.current) {
      viewed.current = true;
      trackWorkEvent("work_project_view", { sourcePage: "work" });
    }
  }, []);

  const allProjects = getPublicProjects();
  const filtered = useMemo(() => {
    if (filter === "All") return allProjects;
    return allProjects.filter((p) => p.filters.includes(filter as Exclude<WorkFilter, "All">));
  }, [filter, allProjects]);
  const filtering = filter !== "All";

  const featured = getProjectsBySection("featured");
  const collaborations = getProjectsBySection("collaborations");
  const creative = getProjectsBySection("creative");
  const initiatives = getCurrentInitiatives();

  const onFilter = (f: WorkFilter) => {
    setFilter(f);
    trackWorkEvent("work_filter_used", { sourcePage: "work", filter: f });
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Hero */}
      <header className="pt-10 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            data-testid="link-work-home"
            className="inline-flex min-h-[44px] items-center gap-2 text-white/50 hover:text-white text-sm mb-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F4A62A] rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Elevate360Official
          </Link>
          <span className="block">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-5 bg-[#F4A62A]/10 border border-[#F4A62A]/25 text-[#F4A62A]">
              Our Work
            </span>
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-4xl" data-testid="heading-work-hero">
            Technology, Strategy and Creativity Built for Real-World Impact
          </h1>
          <p className="text-white/55 max-w-3xl mt-5 leading-relaxed">
            From intelligent websites and analytics systems to nonprofit transformation, private
            event platforms, AI strategy, publishing, and business automation, Elevate360Official
            turns ideas into secure, practical, and scalable digital experiences.
          </p>
          <div className="flex items-center gap-4 flex-wrap mt-8">
            <Link
              href="/strategy-session"
              onClick={() => trackWorkEvent("consultation_cta_click", { sourcePage: "work", targetRoute: "/strategy-session" })}
              data-testid="button-work-discuss"
              className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
            >
              Discuss Your Project
            </Link>
            <a
              href="#featured-platforms"
              data-testid="button-work-explore-featured"
              className="btn-secondary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
            >
              Explore Featured Work
            </a>
          </div>
        </div>
      </header>

      <main className="px-4 pb-24">
        <div className="max-w-6xl mx-auto space-y-24">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter projects">
            {WORK_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => onFilter(f)}
                data-testid={`filter-work-${f.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                aria-pressed={filter === f}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F4A62A] ${
                  filter === f ? "text-black" : "text-white/60 bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
                style={filter === f ? { background: GOLD } : undefined}
              >
                {f}
              </button>
            ))}
          </div>

          {filtering ? (
            <section aria-labelledby="filtered-heading">
              <SectionHeading eyebrow="Filtered" title={filter} id="filtered-heading" />
              {filtered.length === 0 ? (
                <p className="text-white/40" data-testid="text-work-no-matches">No projects match this filter yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="grid-work-filtered">
                  {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* 1. Featured Platforms */}
              <section aria-labelledby="featured-heading" id="featured-platforms">
                <SectionHeading eyebrow="Featured Platforms" title="Flagship Platforms We Have Built" id="featured-heading" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featured.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </section>

              {/* 2. Strategic Collaborations */}
              <section aria-labelledby="collab-heading">
                <SectionHeading eyebrow="Strategic Collaborations" title="Collaborations & Advisory Work" id="collab-heading" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {collaborations.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/3 p-6 flex items-start gap-4" data-testid="panel-confidentiality">
                  <ShieldCheck className="h-6 w-6 shrink-0 mt-0.5" style={{ color: GOLD }} aria-hidden="true" />
                  <p className="text-white/50 text-sm leading-relaxed">{CONFIDENTIALITY_STATEMENT}</p>
                </div>
              </section>

              {/* 3. Current Initiatives */}
              <section aria-labelledby="initiatives-heading">
                <SectionHeading eyebrow="Current Initiatives" title="What We’re Building Now" id="initiatives-heading" />
                <p className="text-white/45 text-sm mb-8 -mt-6 max-w-3xl">
                  Selected initiatives currently moving through strategy, design, engineering,
                  review, deployment, or collaboration.
                </p>
                <ol className="space-y-4" data-testid="list-current-initiatives">
                  {initiatives.map((i) => (
                    <InitiativeCard key={i.projectId} initiative={i} />
                  ))}
                </ol>
              </section>

              {/* 4. Creative and Personal Experiences */}
              <section aria-labelledby="creative-heading">
                <SectionHeading eyebrow="Creative Experiences" title="Creative and Personal Experiences" id="creative-heading" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {creative.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </section>

              {/* 5. How We Work */}
              <section aria-labelledby="process-heading">
                <SectionHeading eyebrow="How We Work" title="From Vision to Verified Production" id="process-heading" />
                <p className="text-white/45 text-sm mb-8 -mt-6 max-w-3xl">
                  Every project moves through structured planning, engineering, review, deployment,
                  production verification, and continuous improvement.
                </p>
                <ol className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4" data-testid="list-process-steps">
                  {PROCESS_STEPS.map((s, idx) => (
                    <li key={s.step} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                      <span className="text-[#F4A62A] font-black text-lg" aria-hidden="true">{idx + 1}</span>
                      <h3 className="text-white font-bold text-sm mt-1">{s.step}</h3>
                      <p className="text-white/45 text-xs mt-1 leading-relaxed">{s.copy}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {/* 6. Start a Project */}
              <section aria-labelledby="cta-heading" className="text-center rounded-3xl border border-[#F4A62A]/20 bg-[#F4A62A]/5 py-16 px-6">
                <h2 id="cta-heading" className="text-2xl md:text-4xl font-black text-white mb-4" data-testid="heading-work-cta">
                  Let’s Build What Your Organization Needs Next
                </h2>
                <p className="text-white/55 max-w-3xl mx-auto leading-relaxed mb-8">
                  Whether you need an intelligent website, AI strategy, operational automation,
                  analytics infrastructure, digital transformation support, or a custom experience,
                  Elevate360Official can help move the idea from strategy to verified production.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Link
                    href="/strategy-session"
                    onClick={() => trackWorkEvent("consultation_cta_click", { sourcePage: "work", targetRoute: "/strategy-session" })}
                    data-testid="button-work-start-session"
                    className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
                  >
                    Start a Strategy Session
                  </Link>
                  <Link
                    href="/#contact"
                    data-testid="button-work-contact"
                    className="btn-secondary inline-flex min-h-[44px] items-center gap-2 px-8 py-3"
                  >
                    Contact Elevate360Official
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
