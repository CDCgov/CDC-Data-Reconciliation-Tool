import csv
import argparse
from datetime import datetime
import os

class CaseResult:
    def __init__(self, caseID, eventCode, eventName, MMWRYear, MMWRWeek, reason, reasonID, caseClassStatus) -> None:
        self.caseID = caseID
        self.eventCode = eventCode
        self.eventName = eventName
        self.MMWRYear = MMWRYear
        self.MMWRWeek = MMWRWeek
        self.reason = reason
        self.reasonID = reasonID
        self.caseClassStatus = caseClassStatus

# dictionary holding all stats for this report
stats = {}

results: list[CaseResult] = []

def parse_time(time_string):
    try:
        return datetime.strptime(time_string, "%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
        return datetime.strptime(time_string, "%Y-%m-%d %H:%M:%S")

def get_state_dict(state_file, eventCodes=None):
    state_dict = {}
    # Open the state CSV file
    with open(state_file, newline='', encoding='utf-8-sig') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # If the EventCode is not a number, skip the row (Getting rid of values like MAPPING and ZT_PP_Condition3)
            if row['EventCode'].isnumeric() == False:
                continue
            # Here we are filtering out the rows of the database by the event code that they have
            if eventCodes is not None and row['EventCode'] not in eventCodes:
                continue
            if row['CaseID'] in state_dict:
                # If the case ID already exists in the dictionary, check to see if the new row has a more recent add_time

                existing_date_string = state_dict[row['CaseID']]['add_time']
                existing_datetime = parse_time(existing_date_string)

                new_date_string = row['add_time']
                new_datetime = parse_time(new_date_string)

                if new_datetime > existing_datetime:
                    state_dict[row['CaseID']] = row

            else:
                # Add the row as a dictionary to the list
                state_dict[row['CaseID']] = row

    return state_dict

def get_cdc_dict(cdc_file, filterCDC = False):
    cdc_dict = {}
    # Open the cdc CSV file
    cdcEventCodes = set() if filterCDC else None
    with open(cdc_file, newline='', encoding='utf-8-sig') as csvfile:
        # Create a CSV reader object
        reader = csv.DictReader(csvfile)
        # Loop through each row in the CSV file
        for row in reader:
            # Add the row as a dictionary to the list
            if filterCDC:
                cdcEventCodes.add(row['EventCode'])
            if row['CaseID'] in cdc_dict:
                results.append(CaseResult(row['CaseID'], row['EventCode'],
                               row['EventName'], row['MMWRYear'], row['MMWRWeek'], "Duplicate CaseID found in CDC dataset", "1", row["CaseClassStatus"]))
                
                # adding duplicates to duplicate count if needed
                stats[row['EventCode']]['totalDuplicates'] += 1
                
            else:
                cdc_dict[row['CaseID']] = row
                if row['EventCode'] not in stats:
                    stats[row['EventCode']] = {'eventName': row['EventName'], 'totalCases': 0, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 0, 'totalWrongAttributes': 0}

    return cdc_dict, cdcEventCodes

# place the stats stuff here
def comp(state_dict, cdc_dict, compare_attributes=None):
    for state_case_id in state_dict:
        state_row = state_dict[state_case_id]
        
        # checking if a given event code already exists in the stats dictionary
        if state_row['EventCode'] in stats:
            stats[state_row['EventCode']]['totalCases'] += 1
        else:
            stats[state_row['EventCode']] = {'eventName': state_row['EventName'], 'totalCases': 1, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 0, 'totalWrongAttributes': 0}

        # If a case ID is in the state DB but not the CDC DB, mark it as a missing case
        if state_case_id not in cdc_dict:
            results.append(CaseResult(
                state_case_id, state_row['EventCode'], state_row['EventName'], state_row['MMWRYear'], state_row['MMWRWeek'], "CaseID not found in CDC dataset", "2", state_row["CaseClassStatus"]))
            
            # counting the missing case in totalMissingCDC for this eventCode
            stats[state_row['EventCode']]['totalMissingCDC'] += 1
            
        else:
            # Determine which attributes to compare: specified ones or all
            attributes_to_compare = compare_attributes if compare_attributes is not None else state_row.keys()
            att_list = []
            for attribute in attributes_to_compare:
                # Skip if the attribute is not in the CDC dict
                if attribute not in cdc_dict[state_case_id]:
                    continue

                state_attribute = state_row[attribute]
                cdc_attribute = cdc_dict[state_case_id][attribute]

                if state_attribute == "":
                    state_attribute = "NULL"

                if cdc_attribute == "":
                    cdc_attribute = "NULL"

                # If a case has different attributes between state and CDC DBs, mark it as such
                if state_attribute != cdc_attribute:
                    att_list.append(attribute)

            if (att_list != []):
                wrong_attribute_string = ", ".join(att_list)
                reason_string = f"Case differs on {wrong_attribute_string} between State and CDC datasets"
                
                results.append(CaseResult(state_case_id, state_row['EventCode'], state_row['EventName'], state_row[
                                   'MMWRYear'], state_row['MMWRWeek'], reason_string, "3", state_row["CaseClassStatus"]))
                # making sure to also count this discrepancy in the stats.csv file
                stats[state_row['EventCode']]['totalWrongAttributes'] += 1
                
            # Remove the case from the CDC dict so we can track what cases are missing from the state side
            del cdc_dict[state_case_id]

    # If there exists cases in the CDC dictionary still, mark it as a missing case on the state side
    for cdc_case_id in cdc_dict:
        cdc_row = cdc_dict[cdc_case_id]
        results.append(CaseResult(cdc_case_id, cdc_row['EventCode'], cdc_row['EventName'],
                       cdc_row['MMWRYear'], cdc_row['MMWRWeek'], "CaseID not found in State dataset", "4", cdc_row["CaseClassStatus"]))
        
        # adding in missing from state count, total case count, and caseID to the stats dict
        # only counting cases that are not duplicates, otherwise counting as duplicate
        if cdc_row['EventCode'] in stats:
            stats[cdc_row['EventCode']]['totalMissingState'] += 1
            stats[cdc_row['EventCode']]['totalCases'] += 1
        else:
            stats[cdc_row['EventCode']] = {'eventName': cdc_row['EventName'], 'totalCases': 1, 'totalDuplicates': 0, 'totalMissingCDC': 0, 'totalMissingState': 1, 'totalWrongAttributes': 0}

def main():
    parser = argparse.ArgumentParser(
        prog="CompareCDCAndState", description='Compare CDC and State CSV files')
    parser.add_argument('-s', '--state', help='Local Path to State CSV file')
    parser.add_argument('-c', '--cdc', help='Local Path to CDC CSV file')
    parser.add_argument('-o', '--output', help='Local Path to Output CSV file')
    # if the parameter below is specified the value stored is true
    parser.add_argument('-f', '--filter', action='store_true', help='Filter by CDC eventCodes')
    parser.add_argument('-a', '--attributes', nargs='*', help='Attributes to compare')
    args = parser.parse_args()

    cdc_dict, cdcEventCodes = get_cdc_dict(args.cdc, args.filter)
    state_dict = get_state_dict(args.state, cdcEventCodes)
    comp(state_dict, cdc_dict, args.attributes)

    # Create Results CSV File and write the results to it
    with open(args.output, 'w', newline='') as csvfile:
        fieldnames = ['CaseID', 'EventCode', 'EventName', 'MMWRYear',
                      'MMWRWeek', 'Reason', 'ReasonID', 'CaseClassStatus']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        for result in results:
            writer.writerow({'CaseID': result.caseID, 'EventCode': result.eventCode, 'EventName': result.eventName,'MMWRYear': result.MMWRYear,
                            'MMWRWeek': result.MMWRWeek, 'Reason': result.reason, 'ReasonID': result.reasonID, 'CaseClassStatus':result.caseClassStatus})
            
    # writing to stats.csv but first grabbing the folder location of results.csv
    output_directory = os.path.dirname(args.output)
    if output_directory == '':
        output_directory = '.'
    
    # writing stats data to the csv
    with open(os.path.join(output_directory, 'stats.csv'), 'w', newline='') as csvfile:
        fieldNames = ['EventCode', 'EventName', 'TotalCases', 'TotalDuplicates',
                      'TotalMissingFromCDC', 'TotalMissingFromState', 'TotalWrongAttributes']
        writer = csv.DictWriter(csvfile, fieldnames=fieldNames)
        
        writer.writeheader()
        for eventCode, data in stats.items():
            writer.writerow({'EventCode': eventCode, 'EventName': data['eventName'], 'TotalCases': data['totalCases'],
                             'TotalDuplicates': data['totalDuplicates'], 'TotalMissingFromCDC': data['totalMissingCDC'],
                             'TotalMissingFromState': data['totalMissingState'], 'TotalWrongAttributes': data['totalWrongAttributes']})

if __name__ == "__main__":
    main()
