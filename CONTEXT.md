CONTEXT.md — Brasaland
Milestone 1: Your Company's Public Website
Estas instrucciones están disponibles en español.

This document describes your company and the specific situation you're building this milestone for. Read it completely before writing any code. Everything you build must reflect this context.

- **Brasaland** — `CONTEXT-brasaland-briefing.md` (grilled food restaurant chain, Colombia + Florida)
- **TrackFlow** — `CONTEXT-trackflow-briefing.md` (last-mile delivery and warehouse, Mexico + Spain)
- **Nexova** — `CONTEXT-nexova-briefing.md` (HR consulting and talent acquisition, Chile + Argentina)
- **HealthCore** — `CONTEXT-healthcore-briefing.md` (outpatient healthcare clinic network, US + UK)

Your department and the problem you must solve
You work in Brasaland Digital, the internal team created by CEO Mariana Restrepo to lead the company's digital transformation, and you report directly to CTO Nicolás Park. Brasaland's current corporate website is from 2019, doesn't allow online orders, and only shows the menu. It doesn't reflect that the company operates in two countries or properly present the brand experience. Camila Ospina (Marketing Manager) needs a renewed website that professionally presents the brand, shows locations in both countries, and captures information from people interested in joining the digital loyalty program.

Your stakeholder
Camila Ospina, Marketing Manager

Hi,

We need to relaunch our corporate website. It should present Brasaland as what we are: a serious grilled food restaurant chain with presence in Colombia and the United States. I want a landing page that explains our value proposition, shows our locations in both countries, and presents our new digital loyalty program "Brasa Points." I also need a page with a form so people can register for the loyalty program. We currently use physical stamp cards that get lost and generate no data. I want to capture: name, email, phone, country, city, favorite location, dietary preferences, and how they found us. The site must be responsive, accessible, and SEO optimized. Multilingual support (Spanish and English) is optional but highly recommended; start with one base language. Use Tailwind and make sure the validations work perfectly.

Language scope
Multilingual support is optional but highly recommended given Brasaland's operations in Colombia and the United States.
You must choose one base language for the full website and form experience.
If you implement a second language, treat it as an enhancement (do not reduce quality/completeness in the base language).
Landing page content
Your landing page must include the following sections, in this order:

Header
Logo or name "Brasaland"
Language selector (ES | EN) if you implement a second language
Navigation: Home | Locations | Menu | Brasa Points | Contact
Hero
Headline: "The taste of the grill, in every bite"
Subheadline: "Since 2008 serving the best grilled meats in Colombia and the United States. 14 locations, one passion for quality and flavor."
Call to action: Button "Join Brasa Points" linking to the form
Our Story (paragraph + image)
Founded in Medellín in 2008, Brasaland began as a family dream: sharing the authentic taste of grilled meat with consistent quality and warm service. Today we are 14 restaurants in two countries, but we maintain the same recipe for success: fresh products, traditional techniques, and passion for every dish we serve.

What Makes Us Unique (3 columns)
Consistent Quality

Same recipes and standards in all locations
Fresh ingredients selected daily
Warm Experience

Friendly and attentive service
Family atmosphere on every visit
Speed

Your food ready in minutes
Without sacrificing flavor or quality
Our Locations (2 columns)
Colombia

10 restaurants in Medellín, Bogotá and Cali
Hours: Mon-Sun 11:00 AM - 10:00 PM
United States (Florida)

4 restaurants in Miami and Orlando
Hours: Mon-Sun 11:00 AM - 10:00 PM
Brasa Points (featured section)
Earn points with every visit
Accumulate 1 point for every $10,000 COP or $5 USD
Redeem your points for discounts and free dishes
Exclusive offers for members
100% digital registration - no more paper cards!
Contact
Email: hello@brasaland.com
Colombia: +57 4 123 4567
Florida: +1 305 123 4567
Footer
© 2025 Brasaland. All rights reserved.
Instagram | Facebook
Brasa Points registration form fields
Your form must capture the following information:

Field	Type	Validation	Required
Full name	text	Minimum 2 words	Yes
Email	email	Valid email format	Yes
Phone	tel	Format: +[country code] [number]	Yes
Country	select	Colombia / United States	Yes
City	select	Medellín / Bogotá / Cali / Miami / Orlando (per country)	Yes
Favorite Brasaland location	select	List of 14 restaurants per country and city	No
Dietary preferences	checkbox	No restrictions / Vegetarian / Gluten-free / Other	No
How did you find us?	select	Social media / Recommendation / Walked by / Internet search / Other	Yes
Date of birth	date	Must be 18 or older	Yes
I accept program terms	checkbox	Must be checked to submit	Yes
I want to receive offers via email	checkbox	Optional, unchecked by default	No
Specific validations
Full name: Must contain at least first and last name
Email: Must be valid format (contain @ and domain)
Phone: Must start with + followed by country code (+57 for Colombia, +1 for USA)
City: City options must change dynamically based on selected country
Favorite location: Options must filter based on selected country and city
Date of birth: User must be 18 or older (validate date)
Program terms: Checkbox must be checked to submit
Dependent field logic
Country → City:

If selecting "Colombia": show Medellín, Bogotá, Cali
If selecting "United States": show Miami, Orlando
Country + City → Favorite location:

Colombia - Medellín: Brasaland El Poblado, Brasaland Laureles, Brasaland Envigado, Brasaland Sabaneta
Colombia - Bogotá: Brasaland Usaquén, Brasaland Chapinero, Brasaland Zona Rosa
Colombia - Cali: Brasaland Granada, Brasaland Ciudad Jardín, Brasaland Unicentro
USA - Miami: Brasaland Brickell, Brasaland Coral Gables
USA - Orlando: Brasaland Downtown, Brasaland International Drive
Expected error messages
When a field doesn't meet validation, display these specific messages:

Full name: "Enter your full name (first and last name)"
Email: "Enter a valid email (example: name@email.com)"
Phone: "Phone must include country code (example: +57 300 123 4567 or +1 305 123 4567)"
Country: "Select your country"
City: "Select your city"
How did you find us: "Tell us how you found Brasaland"
Date of birth: "You must be 18 or older to register for Brasa Points"
Program terms: "You must accept the Brasa Points program terms to continue"
Success message
When the form validates correctly (simulate submission), display:

Welcome to Brasa Points!

Your registration was successful. You will receive a confirmation email in the next few minutes with your account details and how to start earning points.

You can now enjoy your benefits at any of our 14 locations!

Specific restriction
The Brasa Points program is designed for customers 18 or older who want to earn points with their visits. It is not a reservation or online ordering form. The site must include a visible message that says: "Want to place an order? Call your favorite location or visit us directly. Online ordering coming soon!"

Required Schema.org markup
Implement the following Schema.org markup on your landing page:

If you deliver only one language, set availableLanguage to just that base language.

{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Brasaland",
  "description": "Grilled food restaurant chain in Colombia and the United States",
  "url": "https://brasaland.com",
  "foundingDate": "2008",
  "servesCuisine": "Grilled food, Colombian cuisine",
  "priceRange": "$$",
  "address": [
    {
      "@type": "PostalAddress",
      "addressCountry": "CO",
      "addressLocality": "Medellín",
      "addressRegion": "Antioquia"
    },
    {
      "@type": "PostalAddress",
      "addressCountry": "US",
      "addressLocality": "Miami",
      "addressRegion": "FL"
    }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+57-4-123-4567",
    "contactType": "customer service",
    "availableLanguage": ["Spanish", "English"]
  },
  "sameAs": [
    "https://instagram.com/brasaland",
    "https://facebook.com/brasaland"
  ]
}
