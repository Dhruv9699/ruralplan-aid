# RuralPlan - Example Calculations

This document shows real examples of how RuralPlan calculates demand forecasts, production recommendations, and resource planning.

---

## EXAMPLE 1: Demand Forecasting with High Confidence

### Scenario
Rural entrepreneur in Nashik district making Mango Pickle.

### Historical Sales (Last 6 Months)
| Month | Sales | Notes |
|-------|-------|-------|
| Apr 2026 | 100 jars | First sale |
| May 2026 | 120 jars | Growing |
| Jun 2026 | 140 jars | Steady growth |
| Jul 2026 | 155 jars | Market demand rising |
| Aug 2026 | 165 jars | Strong sales |
| Sep 2026 | 180 jars | Best month yet |

### Calculation

**Step 1: Extract last 3 months**
```
Last 3: [155, 165, 180]
Average = (155 + 165 + 180) / 3 = 166.67
```

**Step 2: Analyze trend**
```
First month (Apr): 100
Last month (Sep): 180
Trend = ((180 - 100) / 100) × 100 = +80%
```

**Step 3: Calculate consistency**
```
Variance = ((155-166.67)² + (165-166.67)² + (180-166.67)²) / 3
         = (136.11 + 2.78 + 177.78) / 3
         = 105.56
Std Dev = √105.56 = 10.27
Coeff Variation = 10.27 / 166.67 = 0.062 (VERY consistent!)
```

**Step 4: Assign confidence**
```
History: 6 months ✓
Coefficient: 0.062 < 0.2 ✓
→ CONFIDENCE: HIGH
```

**Step 5: Apply trend adjustment**
```
Trend multiplier = 1 + (80 / 200) = 1.4
Estimate = 166.67 × 1.4 = 233.33 ≈ 233 jars
```

**Step 6: Create confidence range**
```
Margin = max(10, round(233 × 0.2))
       = max(10, 47)
       = 47 jars

Low range:  233 - 47 = 186 jars
High range: 233 + 47 = 280 jars
```

### Result
```
Estimated Demand: 233 jars
Range: 186–280 jars
Confidence: HIGH
Trend: Increasing (+80%)
Method: 3-month moving average with trend adjustment
Explanation: "Based on 6 months of consistent sales data 
             (180 units last month). Demand is increasing."
```

---

## EXAMPLE 2: Production Recommendation with Resource Constraints

### Scenario
Same entrepreneur as Example 1, planning production.

### Current Situation
```
Product: Mango Pickle
Current Stock: 80 jars
Expected Demand: 233 jars (from Example 1)
Daily Capacity: 100 jars/day
Raw Material (Mango): 60 kg available
Raw Material Ratio: 0.6 kg per jar
Workers: 4
Days Available: 7 days
Weather: Light rain expected
Safety Stock: 10%
```

### Calculation

**Step 1: Calculate safety stock**
```
Safety Stock = ceil(233 × 10 / 100) = 24 jars
```

**Step 2: Calculate required production**
```
Required = max(0, 233 - 80 + 24)
        = max(0, 177)
        = 177 jars
```

**Step 3: Apply weather slowdown**
```
Weather: Light rain = 15% slowdown
Effective Capacity = 100 × (1 - 0.15)
                   = 100 × 0.85
                   = 85 jars/day
```

**Step 4: Check capacity limit**
```
Capacity Limit = 85 jars/day × 7 days = 595 jars
Required (177) < Capacity (595) ✓
→ No capacity warning
```

**Step 5: Check raw material limit**
```
Raw Requirement = 177 × 0.6 = 106.2 kg
Available = 60 kg
Shortfall = 106.2 - 60 = 46.2 kg
→ WARNING: "Raw material insufficient!"
```

**Step 6: Calculate achievable production**
```
Raw Limit = floor(60 / 0.6) = 100 jars
Achievable = min(177, 595, 100)
           = 100 jars
```

**Step 7: Check for risks**
```
Stock after production = 80 + 100 = 180 jars
Demand = 233 jars
Shortage Risk = 180 < 233 ✓
→ WARNING: "Shortage risk - will fall short by 53 jars"
```

**Step 8: Calculate time needed**
```
Days needed = ceil(100 / 85) = 2 days
Start date: Today (Sept 4)
End date: Sept 5
```

