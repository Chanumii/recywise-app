# RecyWise - Platform for ELV Recycling Optimisation

* Student Name: Pathirage Dona Chanumi Dewanga
* Student ID: 20210741 / W1953980

RecyWise is a full-stack web application that uses an XGBoost LambdaRank machine learning model to generate optimised dismantling pathways for end-of-life vehicles. The system integrates live commodity prices from Yahoo Finance, vehicle specifications from the NHTSA vPIC API, and AI-driven material estimation via Google Gemini to produce ranked, profit-ordered recycling pathways for recycling facility operators.

# Prerequisites
Before running the project, ensure the following are installed on your machine.

Required Software:
* Python
* Node.js
* npm

# How to use the application
Once both servers are running:
1. Open and run the aplication in your browser
2. Login/Signup
3. Click New Vehicle in the sidebar to begin processing a vehicle
4. Enter the 17-character VIN on Screen 2, or proceed to manual entry 
5. Complete the condition assessment by setting the relevant flags for the vehicle's state
6. Choose AI Auto-Estimate or manual entry for material composition 
7. Click Generate Optimized Pathway to produce the ranked dismantling plan
8. Review the results on Results Screen, including profit estimates, step explanations, and the job timeline
9. Use the Dashboard to view daily KPI summaries
10. Use Vehicle History to search and retrieve previously processed vehicles
11. Use the Settings gear icon in the navbar to configure the facility-specific hourly labour rate and per-action time durations

# Additional Notes
* RecyWise is fully functional without the Gemini API key. Only the AI Auto-Estimate button on Screen 6 will use the fallback heuristic instead of the Gemini model.
* Internet connectivity is required for live commodity prices and NHTSA vehicle data. 
The application functions without internet access using its built-in fallback values, but the accuracy of profit estimates will be reduced.



