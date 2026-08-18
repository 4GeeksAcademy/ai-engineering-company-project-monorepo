# Backend Architecture Proposal



## 🎯 Your challenge


You just completed the fourth milestone: your company's corporate site is deployed, structured, and managed with AI agents. Now the engineering team needs to take the next step - building the backend.

Before anyone writes a single line of code, your CTO wants the team to have shared architectural clarity. No one is starting to program without a common understanding of how the project should be organized. That's why they've asked you to draft the first version of the architecture document.

You've spent four milestones working with this company. You know the sector, the operations, the data it handles, its users, and the business-critical flows. And you've just learned that there's no universally correct architecture: the choice depends on the nature of the system and the needs of the business.

This is the moment to connect both things.

Your CTO sent you the following message on Slack:

> ### Message from your CTO
>
> Hey, before the team starts setting up the environment and the first endpoints, I need you to send me a document with your considerations on how we should structure the backend.
>
> No code yet. I need to understand your reasoning: what architectural pattern you're proposing, why it fits what we're building, how you'd organize the project's modules and domains, and what initial technical decisions you'd make.
>
> Base your analysis on what we know about the company and on what you've learned about backend architectures. If you spot any risks or points where the team might get confused, include those too.
>
> Before writing, I'd recommend looking into how FastAPI projects are typically structured and how applications are organized when the frontend and backend are separate systems. That will give you concrete context to back up your decisions.
>
> I need the document before the next sprint kicks off. A Markdown file is fine.

### What makes a good architecture proposal?

An architecture document is not a list of technologies. It's **documented technical reasoning**: it explains what, why, and anticipates consequences. A good architecture document allows any team member to understand the decisions made without needing to ask. At minimum it covers: the chosen pattern with its justification, the proposed folder and module structure, route and domain organization, and any identified risks or points of attention.

This is your opportunity to show that you know how to think through a system before building it.

---

## 🌱 How to Start the Project

This project does not start from a code template: the deliverable is a technical document that lives inside your existing transversal project.

1. Open your transversal project repository (the monorepo you've been building since Milestone 1)
2. Create the file `ARCHITECTURE_PROPOSAL.md` inside the repository's `/docs` directory
3. Write your proposal in that file

---

## 💻 What You Need to Do

- [ ] Create the `ARCHITECTURE_PROPOSAL.md` file inside your transversal project's `/docs` directory
- [ ] In the document, identify and justify the most suitable **architectural pattern** for your company (MVC, layered architecture, serverless, or other). The justification must be tied to your company's real characteristics, not to a generic preference
- [ ] Propose and describe the **folder and module structure** of the backend project, explaining the domain or responsibility separation criteria used
- [ ] Include a section on how you would organize **FastAPI endpoints and routers** according to the identified domains. No code is needed: just describe what routes would exist and under what grouping criteria
- [ ] Research how FastAPI projects are typically structured (folder conventions, router separation, models, and configuration) and document in the proposal how that standard structure influences your decisions
- [ ] Research how applications are organized when frontend and backend are separate systems (repo separation or monorepo, API communication, environment variables, CORS) and reflect those considerations in the document
- [ ] Include a **risks and points of attention** section with at least two considerations about what could go wrong if the team doesn't follow the proposed structure

> ⚠️ **IMPORTANT:** The deliverable for this project is a Markdown document, not functional code. Whether FastAPI is installed or the project runs will not be evaluated. What will be evaluated is the quality of the documented technical reasoning.

---

## ✅ What We Will Evaluate

- [ ] The chosen architectural pattern is justified with arguments linked to the nature of the business and the system, not by generic preference
- [ ] The proposed folder structure is consistent with the chosen pattern and reflects a clear separation of responsibilities or domains
- [ ] The router and endpoint organization is recognizable as a valid FastAPI application (routes grouped by domain, not all in a single file)
- [ ] The documented technical decisions are concrete, justified, and do not contradict course content
- [ ] The proposal reflects actual research into the standard structure of FastAPI projects: the identified conventions are present in the proposed structure and their source is explicitly mentioned
- [ ] The document addresses how frontend and backend coexist as separate systems: at minimum, the implications for API communication and CORS or environment variable management are identified

> Note: No frameworks, libraries, or tools beyond what has been covered in the course to this point will be evaluated.

---

## 📦 How to Submit

Push the repository to GitHub and share the link according to your instructor's instructions.

---

