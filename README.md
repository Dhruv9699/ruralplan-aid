# RuralPlan Assistant

Build a complete, responsive web application called "RuralPlan" for rural entrepreneurs in Maharashtra.

IMPORTANT PROJECT CONTEXT:

Main problem statement:

"There is no real-time data-driven support system to help rural entrepreneurs in Maharashtra make informed decisions on production, pricing, and distribution."

My specific sub-problem:

"Lack of Real-Time Production Planning."

Rural entrepreneurs lack access to real-time demand, weather, and resource information, making it difficult to plan production efficiently and avoid overproduction or shortages.

IMPORTANT:

This application ONLY focuses on the PRODUCTION PLANNING problem.

Do NOT build pricing recommendations, market-price prediction, buyer matching, transportation optimization, or distribution planning because those are separate modules being developed by other team members.

The application should help a rural entrepreneur answer:

1. What should I produce?

2. How much should I produce?

3. When should I produce it?

4. Do I have enough raw materials?

5. Is my current stock enough?

6. Is there a risk of overproduction or shortage?

7. What factors are affecting my production decision?

==================================================

TARGET USER

==================================================

The target user is a rural entrepreneur in Maharashtra who produces fruit-based food products such as pickles.

Do NOT restrict the application to mango pickle.

The entrepreneur must be able to add ANY fruit or food product they produce.

Examples:

- Mango Pickle

- Lemon Pickle

- Amla Pickle

- Chilli Pickle

- Mixed Fruit Pickle

- Custom Product

The user should be able to create a custom product and enter its production details.

==================================================

TECHNOLOGY

==================================================

Build this as a modern responsive web application.

Preferred stack:

- React

- TypeScript

- Tailwind CSS

- shadcn/ui components

- Recharts for graphs

- Supabase if database/auth is available in the project

- Otherwise use local storage/mock data so the application works without requiring paid services.

The application must work properly in the Lovable preview without requiring paid APIs.

Do not add unnecessary dependencies.

==================================================

MAIN PAGES

==================================================

Create these pages:

1. Landing Page

2. Login / Sign Up

3. Dashboard

4. Products

5. Production Planner

6. Demand & Sales History

7. Inventory / Raw Materials

8. Weather

9. Production History

10. Alerts

11. AI Production Assistant

12. Settings

==================================================

1. LANDING PAGE

==================================================

Create a simple professional landing page.

Title:

"RuralPlan"

Subtitle:

"Smart Production Planning for Rural Entrepreneurs"

Explain in simple language:

"RuralPlan helps rural entrepreneurs plan production using sales history, expected demand, inventory, raw materials, production capacity, and weather information."

Show three simple benefits:

- Plan the right quantity

- Avoid overproduction and shortages

- Make production decisions using data

Add a "Get Started" button.

==================================================

2. LOGIN / SIGN UP

==================================================

Create a simple authentication UI.

Fields:

- Name

- Email

- Password

- Village / Location

- District

- State

State should default to Maharashtra.

For the prototype, authentication can use Supabase if available. If not available, create a demo login flow that works locally.

==================================================

3. DASHBOARD

==================================================

The dashboard is the most important screen.

Create a clean dashboard showing:

A. Current Products

B. Current Stock

C. Expected Demand

D. Recommended Production

E. Raw Material Status

F. Weather

G. Production Alerts

Example:

Product:

"Mango Pickle"

Current Stock:

80 jars

Expected Demand:

150 jars

Recommended Production:

70 jars

Raw Material:

Available

Weather:

Rain expected tomorrow

Production Status:

"Production can proceed"

Create a large recommendation card:

"Recommended Production: 70 jars"

Under it show the reason:

"Expected demand is 150 jars and current stock is 80 jars. Available raw materials are sufficient."

==================================================

4. PRODUCT MANAGEMENT

==================================================

Create a Products page.

The user can:

- Add product

- Edit product

- Delete product

- View product details

When adding a product:

Fields:

- Product Name

- Raw Material / Fruit Name

- Unit (kg, litre, jar, packet, etc.)

- Production Capacity per Day

- Minimum Stock Level

