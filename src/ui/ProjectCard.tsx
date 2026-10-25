/**
 * PROJECT CARD — reusable, typed.
 *
 * Entries are plain data objects (see the projects array in Projects.tsx);
 * adding a real project later only means appending an object, never rewriting
 * the card. For projects without a published destination the card renders no
 * link; without an image it renders a CSS-built abstract browser-window
 * illustration (aria-hidden) so nothing can be mistaken for a real screenshot.
 */

export type ProjectStatus = 'Concept' | 'In development'

export type Project = {
  id: string
  title: string
  category: string
  description: string
  /** Honest descriptors only — never claim a stack a project does not use. */
  tags: string[]
  status?: ProjectStatus
  /** Optional real screenshot / visual. Without it the abstract art is shown. */
  image?: string
  /** Meaningful alt text, required whenever an image is provided. */
  imageAlt?: string
  /** Optional published destination for the project. */
  href?: string
}

export function ProjectCard({ project }: { project: Project }) {
  const titleId = `project-title-${project.id}`

  return (
    <article className="project-card" aria-labelledby={titleId}>
      <div className="project-card__media">
        {project.image ? (
          <img
            className="project-card__img"
            src={project.image}
            alt={project.imageAlt ?? ''}
            loading="lazy"
            decoding="async"
          />
        ) : (
          /* Decorative, entirely CSS — an abstract browser-window wireframe,
             never a fake screenshot. */
          <div className="project-card__art" aria-hidden="true">
            <div className="project-card__browser">
              <div className="project-card__browser-bar">
                <span className="project-card__browser-dot" />
                <span className="project-card__browser-dot project-card__browser-dot--mint" />
                <span className="project-card__browser-dot" />
                <span className="project-card__browser-addr" />
              </div>
              <div className="project-card__browser-body">
                <span className="project-card__skel project-card__skel--head" />
                <span className="project-card__skel project-card__skel--w-80" />
                <span className="project-card__skel project-card__skel--w-60" />
                <span className="project-card__skel project-card__skel--w-45" />
                <span className="project-card__art-block" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__meta">
          <span className="project-card__category">{project.category}</span>
          {project.status && (
            <span className="project-card__status">{project.status}</span>
          )}
        </div>

        <h3 className="project-card__title" id={titleId}>
          {project.title}
        </h3>

        <p className="project-card__desc">{project.description}</p>

        {project.tags.length > 0 && (
          <ul className="project-card__tags" aria-label="Technologies">
            {project.tags.map((tag) => (
              <li key={tag} className="project-card__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}

        {project.href && (
          <a className="project-card__link" href={project.href}>
            <span>View project</span>
            <svg
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M3.25 8.75 8.75 3.25M4.5 3.25h4.25V7.5"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="square"
              />
            </svg>
          </a>
        )}
      </div>
    </article>
  )
}