### Result
```
Recommended Production: 100 jars
Achievable: 100 jars (limited by raw material)
Raw Material Needed: 60 kg (have exactly this)
Effective Capacity: 85 jars/day
Days Required: 2 days
Production Period: Sept 4-5

Warnings:
  🔴 Red: Raw material insufficient for planned production
     You need 106.2 kg mango but only have 60 kg
     
  🔴 Red: Shortage risk
     Even after production you may reach 180 jars 
     against demand of 233 jars

Status: PRODUCTION IS BLOCKED - Check red warnings

Reason: "Demand is expected to be 233 jars. You currently have 
80 jars in stock. With 10% safety stock (24 jars), the system 
recommends producing 177 additional jars. However, you only 
have 60 kg of mango available which limits production to 100 jars."

What to do:
1. Obtain 46+ kg more mango OR
2. Plan to produce 100 jars now and 77 jars later
3. Reduce expected demand estimate (if estimate was too high)
```

---

## EXAMPLE 3: Cross-Product Resource Conflict

### Scenario
Same entrepreneur now plans to produce 2 products simultaneously.

### Products & Plans
```
Product A: Mango Pickle
  - Planned: 100 jars
  - Raw Material: Mango
  - Ratio: 0.6 kg per jar
  - Required: 100 × 0.6 = 60 kg

Product B: Lemon Pickle
  - Planned: 80 jars
  - Raw Material: Lemon
  - Ratio: 0.4 kg per jar
  - Required: 80 × 0.4 = 32 kg

Product C: Amla Pickle
  - Planned: 50 jars
  - Raw Material: Amla
  - Ratio: 0.5 kg per jar
  - Required: 50 × 0.5 = 25 kg
```

### Current Inventory
```
Mango:  40 kg available (SHORTFALL: 20 kg)
Lemon: 35 kg available (OK)
Amla:  30 kg available (OK)
```

### Analysis

**Total Requirements:**
```
Material  | Required | Available | Shortfall | Affected Products
----------|----------|-----------|-----------|-------------------
Mango     | 60 kg    | 40 kg     | 20 kg     | Mango Pickle
Lemon     | 32 kg    | 35 kg     | OK        | Lemon Pickle
Amla      | 25 kg    | 30 kg     | OK        | Amla Pickle
```

### Warnings Generated
```
🔴 CROSS-PRODUCT RESOURCE ALERT

Material: Mango
  Required: 60 kg (for Mango Pickle)
  Available: 40 kg
  Shortfall: 20 kg
  Suggestion: "You need 60 kg mango for planned production of 
  Mango Pickle but only have 40 kg. You may need to reduce 
  Mango Pickle production by approximately 33 jars or obtain 
  additional 20 kg of mango."
```

### User Options
1. **Option A:** Obtain 20 kg more mango → produce all as planned
2. **Option B:** Reduce Mango Pickle to 67 jars (uses 40 kg) → proceed with all products
3. **Option C:** Delay Lemon & Amla pickle, focus on Mango Pickle
4. **Option D:** Wait for more mango to arrive, then produce all

---

## EXAMPLE 4: Production Scheduling with Priorities

### Scenario
Entrepreneur has 3 products with different demand situations.

### Demand Analysis
```
Product A: Mango Pickle
  - Current Stock: 80 jars
  - Expected Demand: 200 jars
  - Stock vs Demand: BELOW (80 < 200)
  - Priority: HIGH ⚠️
  - Action: Produce TODAY

Product B: Lemon Pickle
  - Current Stock: 30 jars
  - Minimum Level: 30 jars
  - Stock vs Minimum: AT MINIMUM (30 = 30)
  - Demand Trend: Stable
  - Priority: MEDIUM 📌
  - Action: Produce TOMORROW

Product C: Amla Pickle
  - Current Stock: 80 jars
  - Expected Demand: 60 jars
  - Stock vs Demand: ABOVE (80 > 60)
  - Demand Trend: Stable
  - Priority: LOW ℹ️
  - Action: Produce in 3 DAYS
```

### Schedule Calculation
```
Product A: Mango Pickle
  - Recommended Quantity: 120 jars
  - Days Needed: ceil(120 / 100) = 2 days
  - Start: Sept 4 (TODAY)
  - End: Sept 5
  - Priority: HIGH
  - Reason: Stock (80) is below expected demand (200).
           Produce soon to avoid shortage.

Product B: Lemon Pickle
  - Recommended Quantity: 50 jars
  - Days Needed: ceil(50 / 60) = 1 day
  - Start: Sept 5 (TOMORROW)
  - End: Sept 5
  - Priority: MEDIUM
  - Reason: Stock is at minimum level (30). Replenish soon.

Product C: Amla Pickle
  - Recommended Quantity: 0 jars (stock sufficient)
  - Start: Sept 7 (3 DAYS from now)
  - Priority: LOW
  - Reason: Stock is adequate. Can schedule at convenience.
```

