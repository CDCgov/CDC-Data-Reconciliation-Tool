import subprocess
import uvicorn
from fastapi import FastAPI, File, Form, Response, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import asyncio
import csv
import os
import sys
import uuid
import pyodbc
import json
import sqlite3
import shutil
import mimetypes

# Fix mimetypes for .js and .css files
mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(CORSMiddleware, allow_origins=origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Serve the static files from the React app only if the assets folder exists
if os.path.exists(os.path.join(os.path.dirname(__file__), "..", "CDC-Data-Reconciliation-Frontend", "dist", "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "CDC-Data-Reconciliation-Frontend", "dist", "assets")), name="assets")

# Load config.json
app.dir = os.path.dirname(__file__)

config_file_path = os.path.join(app.dir, "config.json")
with open(config_file_path, "r") as f:
    app.config = json.load(f)
    db_username = app.config.get("database_username") or os.getenv('DB_USERNAME')
    db_password = app.config.get("database_password") or os.getenv('DB_PASSWORD')

# Connect to the SQL Server
connection_string_base = 'DRIVER={' + app.config["driver"] + \
    '}' + \
    f';SERVER={app.config["server"]};DATABASE={app.config["database"]};'

if db_username and db_password:
    connection_string_auth = f'UID={db_username};PWD={db_password};'
else:
    connection_string_auth = 'Trusted_Connection=yes;'

connection_string = connection_string_base + connection_string_auth
app.conn = pyodbc.connect(connection_string)

# SQLite reports and cases tables setup
database_file_path = os.path.join(app.dir, "database.db")
app.liteConn = sqlite3.connect(database_file_path)
cur = app.liteConn.cursor()

# Reports table
cur.execute('''
    CREATE TABLE IF NOT EXISTS Reports(
        ID INTEGER PRIMARY KEY NOT NULL, 
        CreatedAtDate TEXT,
        TimeOfCreation TEXT, 
        NumberOfDiscrepancies INTEGER,
        Name TEXT    
)''')

# Cases table
cur.execute('''
    CREATE TABLE IF NOT EXISTS Cases(
        ID INTEGER PRIMARY KEY NOT NULL,
        ReportID INTEGER NOT NULL,
        CaseID TEXT, 
        EventCode TEXT,
        EventName TEXT,
        MMWRYear INTEGER, 
        MMWRWeek INTEGER,
        Reason TEXT, 
        ReasonID INTEGER,
        CaseClassStatus TEXT,
        FOREIGN KEY (ReportID) REFERENCES Reports(ID)
)''')

# Statistics table
cur.execute('''
    CREATE TABLE IF NOT EXISTS Statistics(
        ID INTEGER PRIMARY KEY NOT NULL,
        ReportID INTEGER NOT NULL,
        EventCode TEXT NOT NULL,
        EventName TEXT,
        TotalCases INTEGER,
        TotalDuplicates INTEGER,
        TotalMissingFromCDC INTEGER,
        TotalMissingFromState INTEGER,
        TotalWrongAttributes INTEGER,
        FOREIGN KEY (ReportID) REFERENCES Reports(ID)
)''')

# Statistics table
cur.execute('''
    CREATE TABLE IF NOT EXISTS Config(
        ID INTEGER PRIMARY KEY NOT NULL,
        FieldName TEXT NOT NULL,
        FieldValue TEXT NOT NULL
)''')

app.liteConn.commit()

@app.post("/manual_report")
async def manual_report(isCDCFilter: bool, reportName: str, state_file: UploadFile = File(None), 
                        cdc_file:  UploadFile = File(None), attributes: str = Form("[]")):
    folder_name = "temp"
    if not os.path.exists(os.path.join(app.dir, "temp")):
        os.makedirs(os.path.join(app.dir, "temp"))

    try:
        id = str(uuid.uuid4())
        os.makedirs(os.path.join(app.dir, folder_name, id), mode=0o777)
        
        # Fetching the archive_path for saving the Report
        archive_path = await get_config_setting("archive_path")

        cdc_content = await cdc_file.read()
        cdc_save_to = os.path.join(app.dir, folder_name, id, "cdc.csv")
        with open(cdc_save_to, "wb") as f:
            f.write(cdc_content)

        state_content = await state_file.read()
        state_save_to = os.path.join(app.dir, folder_name, id, "state.csv")
        with open(state_save_to, "wb") as f:
            f.write(state_content)

        res_file = os.path.join(app.dir, folder_name, id, "results.csv")
        
        # Creating argument list for running compare.py
        subprocess_args = [sys.executable,
                        os.path.join(app.dir, "compare.py"),
                        '-c', cdc_save_to,
                        '-s', state_save_to,
                        '-o', res_file]
        
        if isCDCFilter:
            subprocess_args.append('-f')
        
        attributes_list = json.loads(attributes)
        subprocess_args.extend(['-a', *attributes_list])
        
        try:
            process = await asyncio.create_subprocess_exec(*subprocess_args,
                                                            stderr=subprocess.PIPE)
            _, stderr = await process.communicate()  # Wait for subprocess to finish and get stderr
            if process.returncode != 0:  # Non-zero return code indicates an error
                error_message = stderr.decode().strip()  # Decode error message from bytes to string
                raise RuntimeError(f"Subprocess failed with error: {error_message}")
        except Exception as e:
            print(f"Error running comparison: {e}")
            raise HTTPException(status_code=500, detail="Error running comparison")

        res = []
        with open(res_file, newline='') as csvfile:
            # Create a CSV reader object
            reader = csv.DictReader(csvfile)
            # Loop through each row in the CSV file
            for row in reader:
                # Add the row as a dictionary to the list
                res.append(tuple(row.values()))

        numDiscrepancies = len(res)
        reportId = insert_report(numDiscrepancies, reportName)

        stats_file = os.path.join(app.dir, folder_name, id, "stats.csv")
        stats_list = []

        with open(stats_file, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                tup = (reportId,) + tuple(row.values())
                stats_list.append(tup)

        if archive_path:
            # Making a folder for the specific reportId
            archive_save_to = os.path.join(archive_path, str(reportId))
            os.makedirs(archive_save_to, exist_ok=True)

            # writing the newly created results file to the archive folder too
            shutil.copy2(res_file, archive_save_to)
            shutil.copy2(stats_file, archive_save_to)

        # Add reportId to each row
        new_res = [(reportId,) + row for row in res]

        insert_cases(new_res)
        insert_statistics(stats_list)

        # remove temp files / folder
        shutil.rmtree(os.path.join(app.dir, folder_name, id))

        return Response(status_code=200)
    except Exception as e:
        # remove temp files / folder
        shutil.rmtree(os.path.join(app.dir, folder_name, id))
        raise e

@app.post("/automatic_report")
async def automatic_report(year: int, isCDCFilter: bool, reportName: str,
                           cdc_file:  UploadFile = File(None), attributes: str = Form("[]")):
    # Run query to retrieve data from NBS ODSE database
    (column_names, state_content) = run_query(year)
    if not len(state_content) > 0:
        raise HTTPException(status_code=400, detail="Query resulted in no data")

    # Create temp file structure
    folder_name = "temp"
    if not os.path.exists(os.path.join(app.dir, folder_name)):
        os.makedirs(os.path.join(app.dir, folder_name))
    try:
        # Fetching the archive_path for saving the Report
        archive_path = await get_config_setting("archive_path")
        
        id = str(uuid.uuid4())
        os.makedirs(os.path.join(app.dir, folder_name, id), mode=0o777)

        # Write queried state data to csv
        state_save_to = os.path.join(app.dir, folder_name, id, "state.csv")
        with open(state_save_to, "w", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(column_names)
            writer.writerows(state_content)

        # Write user-uploaded CDC data to local csv
        cdc_content = await cdc_file.read()
        cdc_save_to = os.path.join(app.dir, folder_name, id, "cdc.csv")
        with open(cdc_save_to, "wb") as f:
            f.write(cdc_content)

        # Do comparison
        res_file = os.path.join(app.dir, folder_name, id, "results.csv")
        # Creating argument list for running compare.py
        subprocess_args = [sys.executable,
                        os.path.join(app.dir, "compare.py"),
                        '-c', cdc_save_to,
                        '-s', state_save_to,
                        '-o', res_file]
        
        if isCDCFilter:
            subprocess_args.append('-f')
        
        attributes_list = json.loads(attributes)
        subprocess_args.extend(['-a', *attributes_list])
        
        try:
            process = await asyncio.create_subprocess_exec(*subprocess_args,
                                                            stderr=subprocess.PIPE)
            _, stderr = await process.communicate()  # Wait for subprocess to finish and get stderr
            if process.returncode != 0:  # Non-zero return code indicates an error
                error_message = stderr.decode().strip()  # Decode error message from bytes to string
                raise RuntimeError(f"Subprocess failed with error: {error_message}")
        except Exception as e:
            print(f"Error running comparison: {e}")
            raise HTTPException(status_code=500, detail="Error running comparison")
        
        # Add results to the response
        res = []
        with open(res_file, newline='') as csvfile:
            # Create a CSV reader object
            reader = csv.DictReader(csvfile)
            # Loop through each row in the CSV file
            for row in reader:
                # Add the row as a dictionary to the list
                res.append(tuple(row.values()))

        numDiscrepancies = len(res)
        reportId = insert_report(numDiscrepancies, reportName)

        stats_file = os.path.join(app.dir, folder_name, id, "stats.csv")
        stats_list = []

        with open(stats_file, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                tup = (reportId,) + tuple(row.values())
                stats_list.append(tup)
        
        if archive_path:
            # Making a folder for the specific reportId
            archive_save_to = os.path.join(archive_path, str(reportId))
            os.makedirs(archive_save_to, exist_ok=True)

            # writing the newly created results file to the archive folder too
            shutil.copy2(res_file, archive_save_to)
            shutil.copy2(stats_file, archive_save_to)

        # Add reportId to each row
        new_res = [(reportId,) + row for row in res]

        insert_cases(new_res)
        insert_statistics(stats_list)
        
        # remove temp files / folder
        shutil.rmtree(os.path.join(app.dir, folder_name, id))

        return Response(status_code=200)
    except Exception as e:
        # remove temp files / folder
        shutil.rmtree(os.path.join(app.dir, folder_name, id))
        raise e

@app.get("/reports")
async def get_report_summaries():
    # Fetch all reports from the SQLite database, ordered by date and time (newest reports at the top)
    try:
        cur = app.liteConn.cursor()
        cur.execute(
            "SELECT * FROM Reports ORDER BY CreatedAtDate DESC, TimeOfCreation DESC;")

        return [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None

@app.get("/reports/{report_id}")
async def get_report_cases(report_id: int):
    """
    Endpoint to fetch cases for a report by its ID.
    """
    report = fetch_reports_from_db(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@app.get("/report_statistics/{report_id}")
async def get_report_statistics(report_id: int):
    try:
        cur = app.liteConn.cursor()
        cur.execute(
            "SELECT * FROM Statistics WHERE ReportID = ?", (report_id,))
        results = cur.fetchall()
        if not results:
            raise HTTPException(status_code = 404, detail = "Report Not Found")
        return [dict(zip([column[0] for column in cur.description], row)) for row in results]
    
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code = 500, detail = "Internal Server Error")
    
@app.post("/reports")
async def rename_report(report_id: int, new_name: str):
    try:
        cur = app.liteConn.cursor()
        cur.execute("UPDATE Reports SET Name = ? WHERE ID = ?", (f"Report {report_id}" if new_name == "" else new_name, report_id))
        app.liteConn.commit()
        return Response(status_code=200)
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        app.liteConn.rollback()
        return HTTPException(status_code = 500, detail = "Internal Server Error")

@app.delete("/reports/{report_id}")
async def delete_report(report_id: int):
    """
    Deletes a report from all 3 tables.
    """
    try:
        cur = app.liteConn.cursor()
        cur.execute("DELETE FROM Reports WHERE ID = ?", (report_id,))
        cur.execute("DELETE FROM Cases WHERE ReportID = ?", (report_id,))
        cur.execute("DELETE FROM Statistics WHERE ReportID = ?", (report_id,))
        app.liteConn.commit()
        return Response(status_code=200)
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        app.liteConn.rollback()
        return HTTPException(status_code = 500, detail = "Internal Server Error")

def fetch_reports_from_db(report_id: int):
    """
    Function to fetch a report from the SQLite database.
    """
    try:
        cur = app.liteConn.cursor()
        cur.execute("SELECT * FROM Cases WHERE ReportID = ?", (report_id,))
        return [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None

def insert_report(noOfDiscrepancies, name = ""):
    try:
        cur = app.liteConn.cursor()
        cur.execute("INSERT INTO Reports (CreatedAtDate, TimeOfCreation, NumberOfDiscrepancies, Name)  VALUES (DATE('now'), TIME('now'), ?, ?)", (noOfDiscrepancies, name))
        report_id = cur.lastrowid
        # Set default name if none provided
        if name == "":
            cur.execute("UPDATE Reports SET Name = ? WHERE ID = ?", (f"Report {report_id}", report_id))
        app.liteConn.commit()
        return report_id
    except Exception as e:
        app.liteConn.rollback()
        raise e  

def insert_statistics(stats):
    try:
        cur = app.liteConn.cursor()
        cur.executemany("INSERT INTO Statistics (ReportID, EventCode, EventName, TotalCases, TotalDuplicates, TotalMissingFromCDC, TotalMissingFromState, TotalWrongAttributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", stats)
        app.liteConn.commit()
    except Exception as e:
        app.liteConn.rollback()
        raise e

def insert_cases(res):
    try:
        cur = app.liteConn.cursor()
        cur.executemany("INSERT INTO Cases (ReportID, CaseID, EventCode, EventName, MMWRYear, MMWRWeek, Reason, ReasonID, CaseClassStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", res)
        app.liteConn.commit()
    except Exception as e:
        app.liteConn.rollback()
        raise e

def run_query(year: int):
    query = None
    query_file_path = os.path.join(app.dir, "query.sql")
    with open(query_file_path, 'r') as f:
        query = f.read()

    cursor = app.conn.cursor()
    cursor.execute(query, year)
    # Return the queried data as a list of dicts
    column_names = [col[0] for col in cursor.description]
    data = cursor.fetchall()

    return (column_names, data)

@app.get("/config/{field_name}")
async def get_config_setting(field_name: str):
    try:
        cur = app.liteConn.cursor()
        cur.execute("SELECT * FROM Config WHERE FieldName = ?", (field_name,))
        value = cur.fetchall()
        if len(value) > 0:
            # value is [(idx, field_name, field_value)] so need to return value[0][2]
            return value[0][2]
        else: return None
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None
    
@app.post("/config")
async def set_config_setting(field_name: str, value: str, password: str):
    # Do not allow changing config settings if password is wrong
    if password != app.config["config_password"]:
        raise HTTPException(status_code = 401, detail = "Unauthorized: password incorrect") 
    
    current_setting = await get_config_setting(field_name)
    # print(f"Setting config setting {field_name} to {value}. Previous value: {current_setting}")
    try:
        cur = app.liteConn.cursor()
        # If the setting already exists, update it
        if current_setting is not None:
            cur.execute("UPDATE Config SET FieldValue = ? WHERE FieldName = ?", (value, field_name))
        else:
            # Otherwise, create the entry
            cur.execute("INSERT INTO Config (FieldName, FieldValue) VALUES (?, ?)", (field_name, value))
        app.liteConn.commit()
    except Exception as e:
        app.liteConn.rollback()
        raise e
    
# Route to serve React index.html (for client-side routing)
@app.get("/{catchall:path}")
async def serve_react_app(catchall: str):
    # Return the index.html file from the React app only if the file exists
    if os.path.exists(os.path.join(os.path.dirname(__file__), "..", "CDC-Data-Reconciliation-Frontend", "dist", "index.html")):
        return FileResponse(os.path.join(os.path.dirname(__file__), "..", "CDC-Data-Reconciliation-Frontend", "dist", "index.html"))
    else:
        raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    # Run the API with uvicorn
    # If application is slow, try increasing the number of workers
    uvicorn.run("server:app", host="0.0.0.0", port=app.config["port"], workers=1)

    # Use this command to run the API with reloading enabled (DOES NOT WORK ON WINDOWS)
    # uvicorn.run("server:app", host="localhost", port=app.config["port"], reload=True)