- Current Stock

- Production Cost (optional; do not use this for pricing recommendations)

- Shelf Life

- Available Workers

- Raw Material Requirement per Unit

Allow completely custom products.

Example:

Product:

Lemon Pickle

Raw Material:

Lemon

Unit:

Jar

Daily Production Capacity:

100 jars

Minimum Stock:

30 jars

Current Stock:

50 jars

==================================================

5. PRODUCTION PLANNER

==================================================

This is the CORE FEATURE.

Create a production planning form.

Inputs:

- Select Product

- Current Stock

- Expected Demand

- Production Capacity

- Raw Material Availability

- Number of Workers

- Production Days Available

- Weather Condition

- Safety Stock Percentage

Calculate:

Required Production = Expected Demand - Current Stock + Safety Stock

Do not allow negative production quantities.

Also check production capacity and available resources.

Example:

Expected Demand = 150

Current Stock = 80

Safety Stock = 5

Required Production = 75

Show:

"Recommended Production: 75 units"

Then show a simple explanation:

"Demand is expected to be 150 units. You currently have 80 units in stock. The system recommends producing 75 additional units including safety stock."

If production capacity is insufficient, show:

"Warning: You need 75 units but your current production capacity is only 50 units/day."

Recommend the number of production days required.

==================================================

6. DEMAND & SALES HISTORY

==================================================

Create a page where the entrepreneur can enter previous sales.

Fields:

- Date

- Product

- Location

- Quantity Sold

Display the data in a table.

Create charts using Recharts.

Show:

- Daily sales

- Weekly sales

- Monthly sales

- Demand trend

Example:

January: 100

February: 120

March: 140

April: 165

May: 180

Show a simple demand trend.

For the MVP, use a simple forecasting method such as moving average or trend-based prediction.

Do NOT claim that this is advanced AI prediction.

Clearly label it:

"Estimated Demand"

and show:

"Based on previous sales data."

Allow the user to add more sales records.

==================================================

7. INVENTORY / RAW MATERIALS

==================================================

Create an inventory page.

Track raw materials such as:

- Mango

- Lemon

- Amla

- Oil

- Salt

- Spices

- Jars

- Packaging material

But allow the user to add any custom raw material.

For every material show:

- Current quantity

- Required quantity

- Minimum level

- Unit

- Status

Statuses:

GREEN:

Sufficient

YELLOW:

Low

RED:

Insufficient

Example:

Oil:

Current: 20 L

Required: 15 L

Status: Sufficient

Spices:

Current: 3 kg

Required: 5 kg

Status: Insufficient

Show an alert:

"Production may be affected because spices are insufficient."

==================================================

8. WEATHER

==================================================

Create a weather page.

The user can select:

- District

- Location

For the prototype, use mock weather data if no free weather API is configured.

Structure the code so a weather API can be connected later.

Show:

- Current temperature

- Rain probability

- Weather condition

- Next 3 days

- Simple production-related warning

Example:

"Heavy rainfall expected tomorrow."

"Consider completing production or storage preparations before the rainfall."

IMPORTANT:

Do not claim weather directly predicts product demand.

Weather should only be used as a supporting factor for production planning, storage, raw-material availability, and production scheduling.

==================================================

9. PRODUCTION HISTORY

==================================================

Create a production history page.

Track:

- Date

- Product

- Planned Quantity

- Actual Quantity Produced

- Quantity Sold

- Remaining Stock

Show charts comparing:

Planned Production vs Actual Production

and

Production vs Sales.

==================================================

10. ALERTS

==================================================

Create a dedicated alerts section.

Examples:

RED:

"Raw material insufficient for planned production."

YELLOW:

"Expected demand is higher than current stock."

YELLOW:

"Stock is approaching minimum level."

BLUE:

"Demand has increased compared with previous weeks."

WEATHER:

"Heavy rainfall expected tomorrow."

GREEN:

"Current resources are sufficient for planned production."

==================================================

11. AI PRODUCTION ASSISTANT

==================================================

Add an AI assistant called:

"RuralPlan Assistant"

This chatbot should help the entrepreneur understand production planning.

