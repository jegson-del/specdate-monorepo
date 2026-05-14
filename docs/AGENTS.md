# Workspace Engineering Rules

- Keep backend controllers thin: validate requests, call services, and return responses.
- Put backend business logic, authorization decisions, query composition, and payload shaping in services.
- Keep frontend pages as composition boundaries only.
- Put frontend API calls in `src/lib`, reusable state/workflows in `src/hooks`, shared types in `src/types`, and rendering in focused components.
- Avoid bloated files, duplicated inline logic, and one-off patterns when a reusable service, hook, helper, or component fits the existing codebase.
- Build admin modules one feature at a time with clear routes, reusable components, and latest-first paginated data.
