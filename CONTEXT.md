# Trackflow Inc.

## Company Overview

Track Flow is your logistics partner for secure warehousing, smooth operations, and on-time last-mile delivery.

## Product & Service

Track Flow provides warehousing, inventory management, order fulfillment, and last-mile delivery solutions for businesses that need speed, organization, and reliability. We help companies store, process, and move products efficiently from warehouse to final destination. Our operations cover major cities, nearby regional markets, and strategic commercial routes, giving our clients the flexibility to scale their logistics with confidence.
## Branding:
- Color: Flow Blue – #2563EB. Very common promotes a sense of reliability.
- Motto: "Faster routes, smarter deliveries"
- Logo: ![TrackFlow Logo](workflows/TrackFlowLogo.png)

- PART 2:
# Milestone 2 — Building Scripts to Automate Tasks

## 🎯 The Challenge

📌 You are building on your own fork of the company's monorepo selected at the beginning of the course — not on a new repository.

You already have your company's public website running with forms and basic validations. Now your tech team needs you to build the first internal functionalities that will make the business operate more efficiently.

Your manager has assigned you to implement a set of data processing utilities that the team needs for day-to-day operations. This is not a complete interface yet — that will come later — but rather the foundational functions that will allow you to manage, filter, sort, and transform critical business information. Think of this as the logic layer that other systems will use down the line.

These utilities must be written in TypeScript, be reusable, properly typed, and able to run both in the browser and in development environments. The emphasis is on mastering structured data manipulation: collections, objects, searches, sorting, and transformations.

## 📋 What you're being asked to build

Your tech lead sends you the following brief via email:

From: Tech Lead
To: You
Subject: Core functionalities for data processing

Hi,

We need you to implement a set of TypeScript functions that allow us to efficiently handle the company's main data. The goal is to have solid, well-typed utilities that we can reuse in multiple contexts.

What we need:

1. **Collection management system:** Functions to filter, sort, search, and group elements within arrays. You must implement linear search for unsorted arrays and binary search for sorted arrays. Make sure to properly handle empty cases and elements not found.

2. **Data modeling with objects and interfaces:** Define the TypeScript interfaces that represent the main business entities. Each interface must have explicit types for all its properties and auxiliary methods to work with that data. Use literal objects to represent concrete instances.

3. **Transformations and aggregations:** Implement functions that take collections of objects and generate simple reports: count elements by category, sum numeric values, find maximums and minimums, calculate averages. Everything must be typed.

4. **Business validations:** Create functions that validate that data complies with your company's specific rules before being processed or stored. For example, verify that an element has all required fields, that numeric values are within allowed ranges, or that dates are coherent.

The code must be clean, with descriptive names, and each function must have a single responsibility. We want this to be maintainable in the long term.

Check your company's context document to know exactly what entities to model, what validations to apply, and what reports to generate.

Best regards,

Tech Lead

---

## 💡 What you should know before starting

This milestone focuses exclusively on programming logic and data manipulation with TypeScript. You are encouraged to solve this challenge without AI support or, if needed, with only minimal AI usage, so you can strengthen your logical and analytical thinking and problem-solving skills, which are fundamental for every programmer.

### Key concepts you'll apply:

- **Arrays and matrices:** How to store, traverse, sort, and search for elements in collections.
- **Linear search vs binary search:** When to use each one and how to implement them correctly.
- **Interfaces and literal objects:** How to model real-world data in TypeScript with explicit types.
- **Pure functions:** Writing functions that only work with what they receive as parameters, without depending on global variables.
- **Functional transformations:** Using `.map()`, `.filter()`, `.reduce()`, and other array methods to transform data without explicit loops.
- **Validations:** How to write functions that verify data complies with business rules before processing it.

### Expected file structure:

Your implementation should be organized in separate TypeScript files by responsibility:

src/
├── types/
│   └── models.ts            # Interfaces and types
├── utils/
│   ├── collections.ts       # Array functions
│   ├── search.ts            # Linear and binary searches
│   ├── transformations.ts   # Aggregations and reports
│   └── validations.ts       # Business validations
└── index.html               # Test page (optional)