The chatbot should answer questions such as:

- "How much should I produce this week?"

- "I have 50 jars and expected demand is 120. What should I produce?"

- "I don't have enough raw material. What should I do?"

- "Why is my recommended production 100 units?"

- "What happens if demand increases by 20%?"

- "How can I avoid overproduction?"

- "How much raw material do I need?"

- "Should I produce today or tomorrow?"

- "Explain my production report."

- "Why am I getting a low-stock warning?"

IMPORTANT:

The AI assistant must use the user's actual application data when possible.

For example, if the dashboard contains:

Current stock = 80

Expected demand = 150

and the user asks:

"How much should I produce?"

The assistant should answer:

"Your expected demand is 150 units and your current stock is 80 units. Based on the current data, you need approximately 70 additional units, before considering safety stock and production constraints."

Do NOT invent real-time market data.

Do NOT pretend to know actual demand in Maharashtra unless the application has a data source for it.

If live data is unavailable, clearly say:

"This recommendation is based on the data entered in your RuralPlan account."

For the free prototype, create the chatbot UI and a rule/data-based assistant if an external AI API is not available.

Keep the AI assistant focused on production planning.

==================================================

12. RECOMMENDATION ENGINE

==================================================

Create a simple transparent recommendation engine.

Inputs:

- Historical sales

- Estimated demand

- Current stock

- Safety stock

- Raw material availability

- Production capacity

- Workers

- Weather

Output:

- Recommended production quantity

- Number of production days

- Resource warning

- Overproduction warning

- Shortage warning

Always explain WHY the recommendation was generated.

Example:

RECOMMENDATION

Produce:

120 jars

Why?

Expected demand:

150 jars

Current stock:

40 jars

Safety stock:

10 jars

Required:

120 jars

Raw materials:

Available

Production capacity:

100 jars/day

Estimated production time:

2 days

==================================================

13. OVERPRODUCTION AND SHORTAGE DETECTION

==================================================

Create logic to identify:

OVERPRODUCTION:

If current stock + planned production is significantly higher than estimated demand.

Show:

"Overproduction Risk"

SHORTAGE:

If current stock is lower than estimated demand and production capacity/resources cannot cover the shortage.

Show:

"Shortage Risk"

==================================================

14. USER INTERFACE

==================================================

Make the design:

- Simple

- Clean

- Professional

- Mobile-friendly

- Easy for a rural entrepreneur with limited technical knowledge

Use large buttons.

Use clear icons.

Avoid complicated technical language.

Use simple terms such as:

"Expected Demand"

instead of complicated forecasting terminology.

Use:

"Recommended Production"

instead of "Optimization Output."

Use charts and cards.

Create a sidebar navigation on desktop and bottom navigation on mobile.

==================================================

15. DEMO DATA

==================================================

The application must include realistic demo data so the website looks complete immediately after opening.

Create sample products:

- Mango Pickle

- Lemon Pickle

- Amla Pickle

Create sample sales history.

Create sample inventory.

Create sample weather.

Create sample production records.

The user must be able to delete or replace the demo data.

==================================================

16. DATA PRIVACY AND VALIDATION

==================================================

Validate all forms.

Do not allow:

- Negative quantities

- Invalid dates

- Empty product names

- Negative production capacity

Show friendly error messages.

==================================================

17. IMPORTANT SCOPE LIMITATION

==================================================

This application is specifically for:

"Real-Time Production Planning"

Do NOT add:

- Selling price recommendations

- Competitor price analysis

- Buyer matching

- Market selection

- Route optimization

- Transportation optimization

Those belong to separate project modules.

==================================================

18. FINAL DASHBOARD MESSAGE

==================================================

The dashboard should clearly communicate:

"RuralPlan helps rural entrepreneurs decide what, when, and how much to produce using their sales history, demand estimates, inventory, available resources, production capacity, and weather information."

Make the final application feel like a real working prototype rather than a static website.

All buttons, forms, calculations, charts, navigation, and demo data should work in the preview.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ruralplan-aid.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5da58f5b-55db-4f0c-957e-22e29e9b1cf0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