### Production Schedule
```
Sep 4-5:  ⚠️  MANGO PICKLE - 120 jars (HIGH PRIORITY)
Sep 5:    📌  LEMON PICKLE - 50 jars (MEDIUM PRIORITY)
Sep 7+:   ℹ️  AMLA PICKLE - When ready (LOW PRIORITY)
```

---

## EXAMPLE 5: Low Confidence Forecast

### Scenario
New product with limited sales history.

### Historical Sales
```
Aug 2026: 45 jars (first month, product new)
Sep 2026: 52 jars (second month)
```

### Calculation
```
History Length: 2 months (insufficient for high confidence)
Average: (45 + 52) / 2 = 48.5 jars
Trend: ((52 - 45) / 45) × 100 = +15.6%

Variance: ((45-48.5)² + (52-48.5)²) / 2 = 12.25
Std Dev: √12.25 = 3.5
Coeff Variation: 3.5 / 48.5 = 0.072

Confidence: LOW (only 2 months data)
Estimate: 48.5 × (1 + 15.6/200) = 52.4 ≈ 52 jars
Range: 42–62 jars
```

### Result
```
Estimated Demand: 52 jars
Range: 42–62 jars
Confidence: LOW ⚠️
Trend: Increasing (+15.6%)
Method: Average of available months
Explanation: "Only 2 months of data available. Estimate has 
low confidence. Add more sales data for better predictions."

Alert on Alerts page:
🟡 Low forecast confidence for New Product
   Add more sales records to improve forecast accuracy.

Recommendation:
- Track sales for at least 6 months
- Then confidence will improve
- Until then, use with caution
```

---

## EXAMPLE 6: Weather Impact on Production

### Scenario
Same product, different weather scenarios.

### Base Situation
```
Required Production: 100 jars
Daily Capacity: 100 jars/day
Days Available: 3 days
Base Calculation: ceil(100 / 100) = 1 day
```

### Scenario A: Clear Weather
```
Weather: Clear (0% slowdown)
Effective Capacity: 100 × (1 - 0) = 100 jars/day
Days Needed: ceil(100 / 100) = 1 day
Production Window: Sept 4
Status: ✅ Can produce easily
```

### Scenario B: High Humidity
```
Weather: High Humidity (10% slowdown)
Effective Capacity: 100 × (1 - 0.10) = 90 jars/day
Days Needed: ceil(100 / 90) = 2 days
Production Window: Sept 4-5
Note: "Humidity is high. Sun-drying may take longer, 
       so plan an extra production day."
Status: ⚠️ Needs extra day due to weather
```

### Scenario C: Light Rain
```
Weather: Light Rain (15% slowdown)
Effective Capacity: 100 × (1 - 0.15) = 85 jars/day
Days Needed: ceil(100 / 85) = 2 days
Production Window: Sept 4-5
Note: "Light rain expected. Consider completing 
       production before rainfall."
Status: 📌 Manageable but slower
```

### Scenario D: Heavy Rain
```
Weather: Heavy Rain (30% slowdown)
Effective Capacity: 100 × (1 - 0.30) = 70 jars/day
Days Needed: ceil(100 / 70) = 2 days
Production Window: Sept 4-5 (or delay until after rain)
Note: "Heavy rainfall expected. Keep raw material 
       and finished stock covered and dry."
Status: 🔴 Significant slowdown, reconsider timing
```

### Comparison
```
Weather        | Capacity | Days Needed | Timeline
---------------|----------|-------------|----------
Clear          | 100/day  | 1 day       | Sept 4
High Humidity  | 90/day   | 2 days      | Sept 4-5
Light Rain     | 85/day   | 2 days      | Sept 4-5
Heavy Rain     | 70/day   | 2 days      | Sept 4-5 (risky)
```

---

## Summary of Calculations

### What Gets Calculated
✅ Demand forecast with confidence  
✅ Production requirement accounting for safety stock  
✅ Weather-adjusted production capacity  
✅ Raw material requirements  
✅ Production duration  
✅ Resource conflicts across products  
✅ Risk assessment (shortage, overproduction)  
✅ Production scheduling with priorities  

### What Does NOT Get Calculated
❌ Exact demand (predicted from history, not predicted perfectly)  
❌ Optimal batch sizes  
❌ Cost optimization  
❌ Profit maximization  
❌ Market price  
❌ Competitor analysis  

### Key Principles
1. **Transparent:** All calculations shown and explained
2. **Conservative:** Uses lower estimates for safety
3. **Flexible:** Recommends, doesn't mandate
4. **Practical:** Suitable for manual planning
5. **Honest:** Shows confidence and limitations

---

**All examples use realistic numbers from a rural production context.**
