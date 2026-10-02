# AI prompts

The prompts given to the AI assistant (Claude Code, Claude Opus 5.5) while building this project, in order.

## 1. Initial request

> I am working on this directory, I already have the c&c diagram, as well as the deployment view. What I need to do is the following:

Followed by the full assignment brief, reproduced in [`assignment.md`](assignment.md).

## 2. Clarifying questions and answers

Before writing code, the assistant read the Excalidraw diagrams in `Diagram_calculator/` and asked four questions:

| Question | Answer |
| --- | --- |
| The repo root is a Next.js scaffold. Which React + TypeScript setup should the frontend use? | **Vite + React**: replace the Next.js scaffold. |
| The C&C diagram has separate `browser-frontend-service` and `mobile-frontend-service`. How should they differ? | **Two separate apps** (`frontend/browser`, `frontend/mobile`). |
| Go isn't installed. How should the Go services be built and tested? | **Install Go via winget.** |
| Should the assistant commit as it goes? | **No commits.** Leave instructions; I will run all the tests and make the commits myself. |

<!-- Add any further prompts you use below. -->
