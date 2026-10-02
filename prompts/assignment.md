# Assignment brief (given verbatim to the AI assistant)

You are a full-stack software engineer tasked with building a production-ready calculator application. Your goal is to deliver a complete, well-architected solution that demonstrates clean code, testable design, and professional deployment readiness.

**Core Objective**

Build a full-stack calculator with a React frontend and a Go backend microservice. The frontend consumes the backend REST API to perform arithmetic operations. Prioritize clean architecture, maintainability, and comprehensive test coverage over feature expansion.

**Functional Requirements**

Frontend (React with TypeScript):
- Intuitive, responsive UI for entering operands and selecting operations
- Input validation with clear error messaging
- Display calculation results or errors appropriately
- Mobile-responsive design (tested on at least one mobile breakpoint)
- Operations: Addition, subtraction, multiplication, division (required); exponentiation, square root, percentage (optional)

Backend (Go REST API):
- Endpoints for each arithmetic operation (one endpoint per operation or a single flexible endpoint—your choice, but document it)
- Input validation and graceful error handling (division by zero, invalid types, malformed requests)
- Return all responses in JSON format with consistent structure (result, error, metadata as appropriate)
- Operations: Addition, subtraction, multiplication, division (required); exponentiation, square root, percentage (optional)

**Non-Functional Requirements**

- **Code Quality**: Clean, readable, idiomatic code in both TypeScript/React and Go; follow community standards (ESLint for frontend, `gofmt` for backend)
- **Testing**: Unit tests for all critical logic in both layers; aim for meaningful coverage (not 100%, but sufficient to catch regressions)
- **Documentation**: README must include setup instructions, how to run each service locally, example API calls (with curl or similar), and your design decisions/assumptions
- **Optional but Valued**: Dockerfile (or docker-compose) to run both services together in containers

**Technical Stack**

- Frontend: React with TypeScript
- Backend: Go
- Use any supporting libraries, frameworks, or tools you find appropriate

**Deliverables**

1. Git repository (GitHub, GitLab, or equivalent) containing:
   - Frontend code (React + TypeScript) in a `/frontend` or `/client` directory
   - Backend code (Go) in a `/backend` or `/server` directory
   - Root-level README
   - Unit tests for both frontend and backend
   - Optional: `Dockerfile` or `docker-compose.yml`

2. README must cover:
   - Prerequisites and setup instructions (Node version, Go version, etc.)
   - How to run the frontend locally
   - How to run the backend locally
   - Example REST API calls (show request and response)
   - Design decisions (why you chose certain patterns, libraries, or architectures)
   - Any assumptions you made

3. Test coverage report (or summary in the README showing which tests exist and what they cover)

4. (Optional) Screenshot or brief description of the UI

**Constraints and Guidance**

- **Scope**: You have approximately 2–4 hours. Prioritize correctness and clarity over extra features. A well-tested, simple solution is better than a feature-rich, untested one.
- **AI Tooling**: You may use any AI tools (ChatGPT, Claude, Copilot, etc.) to accelerate development, but ensure the final code is your own understanding and responsibility. If you use AI significantly, document which parts it helped with.
- **Code Ownership**: Even if you use AI tooling, review all code before committing. The solution should reflect your standards.

**What Success Looks Like**

- Frontend loads without errors, accepts input, calls the backend, and displays results
- Backend API validates inputs, handles edge cases (like division by zero), and returns correct results
- Code is organized logically with clear separation of concerns
- Tests exist and pass; they demonstrate understanding of what matters to test
- README is clear enough for someone else to clone and run it immediately
- Git history is reasonably clean (logical commits, not a single "initial commit")

**Submission**

1. Push all code to your Git repository
2. Share the repository link
3. Include any prompts you used with AI tools in the repository (e.g., in a `/prompts` directory or noted in the README)
4. Double-check that the README covers all setup and usage instructions before submitting
