# Brasaland Website (Milestone 1)

Public-facing website for Brasaland with:

- Landing page (`index.html`)
- Application/sign-up page (`application.html`)
- Client-side validation logic (`validation.js`)
- Manual function tester page (`testing.html`, `testing.js`)

## Requirements Covered

- Semantic HTML5 layout and navigation
- Mobile-first responsive design with Tailwind CSS
- Accessibility basics (labels, landmarks, fieldset/legend, ARIA live regions, focus styles)
- SEO basics (title, description, keywords)
- Schema.org structured data on landing page
- Full JavaScript validation with clear field-level errors
- Simulated successful submission when all fields are valid

## Run Locally (Codespaces compatible)

From this folder:

```bash
cd uis/website
npx http-server . -p 3000 -a 0.0.0.0
```

Then open the URL shown by `http-server`.

Pages:

- `http://localhost:3000/index.html`
- `http://localhost:3000/application.html`
- `http://localhost:3000/testing.html`

## Notes

- Form field names and IDs align with entities defined in `CONTEXT.md` (`Customer` and `Reservation`).
- Replace sample branches, contact details, and schema URL with official milestone data.
