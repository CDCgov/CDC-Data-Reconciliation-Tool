# CDC Data Reconciliation Tool
Our tool compares data between the CDC database and databases from the 50 U.S. state health departments. The data from the states is regarded as “the source of truth”. If any data in the CDC database errs from the state databases in any way, it will be regarded as a discrepancy that may be remedied. 

# Setup Documentation

## Tutorial video demonstrating this documentation
<https://youtu.be/VMjU3pbrHXg>

## Technologies used
- Python - FastAPI
- JavaScript - ReactJS
- SQLite

## Prerequisite downloads
- Python version 3.10+ ([Download](https://www.python.org/downloads/))
  - Install PIP packages after downloading Python
    - Run inside terminal:
      - For Windows: `pip install uvicorn fastapi pyodbc python-multipart`
      - For Linux/MacOS: `pip3 install uvicorn fastapi pyodbc python-multipart`
- NodeJS version 20+ ([Download](https://nodejs.org/en/download))
- ODBC (Open Database Connectivity) Driver
  - You will need to have installed an ODBC driver that is specific to the database that your state uses for storing cases. For NBS, this would be Microsoft SQL Server ([Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16)). 
  - After installing the ODBC driver, restart your computer.

## Build and run frontend
1. Navigate to frontend folder - `cd CDC-Data-Reconciliation-Frontend`
2. Run `npm i` to install necessary npm packages such as ReactJS
3. Specify the backend server URL inside config.json  
    - config.json is located inside the “src” folder
    - The API_URL field should include the local IPv4 address of where the backend will be hosted as well as the port number that is used.
4. Run `npm run build` to build the frontend UI.

If you would like to work on the frontend UI while having automatic reloading when you change files, you can run `npm run dev` to start up a development server for the frontend.

## Run backend
1. Navigate to backend folder - `cd CDC-Data-Reconciliation-Backend`
2. Edit config.json
    - **driver**: this is where you will specify the ODBC driver you have installed. To see a list of all ODBC drivers installed on your system, you can run the following commands while in the backend folder.
      - For Windows: `python odbc_list.py`
      - For Linux/MacOS: `python3 odbc_list.py`
    - **server**: this field should be the URL to your state's SQL database.
    - **database**: this field specifies the name of the database for the backend server to use. For NBS, this should be “NBS_ODSE”.
    - **database_username**: this field should be set to the username of the login for the state SQL database. If you would like to use Windows Authentication or environment variables to connect to the database, make sure to leave this field blank.
    - **database_password**: this field should be set to the password of the login for the state SQL database. If you would like to use Windows Authentication or environment variables to connect to the database, make sure to leave this field blank.
    - **config_password**: this field specifies the password that users will have to enter in the UI in order to update settings for the application.
    - **port**: this field specifies the port number the server should use. Make sure this port is the same as the port used in the frontend API_URL.
    - If you are using backslashes in any of these fields, ensure that you use 2 backslashes. If you use one backslash, it will result in a JSON error. For instance, instead of setting `database\name` for the database field, you would set the database field to `database\\name`.
3. We have 3 options for the database login
    1. Option 1: Windows Authentication
        - To utilize Windows Authentication, simply leave the `database_username` and `database_password` fields empty in config.json and do not set any environment variables (skip step 4).
    2. Option 2: edit config.json
        - See step 2: **database_username**, **database_password** and skip step 4.
    3. Option 3: Set environment variables
        - Follow the steps under step 4.
4. Set environment variables for database login
    1. `DB_USERNAME`: this environment variable should be set to the username of the login for the state SQL database.
    2. `DB_PASSWORD`: this environment variable should be set to the password of the login for the state SQL database.
    3. The following instructions are for temporary setup:
    4. For Linux/MacOS:
        - In your terminal, type the following 2 commands to set the environment variables for the database login 
          - `export DB_USERNAME='your_database_username'`
          - `export DB_PASSWORD='your_database_password'`
    5. For Windows:
        - In the command prompt, type the following 2 commands to set the environment variables for the database login
          - `set DB_USERNAME=your_database_username`
          - `set DB_PASSWORD=your_database_password`
        - Alternatively, if you are using Powershell, the commands are:
          - `$Env:DB_USERNAME = "your_database_username"`
          - `$Env:DB_PASSWORD = "your_database_password"`
5. Ensure that the frontend is built; if not, follow the steps under **Build and run frontend**.
6. Finally, you can start the server.
    - For Windows: `python server.py`
    - For Linux/MacOS: `python3 server.py`

If you experience the application becoming slow and unresponsive after loading large amounts of discrepancies for reports or many users using the application at once, you might want to consider increasing the number of workers that uvicorn uses when running the backend server. This can be done by editing the last line of code in `server.py`. You can edit the parameter named “workers” and set the number of workers you would like. Note that you should not specify a number of workers that is larger than the amount of cores that your CPU has as this may cause issues. Alternatively, you can run uvicorn or gunicorn from the command line in order to specify the number of workers. Here is a link to the documentation going over backend deployment using uvicorn or gunicorn: <https://www.uvicorn.org/deployment/>. This link also specifies how to add SSL certification to the server so that data is encrypted in transmission while using the application.

## Query configuration
The query used to get the state case data from the state SQL database is specified in a file called query.sql located inside the CDC-Data-Reconciliation-Backend folder. The default query.sql file is for states that utilize NBS. 

If your state does not use NBS, you can write a SQL query that gets case data and returns the columns below. These columns except for `add_time` should have the same values as the CDC dataset for a specific CaseID. An example of some data that is returned by the default query.sql file is also shown below.

The query needs to have a “?” where we are able to pass in the year for which the query should be run for. In the query.sql file provided, the “?” appears at the very end of the file.

- add_time: The time at which the case was added to the state database (Not present within CDC dataset)
- CaseID
- CountyReporting
- EventCode
- EventName
- MMWRYear
- MMWRWeek
- CaseClassStatus
- Sex
- BirthDate
- Age
- AgeType
- Race
- Ethnicity

![Example query data](https://github.com/waffy1901/JID-3314-CDC-Data-Reconciliation/blob/main/Example_query_data.png)

## CLI comparison
For states or users that do not want to have to set up the frontend application, we have created a command line interface that can be run. This command line will take command line arguments for the local path of the CDC csv file you want to compare against the state database and is denoted by -c, as well as a local path to an output folder which will contain results.csv and stats.csv files after the comparison is made and is denoted by -o. Additionally, it takes in a year argument, denoted by -y to specify which year you will be querying. Moreover, it takes in a -a argument that allows you to filter comparisons by attributes. If the -a argument is not specified, it will compare all attributes. For instance, we can filter comparisons to only compare event codes and case class statuses. We can run our command-line interface via the following commands:

- For Windows: `python cli.py -c example-data/cdc.csv -o output -y 2023 -a EventCode CaseClassStatus`
- For Linux/MacOS: `python3 cli.py -c example-data/cdc.csv -o output -y 2023 -a EventCode CaseClassStatus`

# Release Notes
## Version 1.0.0 
### New Features
- Filter discrepancies between state and CDC data by specific attributes
- Reports can be renamed and deleted
- More descriptive errors when a report cannot be generated
- Error popup if required field(s) is empty
- CaseClassStatus has been added to the results.csv file and discrepancy table
- Detailed breakdown of mismatching attributes between the state and CDC data
### Bug Fixes
- The clear filters buttons on the statistics and discrepancies tables are no longer clamped up with the show/hide disease stats button
- Discrepancy table resizes appropriately when the window is resized
- The dynamic header on the discrepancy table properly updates anytime a clickable statistic is clicked
### Known Issues
- N/A

## Version 0.4.0 
### New Features
- Static and dynamic table headers
- Visually appealing settings page with color-coded error/success messages
- Command-line interface for comparing cdc and state health department data
- Database username and password environment variables for enhanced security
- Warning highlighted in red if the archive folder path is not set
- Error message displayed if unable to create a report
### Bug Fixes
- Debounced input and manual filters were updating the state to the same value, causing the onColumnFiltersChange to be run more than once - the disease statistics and report discrepancies tables are now filtering properly
- Timestamps on reports in the report history match one’s local timezone
### Known Issues
- If you click on one stat in the disease statistics table, the report discrepancies table header will update dynamically as intended - if you go to directly click on another stat, it will change the table title back to report discrepancies

## Version 0.3.0 
### New Features
- Download .csv report of disease-specific data from the statistics table
- Filter the report table to show stat-specific data upon the click of a stat in the statistics table
- Archive folder in the settings page to store old reports
- Filtering, sorting, and pagination for discrepancy and statistics tables
- Reports shown in the report history are capped at 5 at a time
- Option to compare diseases only in the CDC csv file
### Bug Fixes
- Can now create a report even when the archive folder path is not set
### Known Issues
- When both the discrepancy table and statistics table are open at the same time and you resize your window, the statistics table resizes appropriately but the discrepancy table does not resize appropriately

## Version 0.2.0 
### New Features
- View report history with timestamps
- View full reports with a summary of statistics at the top
- Ability to view statistics for specific diseases along with the capability of hiding disease-specific statistics to focus on statistics for an entire report
### Bug Fixes
- EventName is now properly set in our SQL query and is accessible in our statistics and results tables
- Reports in the report history now solely show the reports that you have generated
### Known Issues
- The timestamp of a report in the report history may not exactly match one’s timezone
- Reports differing in only the number of cases in the CDC.csv file does not produce the correct discrepancy list

## Version 0.1.0 
### New Features
- Pull data automatically from state database
- Toggle between manual uploading of state data and automatic pulling
- Download .csv report of the discrepancies between the state and CDC data
### Bug Fixes
- N/A
### Known Issues
- N/A
