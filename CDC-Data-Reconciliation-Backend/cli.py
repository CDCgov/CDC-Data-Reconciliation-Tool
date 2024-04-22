import argparse
import os
import pyodbc
import json
import uuid
import csv
import compare

config = None
conn = None

# Load config.json
configDir = os.path.dirname(__file__)

config_file_path = os.path.join(configDir, "config.json")
with open(config_file_path, "r") as f:
    config = json.load(f)
    db_username = config.get("database_username") or os.getenv('DB_USERNAME')
    db_password = config.get("database_password") or os.getenv('DB_PASSWORD')

def get_state_csv(year: int):
    query = None
    query_file_path = os.path.join(configDir, "query.sql")
    with open(query_file_path, 'r') as f:
        query = f.read()

    cursor = conn.cursor()
    cursor.execute(query, year)

    # Return the queried data as a list of dicts
    column_names = [col[0] for col in cursor.description]
    state_content = cursor.fetchall()

    id = str(uuid.uuid4())
    state_save_to = os.path.join(configDir, f"{id}.csv")
    with open(state_save_to, "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow(column_names)
        writer.writerows(state_content)

    return state_save_to
    
def main():
    global conn

    parser = argparse.ArgumentParser(
        prog="AutoCompare", description='Auto Comparison')
    parser.add_argument('-c', '--cdc', required=True, help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', required=True, help='Name of folder that should be created to store the report files')
    parser.add_argument('-y', '--year', required=True, help='Year to compare')
    # defaulting to filtering by CDC event codes
    parser.add_argument('-nf', '--nofilter', default=False, action="store_true", help='Do not filter by CDC eventCodes')
    parser.add_argument('-a', '--attributes', nargs='*', help='Attributes to compare')
    args = parser.parse_args()

    if (args.cdc is None or args.output is None or args.year is None):
        print("Please provide the CDC CSV file, the output folder name, and the year to compare")
        return

    # Connect to the SQL Server
    connection_string_base = 'DRIVER={' + config["driver"] + \
        '}' + \
        f';SERVER={config["server"]};DATABASE={config["database"]};'

    if db_username and db_password:
        connection_string_auth = f'UID={db_username};PWD={db_password};'
    else:
        connection_string_auth = 'Trusted_Connection=yes;'

    connection_string = connection_string_base + connection_string_auth
    conn = pyodbc.connect(connection_string)

    # Get the state CSV
    state_csv = get_state_csv(args.year)

    filterByCDC = not args.nofilter
    
    cdc_dict, cdcEventCodes = compare.get_cdc_dict(args.cdc, filterByCDC)
    state_dict = compare.get_state_dict(state_csv, cdcEventCodes)
    
    compare.comp(state_dict, cdc_dict, args.attributes)

    os.remove(state_csv)

    # Create output folder
    output_folder = os.path.join(configDir, args.output)
    os.makedirs(output_folder)

    # Create Results CSV File and write the results to it
    with open(os.path.join(output_folder, "results.csv"), 'w', newline='') as csvfile:
        fieldnames = ['CaseID', 'EventCode', 'EventName', 'MMWRYear',
                      'MMWRWeek', 'Reason', 'ReasonID']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in compare.results:
            writer.writerow({'CaseID': result.caseID, 'EventCode': result.eventCode, 'EventName': result.eventName,'MMWRYear': result.MMWRYear,
                            'MMWRWeek': result.MMWRWeek, 'Reason': result.reason, 'ReasonID': result.reasonID})
            
    # writing stats data to the csv
    with open(os.path.join(output_folder, 'stats.csv'), 'w', newline='') as csvfile:
        fieldNames = ['EventCode', 'EventName', 'TotalCases', 'TotalDuplicates',
                      'TotalMissingFromCDC', 'TotalMissingFromState', 'TotalWrongAttributes']
        writer = csv.DictWriter(csvfile, fieldnames=fieldNames)
        
        writer.writeheader()
        for eventCode, data in compare.stats.items():
            writer.writerow({'EventCode': eventCode, 'EventName': data['eventName'], 'TotalCases': data['totalCases'],
                             'TotalDuplicates': data['totalDuplicates'], 'TotalMissingFromCDC': data['totalMissingCDC'],
                             'TotalMissingFromState': data['totalMissingState'], 'TotalWrongAttributes': data['totalWrongAttributes']})

if __name__ == "__main__": 
    main()
    