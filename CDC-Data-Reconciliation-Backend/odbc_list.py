import pyodbc

print("List of ODBC Drivers:")
dlist = pyodbc.drivers()
for drvr in dlist:
    print(drvr)
    