You can include a simple HTML page with Tailwind CSS to manually test your functions if you wish, but the main focus is on the TypeScript logic. At minimum, your project must include a clear command to validate or execute the TypeScript code during development, such as:

npx tsc --noEmit
npm run typecheck
npx tsx src/demo.ts

---

4. Create a branch for this milestone:

git checkout -b milestone-2-programming-fundamentals

5. Organize your code in the proposed folder structure and start implementing the functions.

6. Make sure the project can be validated or executed with a clear TypeScript command during development. Example:

npx tsc --noEmit

7. Start implementing the functions.

---

# 💻 What You Need to Do

Implement the following functionalities in TypeScript. All entity names, fields, and rules must match exactly what is specified in your CONTEXT.md.

## Backend / Logic

☐ Define the TypeScript interfaces for all main entities of your company specified in your CONTEXT.md

☐ Implement filtering functions that allow searching for elements by one or more criteria (e.g., filter by category, price range, status)

☐ Implement sorting functions that sort arrays according to different criteria (ascending, descending, by multiple fields)

☐ Implement linear search to find elements in unsorted arrays

☐ Implement binary search to find elements in previously sorted arrays

☐ Create aggregation functions that generate reports: count elements by category, calculate totals, averages, maximums, and minimums

☐ Implement business validations that verify objects comply with the rules in your CONTEXT.md before being processed

☐ All functions must have explicit types in parameters and return values

☐ The code must follow the single responsibility principle: each function does one thing

☐ The project includes a clear command to validate or execute the TypeScript code during development

⚠ IMPORTANT: Field names, entity types, and validation rules in your implementation must match exactly what is specified in your CONTEXT.md. A generic implementation that ignores the context will not be accepted.

## Frontend / Testing (Optional)

☐ Create a simple HTML page with Tailwind CSS that allows you to manually test your functions

☐ Include buttons or controls to execute different operations (filter, search, sort, generate reports)

☐ Display operation results in the interface clearly

If you add an `index.html` page to test your functions manually, make sure you can serve it locally or in Codespaces with a simple command such as:

npx http-server -p 3000 -a 0.0.0.0

## Code Quality

☐ Use descriptive names for variables, functions, and interfaces (camelCase for variables and functions, PascalCase for interfaces)

☐ Each function must be pure: works only with what it receives as parameters, without modifying global variables

☐ Write comments only when necessary to explain complex logic, not to describe obvious code

☐ Handle empty cases correctly: empty arrays, elements not found, null values

☐ Use const by default and let only when the value will change

☐ Maintain consistent indentation and formatting throughout the code
What We Will Evaluate
*Technical Correctness*
  -TypeScript interfaces correctly model the entities specified in CONTEXT.md with all their fields and types 
  -Filtering functions correctly return elements that meet the specified criteria 
  - Sorting works correctly in ascending and descending order
  - Linear search finds elements in unsorted arrays without errors
  - Binary search works correctly on sorted arrays and returns the correct index or -1 if not found
  - Aggregations correctly calculate totals, averages, counts, and extreme values
  - Validations reject data that does not comply with the business rules in CONTEXT.md
  - There are no TypeScript compilation errors in any file There is a documented command to run TypeScript validation or execution locally ( , , etc.)
  - There is a documented command to run TypeScript validation or execution locally (npx tsc --noEmit, npm run typecheck, etc.) npx tsc --noEmit npm run ty
*Structure and Organization*
  - Code is organized in separate files by responsibility (types, utils, validations)
  - Each function has a single clearly identifiable responsibility
  - Variable, function, and interface names are descriptive and follow TypeScript conventions
*Context Adaptation*
    - All entity names, fields, and types match exactly those specified in CONTEXT.md
    - Implemented validations correspond to the business rules defined in CONTEXT.md
    - Generated reports respond to the specific needs described in CONTEXT.md
*Code Quality*
    - Functions are pure: they don't depend on external variables or modify global state
    - Edge cases are handled correctly: empty arrays, elements not found, null values
    - Code follows TypeScript best practices: explicit types, appropriate use of const/let, avoids any

